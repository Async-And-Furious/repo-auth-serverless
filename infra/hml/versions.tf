terraform {
  # 1.11+ for S3 native state locking (use_lockfile); no DynamoDB table to bootstrap.
  required_version = ">= 1.11.0"
  # Partial configuration: bucket/key/region come from backend.hcl, which the
  # workflow generates from the live Lab account ID.
  backend "s3" {}
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.aws_region }
