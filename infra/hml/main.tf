data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_caller_identity" "current" {}

data "terraform_remote_state" "k8s_infra" {
  backend = "s3"
  config = {
    bucket = "tc3-tfstate-${data.aws_caller_identity.current.account_id}"
    key    = "repo-k8s-infra/hml/terraform.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "db_infra" {
  backend = "s3"
  config = {
    bucket = "tc3-tfstate-${data.aws_caller_identity.current.account_id}"
    key    = "repo-db-infra/hml/terraform.tfstate"
    region = var.aws_region
  }
}

locals {
  lambda_package_path         = var.lambda_package_path != "" ? var.lambda_package_path : "${path.module}/../../dist.zip"
  create_auth_lambda_role     = !var.academy_mode && trimspace(var.auth_lambda_role_arn) == ""
  create_authorizer_role      = !var.academy_mode && trimspace(var.authorizer_lambda_role_arn) == ""
  auth_lambda_role_arn        = var.academy_mode ? trimspace(var.lab_role_arn) : trimspace(var.auth_lambda_role_arn) != "" ? trimspace(var.auth_lambda_role_arn) : aws_iam_role.auth[0].arn
  authorizer_lambda_role_arn  = var.academy_mode ? trimspace(var.lab_role_arn) : trimspace(var.authorizer_lambda_role_arn) != "" ? trimspace(var.authorizer_lambda_role_arn) : aws_iam_role.authorizer[0].arn
  backend_enabled             = !var.deploy_auth_only && trimspace(var.backend_integration_uri) != ""
  database_subnet_ids         = data.terraform_remote_state.k8s_infra.outputs.private_subnet_ids
  database_security_group_ids = [data.terraform_remote_state.db_infra.outputs.db_security_group_id]
}

resource "aws_iam_role" "auth" {
  count              = local.create_auth_lambda_role ? 1 : 0
  name               = "${var.name_prefix}-auth"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}
resource "aws_iam_role" "authorizer" {
  count              = local.create_authorizer_role ? 1 : 0
  name               = "${var.name_prefix}-authorizer"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}
resource "aws_iam_role_policy_attachment" "auth_logs" {
  count      = local.create_auth_lambda_role ? 1 : 0
  role       = aws_iam_role.auth[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy_attachment" "authorizer_logs" {
  count      = local.create_authorizer_role ? 1 : 0
  role       = aws_iam_role.authorizer[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "runtime" {
  count = local.create_auth_lambda_role ? 1 : 0
  role  = aws_iam_role.auth[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = [var.jwt_private_key_secret_arn, var.database_secret_arn] },
    { Effect = "Allow", Action = ["ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces", "ec2:DeleteNetworkInterface"], Resource = "*" }
  ] })
}
resource "aws_iam_role_policy" "authorizer_ssm" {
  count  = local.create_authorizer_role ? 1 : 0
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
  handler          = "dist/authenticate-customer/handler.handler"
  runtime          = "nodejs22.x"
  timeout          = 10
  dynamic "vpc_config" {
    for_each = var.auth_lambda_vpc_enabled ? [1] : []
    content {
      subnet_ids         = local.database_subnet_ids
      security_group_ids = local.database_security_group_ids
    }
  }
  environment { variables = { JWT_PRIVATE_KEY_SECRET_ARN = var.jwt_private_key_secret_arn, DATABASE_SECRET_ARN = var.database_secret_arn, JWT_ALGORITHM = "RS256", JWT_ISSUER = var.jwt_issuer, JWT_AUDIENCE = var.jwt_audience, JWT_EXPIRES_IN = tostring(var.jwt_expires_in) } }
}
resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.name_prefix}-authorizer"
  role             = local.authorizer_lambda_role_arn
  filename         = local.lambda_package_path
  source_code_hash = fileexists(local.lambda_package_path) ? filebase64sha256(local.lambda_package_path) : null
  handler          = "dist/authorize-request/handler.handler"
  runtime          = "nodejs22.x"
  environment { variables = { JWT_PUBLIC_KEY_PARAM_NAME = var.jwt_public_key_parameter_name, JWT_ALGORITHM = "RS256", JWT_ISSUER = var.jwt_issuer, JWT_AUDIENCE = var.jwt_audience, JWT_EXPIRES_IN = tostring(var.jwt_expires_in) } }
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
  authorizer_uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.authorizer.arn}/invocations"
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
  count              = local.backend_enabled ? 1 : 0
  name               = "${var.name_prefix}-backend"
  subnet_ids         = var.vpc_link_subnet_ids
  security_group_ids = var.vpc_link_security_group_ids
  lifecycle {
    precondition {
      condition     = length(var.vpc_link_subnet_ids) > 0 && alltrue([for id in var.vpc_link_subnet_ids : trimspace(id) != ""]) && length(var.vpc_link_security_group_ids) > 0 && alltrue([for id in var.vpc_link_security_group_ids : trimspace(id) != ""])
      error_message = "VPC Link subnet and security-group IDs must be non-empty when backend integration is enabled."
    }
  }
}
resource "aws_apigatewayv2_integration" "backend" {
  count                  = local.backend_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "HTTP_PROXY"
  integration_uri        = var.backend_integration_uri
  integration_method     = "ANY"
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.backend[0].id
  payload_format_version = "1.0"
  request_parameters     = { "overwrite:header.x-correlation-id" = "$context.authorizer.correlation_id" }
}
resource "aws_apigatewayv2_route" "protected" {
  count              = local.backend_enabled ? 1 : 0
  depends_on         = [aws_lambda_permission.api_authorizer]
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

resource "aws_cloudwatch_metric_alarm" "auth_errors" {
  alarm_name          = "${var.name_prefix}-auth-errors"
  alarm_description   = "Authentication Lambda errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = []
  dimensions          = { FunctionName = aws_lambda_function.auth.function_name }
}

resource "aws_cloudwatch_metric_alarm" "authorizer_errors" {
  alarm_name          = "${var.name_prefix}-authorizer-errors"
  alarm_description   = "Authorizer Lambda errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = []
  dimensions          = { FunctionName = aws_lambda_function.authorizer.function_name }
}

resource "aws_cloudwatch_metric_alarm" "api_auth_5xx" {
  alarm_name          = "${var.name_prefix}-api-auth-5xx"
  alarm_description   = "HTTP API authentication route server errors"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5XXError"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = []
  dimensions          = { ApiId = aws_apigatewayv2_api.http.id, Stage = aws_apigatewayv2_stage.default.name, Route = "POST /auth" }
}

resource "aws_cloudwatch_metric_alarm" "api_protected_5xx" {
  count               = local.backend_enabled ? 1 : 0
  alarm_name          = "${var.name_prefix}-api-protected-5xx"
  alarm_description   = "HTTP API protected route server errors"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5XXError"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = []
  dimensions          = { ApiId = aws_apigatewayv2_api.http.id, Stage = aws_apigatewayv2_stage.default.name, Route = "ANY /{proxy+}" }
}
