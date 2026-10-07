# Issue 317 — multi-service edge contract

## Scope

Keep `POST /auth` public. Publish explicit API Gateway routes for the
documented public health endpoint and protected service prefixes (`/api/v1`,
`/billing`, and `/execucao`), all protected routes using the Lambda authorizer.

## Contract

- Public routes are explicit and never use a catch-all route.
- Protected routes are explicit `ANY` proxy routes with `authorization_type =
  "CUSTOM"`.
- The authorizer receives and propagates `x-correlation-id`; backend
  integration overwrites that header from authorizer context.
- No AWS API Gateway apply is performed locally.

## Validation

Run Lambda tests and TypeScript typecheck. Terraform formatting and static
validation cover both HML and PROD configurations.
