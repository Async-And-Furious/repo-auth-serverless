variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "name_prefix" {
  type    = string
  default = "tc3-auth-prod"
}
variable "jwt_private_key_secret_arn" { type = string }
variable "jwt_public_key_parameter_name" { type = string }
variable "jwt_public_key_parameter_arn" { type = string }
variable "database_secret_arn" { type = string }
variable "academy_mode" {
  description = "Academy mode is not supported in production."
  type        = bool
  default     = false
  validation {
    condition     = !var.academy_mode
    error_message = "academy_mode must be false in production."
  }
}
variable "lab_role_arn" {
  description = "Existing Lambda execution role ARN, required in academy_mode."
  type        = string
  default     = ""
  validation {
    condition     = !var.academy_mode || can(regex("^arn:[^:]+:iam::[0-9]{12}:role/.+$", trimspace(var.lab_role_arn)))
    error_message = "lab_role_arn must be an IAM role ARN when academy_mode is true."
  }
}
variable "jwt_issuer" {
  type    = string
  default = "repo-auth-serverless"
  validation {
    condition     = var.jwt_issuer == "repo-auth-serverless"
    error_message = "jwt_issuer must be repo-auth-serverless."
  }
}
variable "jwt_audience" {
  type    = string
  default = "async-furious-project"
  validation {
    condition     = var.jwt_audience == "async-furious-project"
    error_message = "jwt_audience must be async-furious-project."
  }
}
variable "jwt_expires_in" {
  type    = number
  default = 1800
  validation {
    condition     = var.jwt_expires_in == 1800
    error_message = "jwt_expires_in must be 1800 seconds."
  }
}
variable "auth_lambda_role_arn" {
  type    = string
  default = ""
}
variable "authorizer_lambda_role_arn" {
  type    = string
  default = ""
}
variable "lambda_package_path" {
  type    = string
  default = ""
}
variable "auth_lambda_vpc_enabled" {
  type    = bool
  default = true
}
variable "database_security_group_ids" {
  type    = list(string)
  default = []
  validation {
    condition     = !var.auth_lambda_vpc_enabled || (length(var.database_security_group_ids) > 0 && alltrue([for id in var.database_security_group_ids : trimspace(id) != ""]))
    error_message = "database_security_group_ids must contain non-empty values when auth_lambda_vpc_enabled is true."
  }
}
variable "database_subnet_ids" {
  type    = list(string)
  default = []
  validation {
    condition     = !var.auth_lambda_vpc_enabled || (length(var.database_subnet_ids) > 0 && alltrue([for id in var.database_subnet_ids : trimspace(id) != ""]))
    error_message = "database_subnet_ids must contain non-empty values when auth_lambda_vpc_enabled is true."
  }
}
variable "backend_integration_uri" {
  type    = string
  default = ""
  validation {
    condition     = (var.deploy_auth_only && trimspace(var.backend_integration_uri) == "") || can(regex("^arn:[^:]+:elasticloadbalancing:[^:]+:[0-9]{12}:listener/(app|net)/[^/]+/[0-9a-f]+/[0-9a-f]+$", trimspace(var.backend_integration_uri)))
    error_message = "backend_integration_uri must be an ALB/NLB listener ARN when set; it may be empty only when deploy_auth_only is true."
  }
}
variable "deploy_auth_only" {
  type    = bool
  default = true
}
variable "vpc_link_subnet_ids" {
  type    = list(string)
  default = []
}
variable "vpc_link_security_group_ids" {
  type    = list(string)
  default = []
}
