# repo-auth-serverless

Tech Challenge Fase 3 — serverless CPF authentication and JWT authorization.

## Scope

- `src/authenticate-customer`: validates CPF, checks customer existence/status, issues JWT.
- `src/authorize-request`: Lambda Authorizer that validates JWT on protected routes.

Out of scope: monolith code, EKS provisioning, RDS provisioning, business schema duplication.

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

- OIDC mode: `AWS_ROLE_ARN`, `JWT_PRIVATE_KEY_SECRET_ARN`, and
  `DATABASE_SECRET_ARN`.
- AWS Academy mode: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and
  `AWS_SESSION_TOKEN` (temporary credentials). When both the access key and
  three are present, the workflow uses them; otherwise it falls back to OIDC.

The OIDC role must be trusted by GitHub Actions. Required non-secret Actions
variables are `AWS_REGION`, `JWT_PUBLIC_KEY_PARAMETER_NAME`,
`JWT_PUBLIC_KEY_PARAMETER_ARN`, `DATABASE_SUBNET_IDS`, and
`DATABASE_SECURITY_GROUP_IDS`. Optional variables are
`AUTH_LAMBDA_ROLE_ARN`, `AUTHORIZER_LAMBDA_ROLE_ARN`,
`BACKEND_INTEGRATION_URI`, `VPC_LINK_SUBNET_IDS`, and
`VPC_LINK_SECURITY_GROUP_IDS`; list variables must be JSON arrays (for example,
`["subnet-a","subnet-b"]`). No AWS resource IDs are stored in this repository.

For AWS Academy/Lab, set the optional existing Lambda execution roles as
environment variables (they are not secrets):

```bash
gh variable set AUTH_LAMBDA_ROLE_ARN --env hml --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
gh variable set AUTHORIZER_LAMBDA_ROLE_ARN --env hml --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
gh variable set AUTH_LAMBDA_ROLE_ARN --env prod --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
gh variable set AUTHORIZER_LAMBDA_ROLE_ARN --env prod --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
```

When either ARN is set, Terraform does not create or attach policies to that
role and uses it directly. The existing role must trust Lambda and already
permit the function's CloudWatch, Secrets Manager, VPC, and/or SSM access;
AWS Academy `LabRole` permissions are account-limited and may not support every
resource configuration.

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

For local Terraform use, run `terraform init`, `terraform plan`, and only after
review `terraform apply` in the chosen `infra/hml` or `infra/prod` directory.
Provide the required variables through an uncommitted tfvars file.
`backend_integration_uri` plus VPC Link subnet/security-group IDs enables the
RFC-003 protected EKS route and Lambda Authorizer; leaving it empty creates the
auth API and authorizer skeleton only.

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
