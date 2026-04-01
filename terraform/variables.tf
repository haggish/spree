variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "google_maps_api_key" {
  description = "Google Maps API key (for Routes API, Maps JS, Places)"
  type        = string
  sensitive   = true
}

# ── Fargate sizing ──

variable "backend_cpu" {
  description = "Backend Fargate CPU units"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Backend Fargate memory (MB)"
  type        = number
  default     = 512
}

variable "keycloak_cpu" {
  description = "Keycloak Fargate CPU units"
  type        = number
  default     = 512
}

variable "keycloak_memory" {
  description = "Keycloak Fargate memory (MB)"
  type        = number
  default     = 1024
}

# ── RDS ──

variable "db_instance_class" {
  description = "RDS instance class for Keycloak Postgres"
  type        = string
  default     = "db.t4g.micro"
}
