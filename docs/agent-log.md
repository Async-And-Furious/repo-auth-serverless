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
