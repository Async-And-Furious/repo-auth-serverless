# Issue 317 — multi-service edge contract

## Scope

Keep `POST /auth` public and keep `GET /api/v1/health/live` public. Use one
authorizer-protected catch-all route for all other traffic, with explicit public
backend exceptions for the documented order status, budget approval/refusal,
and Mercado Pago webhook routes.

## Contract

- `POST /auth` and `GET /api/v1/health/live` are public.
- Protected traffic uses one `ANY /{proxy+}` route with
  `authorization_type = "CUSTOM"`.
- The four explicit public backend routes use `authorization_type = "NONE"`.
- Only the backend integration overwrites `x-correlation-id` from authorizer
  context; the health integration does not overwrite it.
- `aprovar-servico` and `rastreamento` have no public routes.
- No AWS API Gateway apply is performed locally.

## Validation

Run Lambda tests and TypeScript typecheck. Terraform formatting and static
validation cover both HML and PROD configurations.
