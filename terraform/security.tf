# ── ALB Security Group ──

resource "aws_security_group" "alb" {
  name_prefix = "${local.project}-alb-"
  description = "ALB - allow HTTP inbound"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.project}-alb-sg" })

  lifecycle {
    create_before_destroy = true
  }
}

# ── Backend ECS Security Group ──

resource "aws_security_group" "backend" {
  name_prefix = "${local.project}-backend-"
  description = "Backend ECS - allow traffic from ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.project}-backend-sg" })

  lifecycle {
    create_before_destroy = true
  }
}

# ── Keycloak ECS Security Group ──

resource "aws_security_group" "keycloak" {
  name_prefix = "${local.project}-keycloak-"
  description = "Keycloak ECS - allow traffic from ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.project}-keycloak-sg" })

  lifecycle {
    create_before_destroy = true
  }
}

# ── RDS Security Group ──

resource "aws_security_group" "rds" {
  name_prefix = "${local.project}-rds-"
  description = "RDS Postgres - allow traffic from Keycloak only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from Keycloak"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.keycloak.id]
  }

  tags = merge(local.tags, { Name = "${local.project}-rds-sg" })

  lifecycle {
    create_before_destroy = true
  }
}
