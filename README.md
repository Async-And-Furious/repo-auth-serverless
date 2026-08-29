# repo-auth-serverless

Tech Challenge Fase 3 — serverless CPF authentication and JWT authorization.

## Scope

- `src/authenticate-customer`: validates CPF, checks customer existence/status, issues JWT.
- `src/authorize-request`: Lambda Authorizer that validates JWT on protected routes.

Out of scope: monolith code, EKS provisioning, RDS provisioning, business schema duplication.

Authentication validates CPF check digits, requires an active customer, and
returns a generic unauthorized response for invalid or unknown credentials.
JWTs use strict RS256 algorithm, issuer, audience, and expiry configuration.
Correlation IDs are returned and propagated to protected backend requests.

## Status

HML and production Terraform lanes are available through the manual
`workflow_dispatch` inputs in `.github/workflows/ci.yml`. CI builds, tests, and
uploads `dist.zip`; no environment is applied automatically, including
production. GitHub Environments must provide the approval gate for each lane.

## Packaging and deployment

Run `npm run package` locally to compile the handlers and create a deterministic
`dist.zip` containing only production dependencies. The workflow uses the same
package command and artifact for a manually selected `plan` or `apply` in
`hml` or `prod`.

Configure the selected GitHub Environment (`hml` or `prod`) with these secrets:

- Normal mode: `AWS_ROLE_ARN`, `JWT_PRIVATE_KEY_SECRET_ARN`, and
  `DATABASE_SECRET_ARN`.
- AWS Academy mode: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and
  `AWS_SESSION_TOKEN` (temporary credentials). Select `academy_mode=true` in
  the manual workflow dispatch; this disables the OIDC path.

The manual dispatch also exposes `deploy_auth_only`, which defaults to `false`.
The workflow exports `TF_VAR_deploy_auth_only` as `true` only when this input is
explicitly enabled and `BACKEND_INTEGRATION_URI` is empty. A configured backend
URI always selects the full deployment path, even if the input is accidentally
set to `true`.

The OIDC role must be trusted by GitHub Actions. Required non-secret Actions
variables are `AWS_REGION`, `JWT_PUBLIC_KEY_PARAMETER_NAME`,
`JWT_PUBLIC_KEY_PARAMETER_ARN`, `DATABASE_SUBNET_IDS`, and
`DATABASE_SECURITY_GROUP_IDS`. Optional variables are
`AUTH_LAMBDA_ROLE_ARN`, `AUTHORIZER_LAMBDA_ROLE_ARN`,
`BACKEND_INTEGRATION_URI` (an ALB/NLB listener ARN), `VPC_LINK_SUBNET_IDS`, and
`VPC_LINK_SECURITY_GROUP_IDS`; list variables must be JSON arrays (for example,
`["subnet-a","subnet-b"]`). No AWS resource IDs are stored in this repository.

For AWS Academy/Lab, select `academy_mode=true` and set the existing Lambda
execution role as a non-secret environment variable:

```bash
gh variable set LAB_ROLE_ARN --env hml --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
gh variable set LAB_ROLE_ARN --env prod --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
```

In Academy mode, Terraform creates no IAM roles, role attachments, or inline
policies and uses `LAB_ROLE_ARN` for both Lambdas. The existing role must trust Lambda and already
permit the function's CloudWatch, Secrets Manager, VPC, and/or SSM access;
AWS Academy `LabRole` permissions are account-limited and may not support every
resource configuration.

Normal mode may still use `AUTH_LAMBDA_ROLE_ARN` and
`AUTHORIZER_LAMBDA_ROLE_ARN` to supply separate pre-existing roles; otherwise
Terraform creates them.

### Rotate AWS Academy credentials with `gh`

Set each temporary credential from a file through standard input, for the
environment being deployed:

```bash
gh secret set AWS_ACCESS_KEY_ID --env hml < access-key-id.txt
gh secret set AWS_SECRET_ACCESS_KEY --env hml < secret-access-key.txt
gh secret set AWS_SESSION_TOKEN --env hml < session-token.txt
```

Repeat with `--env prod` when needed. Remove the three environment secrets after
the session expires to return to OIDC:

```bash
gh secret delete AWS_ACCESS_KEY_ID --env hml
gh secret delete AWS_SECRET_ACCESS_KEY --env hml
gh secret delete AWS_SESSION_TOKEN --env hml
```

Use `-R OWNER/REPOSITORY` with these commands when running them outside the
repository checkout. Do not put temporary credentials in command arguments or
commit the source files.

### Terraform state and local execution

Terraform runs on the Actions runner and stores state in the account-qualified
S3 bucket `tc3-tfstate-<account-id>` at
`repo-auth-serverless/<environment>/terraform.tfstate`, with native S3 locking.
Normal `plan` and `apply` operations bootstrap that bucket before initialization.

Manual `destroy-plan` and `destroy` operations are intentionally limited to
`environment=hml` and `academy_mode=true`; production destroy is rejected.
`destroy` additionally requires the exact confirmation `DESTROY HML`.
The destroy preflight only reads the current account's existing bucket and
state. A missing bucket, missing key, zero-byte object, or state with no managed
resource instances is a successful no-op. Authorization and other AWS errors
fail the run. Destroy never creates or changes backend settings, and retains
both the bucket and state object.

Destroy operations skip Lambda packaging and deployment-only JWT/database
input checks. Terraform still evaluates required root variables before building
a destroy graph, so the workflow supplies clearly named, non-secret placeholders
and disables deploy-only VPC/backend branches. `destroy-plan` only plans;
confirmed `destroy` saves a destroy plan and applies that exact file.

For local execution, generate an uncommitted `backend.hcl` for the existing S3
backend, initialize the selected root, and run the usual Terraform commands.
Use `infra/prod` only for plan/apply; run apply only after review.
Provide the required variables through an uncommitted tfvars file.
Integration values still required for a full deployment are the JWT private-key
Secrets Manager ARN, database secret ARN, JWT public-key SSM parameter name and
ARN, Lambda VPC subnet/security-group IDs, and (when `deploy_auth_only=false`)
the ALB/NLB listener ARN as `backend_integration_uri` plus VPC Link
subnet/security-group IDs. The API Gateway backend URI is not known by this
repository and must be supplied by the Kubernetes/infrastructure deployment;
it must be an ALB/NLB listener ARN, not a normal HTTP URL. `backend_integration_uri`
must contain the listener ARN, plus VPC Link subnet/security-group IDs, to enable the
RFC-003 protected EKS route and Lambda Authorizer when `deploy_auth_only=false`.
The Terraform module default `deploy_auth_only=true` is a safe local auth-only
fallback. The workflow default is `false`; its backend URI rule above ensures
that an orchestrated full deployment enables the protected backend path.

## Local development

```bash
npm install
npm run typecheck
npm test
```

JWT signing and API Gateway ownership follow accepted RFC-003 and RFC-006.
Customer lookup uses the fixed cross-repository schema contract:

```sql
SELECT "id", "ativo" AS "active"
FROM "Cliente"
WHERE "documento" = $1
  AND "tipo_documento" = 'CPF'
```
