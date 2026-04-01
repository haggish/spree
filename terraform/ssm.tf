resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "random_password" "keycloak_admin" {
  length  = 16
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${local.project}/db-password"
  type  = "SecureString"
  value = random_password.db_password.result
  tags  = local.tags
}

resource "aws_ssm_parameter" "google_maps_api_key" {
  name  = "/${local.project}/google-maps-api-key"
  type  = "SecureString"
  value = var.google_maps_api_key
  tags  = local.tags
}

resource "aws_ssm_parameter" "keycloak_admin_password" {
  name  = "/${local.project}/keycloak-admin-password"
  type  = "SecureString"
  value = random_password.keycloak_admin.result
  tags  = local.tags
}
