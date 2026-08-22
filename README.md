# repo-auth-serverless

Tech Challenge Fase 3 — serverless CPF authentication and JWT authorization.

## Scope

- `src/authenticate-customer`: validates CPF, checks customer existence/status, issues JWT.
- `src/authorize-request`: Lambda Authorizer that validates JWT on protected routes.

Out of scope: monolith code, EKS provisioning, RDS provisioning, business schema duplication.

## Status

Handlers implemented and unit-tested (mocked DB/JWT). No infrastructure deployed yet — Terraform for the Lambda itself, Secrets Manager wiring, and API Gateway integration remain out of scope for this repository at this stage.

- `authenticate-customer`: validates CPF format/check digits, queries `Cliente` by `documento` via a direct Postgres connection (`pg`), issues a JWT (`role: CLIENTE`). Returns a generic `401` for both invalid CPF and non-existent customer, to avoid CPF enumeration.
- `authorize-request`: strictly validates `Authorization: Bearer <single-token>` and verifies RS256 tokens with configured issuer, audience and required claims.

See `docs/adr/` for the architectural decisions behind this repository (AWS as cloud provider, custom Lambda vs. Cognito, dedicated repo, direct RDS access, shared-logic reuse).

## Environment variables

Configure `JWT_ALGORITHM=RS256`, `JWT_ISSUER`, `JWT_AUDIENCE` and `JWT_EXPIRES_IN` (1800 seconds in HML/PROD). Cross-repo consumers must configure the same `JWT_ALGORITHM=RS256`, matching public key, issuer, and audience; this repository does not claim end-to-end compatibility with the monolith. Signing uses `JWT_PRIVATE_KEY_SECRET_ARN` (Secrets Manager), database access uses `DATABASE_SECRET_ARN`, and verification uses `JWT_PUBLIC_KEY_PARAM_NAME` (SSM); PEM and `DB_*` environment variables are local-test fallbacks only when the corresponding ARN is absent. Missing or invalid JWT/database configuration fails closed. The database secret is JSON shaped as `{ "host": "...", "port": 5432, "username": "...", "password": "...", "dbname": "...", "ssl": true }` and is cached per Lambda container.

## Local development

```bash
pnpm install
pnpm run typecheck
pnpm test
```

## Open decisions

See `../HANDOFF.md` section 20 (API Gateway type, JWT signing strategy, RDS connectivity, etc.) — must be resolved via RFC before implementation.
