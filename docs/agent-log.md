# Agent log

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
