#!/usr/bin/env bash
# Resolve existing account-qualified S3 state without changing the bucket.
# Missing or empty state is a successful no-op; every other AWS error fails.
set -euo pipefail

prefix=${1:?state prefix is required}
environment=${2:?environment is required}
output=${3:-backend.hcl}
region=${AWS_REGION:?AWS_REGION is required}

emit_state() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "has_state=$1" >> "$GITHUB_OUTPUT"
  fi
  echo "Destroy state present: $1"
}

error_file=$(mktemp)
state_file=$(mktemp)
trap 'rm -f "$error_file" "$state_file"' EXIT

account_id=$(aws sts get-caller-identity --query Account --output text)
echo "::add-mask::$account_id"
bucket="tc3-tfstate-${account_id}"
key="$prefix/$environment/terraform.tfstate"

if ! aws s3api head-bucket --bucket "$bucket" 2>"$error_file"; then
  if grep -Eq '(^|[^0-9])404([^0-9]|$)|NoSuchBucket|Not Found' "$error_file"; then
    emit_state false
    exit 0
  fi
  cat "$error_file" >&2
  exit 1
fi

if ! size=$(aws s3api head-object --bucket "$bucket" --key "$key" \
  --query ContentLength --output text 2>"$error_file"); then
  if grep -Eq '(^|[^0-9])404([^0-9]|$)|NoSuchKey|Not Found' "$error_file"; then
    emit_state false
    exit 0
  fi
  cat "$error_file" >&2
  exit 1
fi

if [ "$size" = "0" ]; then
  emit_state false
  exit 0
fi

if ! aws s3api get-object --bucket "$bucket" --key "$key" "$state_file" \
  >/dev/null 2>"$error_file"; then
  if grep -Eq '(^|[^0-9])404([^0-9]|$)|NoSuchKey|Not Found' "$error_file"; then
    emit_state false
    exit 0
  fi
  cat "$error_file" >&2
  exit 1
fi
has_managed_state=$(python - "$state_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as state_file:
    state = json.load(state_file)

print("true" if any(
    resource.get("mode", "managed") == "managed" and resource.get("instances")
    for resource in state.get("resources", [])
) else "false")
PY
)
if [ "$has_managed_state" != "true" ]; then
  emit_state false
  exit 0
fi

cat > "$output" <<EOF
bucket       = "$bucket"
key          = "$key"
region       = "$region"
encrypt      = true
use_lockfile = true
EOF

echo "Terraform state key: $key"
emit_state true
