# Issue 317 — multi-service edge contract

## Scope

Keep `POST /auth` public. Use one authorizer-protected catch-all route for all
other backend traffic, with the four explicitly public backend routes accepted
by ADR-0021 and `edge-topology.md` §2. Health is not a public API Gateway route;
the ALB target group probes `/api/v1/health/live` directly.

## Contract

- `POST /auth` is public.
- Protected traffic uses one `ANY /{proxy+}` route with
  `authorization_type = "CUSTOM"`.
- The four explicit public backend routes use `authorization_type = "NONE"`.
- Only the backend integration overwrites `x-correlation-id` from authorizer
  context.
- `aprovar-servico` and `rastreamento` have no public routes.
- No AWS API Gateway apply is performed locally.

## Validation

Run focused contract tests and TypeScript typecheck. Terraform formatting and
static validation cover both HML and PROD configurations.
