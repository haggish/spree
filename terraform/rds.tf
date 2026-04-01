resource "aws_db_subnet_group" "main" {
  name       = "${local.project}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = merge(local.tags, { Name = "${local.project}-db-subnets" })
}

resource "aws_db_instance" "keycloak" {
  identifier = "${local.project}-keycloak-db"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = "keycloak"
  username = "keycloak"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false
  multi_az            = false
  skip_final_snapshot = true

  tags = merge(local.tags, { Name = "${local.project}-keycloak-db" })
}
