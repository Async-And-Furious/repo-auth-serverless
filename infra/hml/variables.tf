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
variable "database_security_group_ids" {
  type    = list(string)
  default = []
}
variable "database_subnet_ids" {
  type    = list(string)
  default = []
}
variable "backend_integration_uri" {
  type    = string
  default = ""
}
variable "vpc_link_subnet_ids" {
  type    = list(string)
  default = []
}
variable "vpc_link_security_group_ids" {
  type    = list(string)
  default = []
}
