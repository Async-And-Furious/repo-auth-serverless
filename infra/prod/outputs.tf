output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}
output "api_id" {
  value = aws_apigatewayv2_api.http.id
}
output "auth_route_key" {
  value = aws_apigatewayv2_route.auth.route_key
}
output "authorizer_id" {
  value = aws_apigatewayv2_authorizer.lambda.id
}
output "protected_route_key" {
  value = local.backend_enabled ? aws_apigatewayv2_route.protected[0].route_key : null
}
output "backend_integration_uri" {
  value = local.backend_enabled ? var.backend_integration_uri : null
}
output "backend_integration_id" {
  value = local.backend_enabled ? aws_apigatewayv2_integration.backend[0].id : null
}
output "vpc_link_id" {
  value = local.backend_enabled ? aws_apigatewayv2_vpc_link.backend[0].id : null
}
output "jwt_algorithm" { value = "RS256" }
output "jwt_issuer" { value = var.jwt_issuer }
output "jwt_audience" { value = var.jwt_audience }
output "jwt_expires_in" { value = var.jwt_expires_in }
output "jwt_subject_claim" { value = "Cliente.id" }
