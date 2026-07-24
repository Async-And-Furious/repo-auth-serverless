# repo-auth-serverless

Tech Challenge Fase 3 — serverless CPF authentication and JWT authorization.

## Scope

- `src/authenticate-customer`: validates CPF, checks customer existence/status, issues JWT.
- `src/authorize-request`: Lambda Authorizer that validates JWT on protected routes.

Out of scope: monolith code, EKS provisioning, RDS provisioning, business schema duplication.

## Status

Skeleton only. Handlers return placeholder responses. No infrastructure deployed yet.

## Local development

```bash
npm install
npm run typecheck
npm test
```

## Open decisions

See `../HANDOFF.md` section 20 (API Gateway type, JWT signing strategy, RDS connectivity, etc.) — must be resolved via RFC before implementation.
