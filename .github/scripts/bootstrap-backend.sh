#!/usr/bin/env bash
# Ensure the Terraform S3 state bucket exists in the current AWS account and
# write a partial backend configuration for it.
#
# Usage: bootstrap-backend.sh <state-prefix> <environment> [output-file]
#
# The bucket name is suffixed with the live account ID, so a freshly issued AWS
# Academy lab account bootstraps itself on the next run instead of failing on a
# bucket that belongs to the previous account. The account ID is masked so it
# never reaches the workflow log.
set -euo pipefail

prefix=${1:?state prefix is required}
environment=${2:?environment is required}
output=${3:-backend.hcl}
region=${AWS_REGION:?AWS_REGION is required}

account_id=$(aws sts get-caller-identity --query Account --output text)
echo "::add-mask::$account_id"
bucket="tc3-tfstate-${account_id}"

if ! aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
  if [ "$region" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$bucket" --region "$region"
  else
    aws s3api create-bucket --bucket "$bucket" --region "$region" \
      --create-bucket-configuration "LocationConstraint=$region"
  fi
  aws s3api wait bucket-exists --bucket "$bucket"
fi

aws s3api put-bucket-versioning --bucket "$bucket" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$bucket" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket "$bucket" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

cat > "$output" <<EOF
bucket       = "$bucket"
key          = "$prefix/$environment/terraform.tfstate"
region       = "$region"
encrypt      = true
use_lockfile = true
EOF

echo "Terraform state key: $prefix/$environment/terraform.tfstate"
