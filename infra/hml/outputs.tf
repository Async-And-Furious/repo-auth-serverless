output "api_endpoint" { value = aws_apigatewayv2_api.http.api_endpoint }
output "auth_function_name" { value = aws_lambda_function.auth.function_name }
