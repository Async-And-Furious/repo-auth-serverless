terraform {
  required_version = ">= 1.6.0"
  backend "remote" {
    organization = "async_furious"
    workspaces { name = "tc3-auth-prod" }
  }
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.aws_region }
