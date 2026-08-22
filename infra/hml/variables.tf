variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "name_prefix" {
  type    = string
  default = "tc3-auth-hml"
}
variable "jwt_private_key_secret_arn" { type = string }
variable "jwt_public_key_parameter_name" { type = string }
variable "jwt_public_key_parameter_arn" { type = string }
variable "database_secret_arn" { type = string }
variable "jwt_issuer" { type = string }
variable "jwt_audience" { type = string }
variable "jwt_expires_in" {
  type    = number
  default = 1800
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
}
variable "deploy_auth_only" {
  type        = bool
  default     = false
  description = "Explicitly allow an auth-only deployment while the backend target is unavailable."
  validation {
    condition     = (var.deploy_auth_only && trimspace(var.backend_integration_uri) == "") || (!var.deploy_auth_only && trimspace(var.backend_integration_uri) != "")
    error_message = "Use deploy_auth_only=true only without a backend URI, or provide a backend URI with deploy_auth_only=false."
  }
}
variable "vpc_link_subnet_ids" {
  type    = list(string)
  default = []
}
variable "vpc_link_security_group_ids" {
  type    = list(string)
  default = []
}
