# Agent log

## 2026-09-04 — API Gateway VPC Link remote-state networking

- HML and production now consume `private_subnet_ids` and
  `internal_alb_security_group_id` from matching `repo-k8s-infra` state for the
  private API Gateway VPC Link. Removed empty GitHub VPC Link inputs; the
  existing ALB listener ARN integration and private route remain unchanged.
- No AWS apply or destroy was run.
## 2026-09-04 — Remote-state Lambda networking

- Removed GitHub subnet/security-group inputs, including stale HML subnet
  handling that caused Terraform plan failures.
- HML and production now read matching private subnets from `repo-k8s-infra`
  state and the database security group from `repo-db-infra` state. No AWS
  apply or destroy was run.

## 2026-09-04 — Explicit production destroy workflow

- Added dispatch-only production destroy with the protected `production`
  Environment and exact `DESTROY PROD` confirmation.
- Kept HML destroy behavior, state backend, and external JWT/database secrets
  unchanged; destroy-only Terraform placeholders are used without deleting
  those external resources. No destroy was executed.

## 2026-08-31 — Academy workflow and exact Lambda artifact

- Updated documentation and workflow-contract coverage for the always-Academy
  HML/production workflow and its actual credential references.
- Included `dist.zip` with the saved Terraform plan artifact and download it at
  the repository root before applying the exact plan.
- No AWS action, commit, or push was performed.

## 2026-08-31 — RDS TLS connection contract

- Added `sslmode=require` to the Lambda's Secrets Manager connection-details
  fallback, matching the RDS `force_ssl=1` deployment contract.
- Added focused coverage for the fallback while preserving existing secret
  loading and explicit `DATABASE_URL` behavior. No AWS action was run.

## 2026-08-31 — Production push guard and route observability

- Limited the production confirmation check to manual dispatches so automatic
  `main` pushes can deploy after the protected `production` Environment gate;
  manual production apply still requires `APPLY PROD`.
- Added native CloudWatch Lambda error and API Gateway route 5xx alarms to both
  Terraform environments, including the optional VPC Link route.
- No commit, push, AWS apply, or destroy was performed.

## 2026-08-30 — Explicit JWT consumer contract

- Added code-level JWT contract metadata and subject validation. `/auth` now
  emits algorithm, issuer, audience, expiry, and `Cliente.id` subject semantics;
  HML/production Terraform outputs expose the same contract.
- Added contract and subject tests. No AWS apply/destroy, commit, or push was
  performed.

## 2026-08-30 — Confirmed auth delivery target

- Updated the auth workflow so the same temporary AWS Academy credentials can
  serve HML and production, with separate environment state/config/artifacts.
- Preserved automatic `develop` HML delivery, protected `main` production
  approval, and manual HML-only destructive operations.
- Reconciled API Gateway route/integration outputs and refreshed stale RFC and
  AWS setup documentation without adding unsupported cross-repository wiring.
- Added workflow and malformed-Bearer tests. No AWS apply/destroy, commit, or
  push was performed.

## 2026-08-10

- Implemented CPF validation, PostgreSQL customer lookup, active-status check,
  RS256 issuance, structured responses, and tests.
- Added HML Terraform for both Lambdas, IAM, logs, Secrets Manager/SSM runtime
  references, HTTP API auth route, and optional RFC-003 VPC Link protected route.
- Validation: `npm test`, `npm run typecheck`, `npm run build`, and
  `terraform validate` passed. No Terraform apply was run.

## 2026-08-13 — CPF lookup contract

- Fast-forward-only pull confirmed the four `Async-And-Furious` repositories
  were already aligned with their upstream branches; comparison repositories
  were not touched.
- Aligned the customer lookup with the application schema: `"Cliente"`,
  `documento`, `tipo_documento = 'CPF'`, and `ativo AS active`.
- Removed the runtime SQL override and added focused active, inactive, missing,
  and query-contract coverage.
- Validation passed: 12 tests, typecheck, lint, build, `git diff --check`, and a
  disposable PostgreSQL 16 contract check covering CPF status and CNPJ
  exclusion.
- No commit, push, AWS mutation, Terraform apply, or production action ran.

## 2026-08-15 — CI/CD workflow

- Added deterministic Lambda packaging and a manual, OIDC-backed Terraform
  workflow for HML and production with GitHub Environment gates.
- Production apply is never triggered by pushes; it is available only as an
  explicit manual workflow input.

## 2026-08-16 — Existing Lambda execution roles

- Added optional HML/production Lambda and authorizer execution-role ARN
  variables for AWS Academy/Lab. Supplied roles bypass Terraform IAM role
  creation and policy resources; empty values retain managed role creation.
- Wired the non-secret GitHub Environment variables into the workflow and
  documented `gh variable set` commands and the LabRole permissions caveat.
- Validation was left to the orchestrator; no Terraform apply was run.

## 2026-08-23 — Cross-repository JWT contract

- Standardized Lambda tokens on `sub=Cliente.id`, RS256, issuer
  `repo-auth-serverless`, audience `async-furious-project`, and 1800 seconds;
  raw CPF/document claims are no longer emitted.
- The monolith consumer must resolve `sub` by `Cliente.id` and active status.
- No AWS or Terraform apply was run. Lambda-to-PostgreSQL SSL parameters remain
  an operational follow-up because the deployed RDS CA/SSL policy is not known.

## 2026-08-24 — AWS Academy compatibility

- Added explicit `academy_mode` and required `lab_role_arn` inputs to HML and
  production Terraform. Academy mode reuses the existing role for both Lambdas
  and skips all IAM role, attachment, and inline-policy resources.
- Added workflow dispatch and environment wiring for Academy mode; it requires
  temporary credentials and does not fall back to GitHub OIDC. Updated README
  with required integration values and role permissions caveats.
- Validation passed: lint, typecheck, 19 tests, build, Terraform formatting, and
  `terraform validate` for HML and production. No Terraform apply was run.

## 2026-08-24 — Auth deployment workflow contract

- Added the explicit `deploy_auth_only` dispatch input and exported
  `TF_VAR_deploy_auth_only` with the backend URI safety rule: a configured
  `BACKEND_INTEGRATION_URI` always selects full deployment.
- Documented auth-only/full-deployment selection and retained Academy LabRole
  reuse without IAM resource creation. No Terraform apply was run.

## 2026-08-24 — HCP Terraform state

- Switched HML and production roots to the HCP Terraform remote backend with
  local execution and state-only workspaces `tc3-auth-hml`/`tc3-auth-prod`.
- Added the GitHub `TF_API_TOKEN` mapping; AWS Academy credentials remain GitHub
  secrets and are not configured in HCP Terraform. No Terraform apply was run.

## 2026-08-24 — HCP Terraform backend initialization

- Configured the HCP Terraform organization and static HML/production workspace
  names in each Terraform root.
- Simplified workflow initialization to use the root backend configuration;
  Academy credential handling remains unchanged. No Terraform apply was run.

## 2026-08-24 — Remote backend local execution

- Replaced workflow Terraform variable/plan artifact handling with a temporary
  `terraform.auto.tfvars.json`; plan now runs without `-out` and apply executes
  directly. HML, production, Academy credentials, and TF_TOKEN handling remain
  unchanged. No Terraform apply was run.

## 2026-08-26 — Direct apply workflow

- Split manual Terraform plan and apply into separate jobs. Apply now runs after
  validation without a plan step while retaining remote backend and Academy
  credential handling. No Terraform apply was run.

## 2026-08-29 — HML/production deployment contract

- HML now applies automatically from `develop`; production remains a manual
  protected-Environment apply with an explicit confirmation guard.
- Added credential and Terraform state preflight checks, production Academy
  rejection, and a protected apply job that downloads and applies the exact
  uploaded plan artifact.
- Added security-contract coverage for active-customer RS256 issuance and
  authorizer decisions, plus correlation-safe structured success/error logs.
- Validation was run locally; no AWS command, Terraform apply, or destroy was run.

## 2026-09-03 — Production backend listener guard

- Production now requires its environment-scoped `BACKEND_INTEGRATION_URI` and
  rejects the known HML `tc3-hml-internal` listener instead of cross-wiring the
  API Gateway integration. The input remains the approved listener ARN output
  from the matching `repo-k8s-infra` state; no remote-state shortcut or secret
  handling was added. No Terraform apply was run.
