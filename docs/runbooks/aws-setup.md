# AWS setup prerequisites

This runbook previously carried a per-repository copy of the account-setup
handoff. The four copies drifted apart and all of them described infrastructure
that no longer exists (a GitHub OIDC provider and hand-created IAM role, a
manually provisioned `tc3-terraform-state` bucket with a
`tc3-terraform-locks` DynamoDB table, HCP Terraform workspaces and
`TF_API_TOKEN`, and an `hml-apply` approval gate).

The canonical, current documents live in the workspace root:

- `HANDOFF-AWS-SETUP.md` — what a human sets up, per path (AWS Academy or a
  real account with OIDC), and what the pipeline provisions for itself.
- `AWS_HML_RUNBOOK.md` — the operator procedure, gates, and
  `scripts/aws_lab.py` usage.

Short version for this repository: Terraform state is S3 at
`tc3-tfstate-<account-id>` with S3 native locking, bootstrapped by
`.github/scripts/bootstrap-backend.sh` inside the workflow. Nothing about the
state backend is provisioned by hand. Credentials are the AWS Academy session
values, rotated into repository-scoped secrets at the start of each lab session.
