data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

locals {
  lambda_package_path        = var.lambda_package_path != "" ? var.lambda_package_path : "${path.module}/../../dist.zip"
  auth_lambda_role_arn       = var.auth_lambda_role_arn != "" ? var.auth_lambda_role_arn : aws_iam_role.auth[0].arn
  authorizer_lambda_role_arn = var.authorizer_lambda_role_arn != "" ? var.authorizer_lambda_role_arn : aws_iam_role.authorizer[0].arn
}

resource "aws_iam_role" "auth" {
  count              = var.auth_lambda_role_arn == "" ? 1 : 0
  name               = "${var.name_prefix}-auth"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}
resource "aws_iam_role" "authorizer" {
  count              = var.authorizer_lambda_role_arn == "" ? 1 : 0
  name               = "${var.name_prefix}-authorizer"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}
resource "aws_iam_role_policy_attachment" "auth_logs" {
  count      = var.auth_lambda_role_arn == "" ? 1 : 0
  role       = aws_iam_role.auth[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy_attachment" "authorizer_logs" {
  count      = var.authorizer_lambda_role_arn == "" ? 1 : 0
  role       = aws_iam_role.authorizer[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "runtime" {
  count = var.auth_lambda_role_arn == "" ? 1 : 0
  role  = aws_iam_role.auth[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = [var.jwt_private_key_secret_arn, var.database_secret_arn] },
    { Effect = "Allow", Action = ["ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces", "ec2:DeleteNetworkInterface"], Resource = "*" }
  ] })
}
resource "aws_iam_role_policy" "authorizer_ssm" {
  count  = var.authorizer_lambda_role_arn == "" ? 1 : 0
  role   = aws_iam_role.authorizer[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["ssm:GetParameter"], Resource = var.jwt_public_key_parameter_arn }] })
}
resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${var.name_prefix}-auth"
  retention_in_days = 30
}
resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${var.name_prefix}-authorizer"
  retention_in_days = 30
}
resource "aws_lambda_function" "auth" {
  function_name    = "${var.name_prefix}-auth"
  role             = local.auth_lambda_role_arn
  filename         = local.lambda_package_path
  source_code_hash = fileexists(local.lambda_package_path) ? filebase64sha256(local.lambda_package_path) : null
  handler          = "authenticate-customer/handler.handler"
  runtime          = "nodejs22.x"
  timeout          = 10
  vpc_config {
    subnet_ids         = var.database_subnet_ids
    security_group_ids = var.database_security_group_ids
  }
  environment { variables = { JWT_PRIVATE_KEY_SECRET_ARN = var.jwt_private_key_secret_arn, DATABASE_SECRET_ARN = var.database_secret_arn } }
}
resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.name_prefix}-authorizer"
  role             = local.authorizer_lambda_role_arn
  filename         = local.lambda_package_path
  source_code_hash = fileexists(local.lambda_package_path) ? filebase64sha256(local.lambda_package_path) : null
  handler          = "authorize-request/handler.handler"
  runtime          = "nodejs22.x"
  environment { variables = { JWT_PUBLIC_KEY_PARAM_NAME = var.jwt_public_key_parameter_name } }
}
resource "aws_apigatewayv2_api" "http" {
  name          = var.name_prefix
  protocol_type = "HTTP"
}
resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth.invoke_arn
  payload_format_version = "2.0"
}
resource "aws_apigatewayv2_authorizer" "lambda" {
  api_id                            = aws_apigatewayv2_api.http.id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer.invoke_arn
  identity_sources                  = ["$request.header.Authorization"]
  name                              = "${var.name_prefix}-authorizer"
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
}
resource "aws_apigatewayv2_route" "auth" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /auth"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}
resource "aws_apigatewayv2_vpc_link" "backend" {
  count              = var.backend_integration_uri != "" ? 1 : 0
  name               = "${var.name_prefix}-backend"
  subnet_ids         = var.vpc_link_subnet_ids
  security_group_ids = var.vpc_link_security_group_ids
}
resource "aws_apigatewayv2_integration" "backend" {
  count                  = var.backend_integration_uri != "" ? 1 : 0
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "HTTP_PROXY"
  integration_uri        = var.backend_integration_uri
  integration_method     = "ANY"
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.backend[0].id
  payload_format_version = "1.0"
}
resource "aws_apigatewayv2_route" "protected" {
  count              = var.backend_integration_uri != "" ? 1 : 0
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "ANY /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.backend[0].id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.lambda.id
}
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}
resource "aws_lambda_permission" "api_auth" {
  statement_id  = "AllowApiGatewayAuth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
resource "aws_lambda_permission" "api_authorizer" {
  statement_id  = "AllowApiGatewayAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
