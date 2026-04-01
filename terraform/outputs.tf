output "cloudfront_url" {
  description = "Main app URL (CloudFront)"
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}"
}

output "alb_url" {
  description = "ALB URL (direct backend/keycloak access)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_keycloak_url" {
  description = "ECR repository URL for keycloak image"
  value       = aws_ecr_repository.keycloak.repository_url
}

output "keycloak_admin_url" {
  description = "Keycloak admin console"
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}/admin/"
}

output "swagger_url" {
  description = "Backend Swagger API docs"
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}/api/docs"
}

output "spa_bucket" {
  description = "S3 bucket name for frontend deployment"
  value       = aws_s3_bucket.spa.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.spa.id
}
