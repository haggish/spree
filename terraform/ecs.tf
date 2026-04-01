resource "aws_ecs_cluster" "main" {
  name = "${local.project}-cluster"
  tags = local.tags
}

# ── CloudWatch Log Groups ──

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.project}-backend"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "keycloak" {
  name              = "/ecs/${local.project}-keycloak"
  retention_in_days = 14
  tags              = local.tags
}

# ── IAM: ECS Task Execution Role (pull images, read SSM, write logs) ──

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.project}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name = "${local.project}-ssm-read"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ]
      Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${local.project}/*"
    }]
  })
}

# ── IAM: ECS Task Role (app runtime — minimal) ──

resource "aws_iam_role" "ecs_task" {
  name = "${local.project}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.tags
}

# ── Backend Task Definition ──

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.project}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "PORT", value = "3000" },
      { name = "KEYCLOAK_URL", value = "http://${aws_lb.main.dns_name}" },
      { name = "KEYCLOAK_REALM", value = "spree" },
    ]

    secrets = [{
      name      = "GOOGLE_MAPS_API_KEY"
      valueFrom = aws_ssm_parameter.google_maps_api_key.arn
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }
  }])

  tags = local.tags
}

# ── Keycloak Task Definition ──

resource "aws_ecs_task_definition" "keycloak" {
  family                   = "${local.project}-keycloak"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.keycloak_cpu
  memory                   = var.keycloak_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "keycloak"
    image = "${aws_ecr_repository.keycloak.repository_url}:latest"

    command = ["start-dev", "--import-realm"]

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      { name = "KC_DB", value = "postgres" },
      { name = "KC_DB_URL_HOST", value = aws_db_instance.keycloak.address },
      { name = "KC_DB_URL_DATABASE", value = "keycloak" },
      { name = "KC_DB_USERNAME", value = "keycloak" },
      { name = "KC_HOSTNAME", value = aws_cloudfront_distribution.spa.domain_name },
      { name = "KC_HTTP_PORT", value = "8080" },
      { name = "KC_PROXY_HEADERS", value = "xforwarded" },
      { name = "KC_HEALTH_ENABLED", value = "true" },
      { name = "KEYCLOAK_ADMIN", value = "admin" },
    ]

    secrets = [
      {
        name      = "KC_DB_PASSWORD"
        valueFrom = aws_ssm_parameter.db_password.arn
      },
      {
        name      = "KEYCLOAK_ADMIN_PASSWORD"
        valueFrom = aws_ssm_parameter.keycloak_admin_password.arn
      },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.keycloak.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "keycloak"
      }
    }
  }])

  tags = local.tags
}

# ── ECS Services ──

resource "aws_ecs_service" "backend" {
  name            = "${local.project}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = local.tags
}

resource "aws_ecs_service" "keycloak" {
  name            = "${local.project}-keycloak"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.keycloak.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.keycloak.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.keycloak.arn
    container_name   = "keycloak"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http, aws_db_instance.keycloak]

  tags = local.tags
}
