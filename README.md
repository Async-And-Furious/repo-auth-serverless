# repo-auth-serverless

Tech Challenge Fase 3 — serverless CPF authentication and JWT authorization.

## Scope

- `src/authenticate-customer`: validates CPF, checks customer existence/status, issues JWT.
- `src/authorize-request`: Lambda Authorizer that validates JWT on protected routes.

Out of scope: monolith code, EKS provisioning, RDS provisioning, business schema duplication.

## Status

Handlers implemented and unit-tested (mocked DB/JWT). No infrastructure deployed yet — Terraform for the Lambda itself, Secrets Manager wiring, and API Gateway integration remain out of scope for this repository at this stage.

- `authenticate-customer`: validates CPF format/check digits, queries `Cliente` by `documento` via a direct Postgres connection (`pg`), issues a JWT (`role: CLIENTE`). Returns a generic `401` for both invalid CPF and non-existent customer, to avoid CPF enumeration.
- `authorize-request`: validates `Authorization: Bearer <token>` against the same JWT secret/algorithm.

See `docs/adr/` for the architectural decisions behind this repository (AWS as cloud provider, custom Lambda vs. Cognito, dedicated repo, direct RDS access, shared-logic reuse).

## Environment variables

Copy `.env.example` to `.env`. See that file for `DB_*` (Postgres connection) and `JWT_*` (signing secret/expiration) variables.

## Local development

```bash
pnpm install
pnpm run typecheck
pnpm test
```

## Open decisions

See `../HANDOFF.md` section 20 (API Gateway type, JWT signing strategy, RDS connectivity, etc.) — must be resolved via RFC before implementation.
