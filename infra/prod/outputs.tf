output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}
output "jwt_algorithm" { value = "RS256" }
output "jwt_issuer" { value = var.jwt_issuer }
output "jwt_audience" { value = var.jwt_audience }
