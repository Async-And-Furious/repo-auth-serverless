# Issue 317 — multi-service edge contract

## Scope

For the HML Phase 4 edge only, keep `POST /auth` public and use one
authorizer-protected catch-all route for other backend traffic, with the four
explicit public backend routes accepted by ADR-0021 and `edge-topology.md` §2.
HML health is not a public API Gateway route; the ALB target group probes
`/api/v1/health/live` directly. The Phase 3 PROD Gateway contract is unchanged.

## Contract

- In HML, `POST /auth` is public.
- Protected traffic uses one `ANY /{proxy+}` route with
  `authorization_type = "CUSTOM"`.
- The four explicit public backend routes use `authorization_type = "NONE"`.
- Only the backend integration overwrites `x-correlation-id` from authorizer
  context.
- `aprovar-servico` and `rastreamento` have no public routes.
- No AWS API Gateway apply is performed locally.
- PROD health route/integration/output are outside this change and remain intact.

## Validation

Run focused contract tests and TypeScript typecheck. Terraform formatting and
static validation cover the HML configuration; PROD is asserted unchanged.
