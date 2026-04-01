resource "aws_lb" "main" {
  name               = "${local.project}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = merge(local.tags, { Name = "${local.project}-alb" })
}

# ── Target Groups ──

resource "aws_lb_target_group" "backend" {
  name        = "${local.project}-backend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/docs"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = local.tags
}

resource "aws_lb_target_group" "keycloak" {
  name        = "${local.project}-keycloak"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-399"
  }

  tags = local.tags
}

# ── Listener ──

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }

  tags = local.tags
}

# ── Listener Rules ──

resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = local.tags
}

resource "aws_lb_listener_rule" "keycloak_realms" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 200

  condition {
    path_pattern {
      values = ["/realms/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  tags = local.tags
}

resource "aws_lb_listener_rule" "keycloak_resources" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 201

  condition {
    path_pattern {
      values = ["/resources/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  tags = local.tags
}

resource "aws_lb_listener_rule" "keycloak_js" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 202

  condition {
    path_pattern {
      values = ["/js/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  tags = local.tags
}

resource "aws_lb_listener_rule" "keycloak_admin" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 203

  condition {
    path_pattern {
      values = ["/admin/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  tags = local.tags
}
