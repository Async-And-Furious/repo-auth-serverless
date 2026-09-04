# repo-auth-serverless

Tech Challenge Fase 3 — serverless CPF authentication and JWT authorization.

## Scope

- `src/authenticate-customer`: validates CPF, checks customer existence/status, issues JWT.
- `src/authorize-request`: Lambda Authorizer that validates JWT on protected routes.

Out of scope: monolith code, EKS provisioning, RDS provisioning, business schema duplication.

Authentication validates CPF check digits, requires an active customer, and
returns a generic unauthorized response for invalid or unknown credentials.
JWTs use strict RS256 and a 30-minute (`1800` second) expiry. The emitted
contract is explicit in the authentication response and Terraform outputs:
`algorithm=RS256`, `issuer` from `JWT_ISSUER` (the roots enforce
`repo-auth-serverless`), `audience` from `JWT_AUDIENCE` (the roots enforce
`async-furious-project`), and `subject_claim=Cliente.id`. The JWT `sub` is the
customer's `Cliente.id` string, never the CPF; the monolith must resolve that
identity and re-check active status. Verifiers must enforce RS256, issuer,
audience, and `exp`.
Correlation IDs are returned and propagated to protected backend requests.

Each environment provisions native CloudWatch alarms for authentication and
authorizer Lambda errors plus HTTP API `5XXError` metrics for `/auth` and, when
configured, the protected VPC Link route. Alarms are created without a
notification dependency so an account can attach its approved actions later.

## Status

HML applies automatically from `develop`; pushes to `main` apply production
after the protected `production` Environment approval. Manual applies remain
available through `workflow_dispatch` and require the exact production
confirmation `APPLY PROD`. CI builds, tests, packages, and includes the exact
`dist.zip` in the saved Terraform plan artifact; apply downloads that same
artifact before applying.

## Packaging and deployment

Run `npm run package` locally to compile the handlers and create a deterministic
`dist.zip` containing only production dependencies. The workflow uses the same
package command and artifact for a manually selected `plan` or `apply` in
`hml` or `prod`.

Configure the GitHub Environments `hml` and `production` with these secrets:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`
  (temporary AWS Academy credentials).
- `JWT_PRIVATE_KEY_SECRET_ARN` and `DATABASE_SECRET_ARN`.

The workflow always uses the Academy credential model for both logical
environments: pushes to `develop` deploy HML automatically, while production
uses the protected `production` Environment approval. Manual runs select
`hml` or `prod` and an operation; there is no Academy-mode toggle.

The manual dispatch also exposes `deploy_auth_only`, which defaults to `false`.
The workflow exports `TF_VAR_deploy_auth_only` as `true` only when this input is
explicitly enabled and `BACKEND_INTEGRATION_URI` is empty. A configured backend
URI always selects the full deployment path, even if the input is accidentally
set to `true`.

Required non-secret Actions variables are `AWS_REGION`, `JWT_PUBLIC_KEY_PARAMETER_NAME`,
and `JWT_PUBLIC_KEY_PARAMETER_ARN`. The Lambda consumes matching private
subnets from `repo-k8s-infra` state and the database security group from
`repo-db-infra` state; these IDs must not be set as GitHub variables. Optional variables are
`AUTH_LAMBDA_ROLE_ARN`, `AUTHORIZER_LAMBDA_ROLE_ARN`,
`BACKEND_INTEGRATION_URI` (an ALB/NLB listener ARN). VPC Link private subnet
IDs and the internal ALB security group ID are read from the matching
`repo-k8s-infra` remote state; they are not GitHub variables. No AWS resource
IDs are stored in this repository.

`BACKEND_INTEGRATION_URI` is environment-scoped: HML must use the HML
`internal_alb_listener_arn` output and production must use the corresponding
production output from `repo-k8s-infra`. The production workflow fails when the
value is missing or contains the known HML listener name `tc3-hml-internal`; it
never falls back to HML or to an auth-only deployment.

For AWS Academy/Lab, set the existing Lambda execution role as a non-secret
environment variable:

```bash
gh variable set LAB_ROLE_ARN --env hml --body "arn:aws:iam::<ACCOUNT_ID>:role/LabRole"
```

The Academy configuration creates no IAM roles, role attachments, or inline
policies and uses `LAB_ROLE_ARN` for both Lambdas. The existing role must trust Lambda and already
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

Remove the environment secrets after the session expires:

```bash
gh secret delete AWS_ACCESS_KEY_ID --env hml
gh secret delete AWS_SECRET_ACCESS_KEY --env hml
gh secret delete AWS_SESSION_TOKEN --env hml
gh secret delete AWS_ACCESS_KEY_ID --env production
gh secret delete AWS_SECRET_ACCESS_KEY --env production
gh secret delete AWS_SESSION_TOKEN --env production
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
`environment=hml`; production destroy is rejected.
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
Secrets Manager ARN, database secret ARN, and JWT public-key SSM parameter name
and ARN. Lambda VPC networking is read from matching K8s/DB remote state, and
When `deploy_auth_only=false`, the ALB/NLB listener ARN is supplied as
`backend_integration_uri`. The API Gateway backend URI is not known by this
repository and must be supplied by the Kubernetes/infrastructure deployment;
it must be an ALB/NLB listener ARN, not a normal HTTP URL. The VPC Link uses
the matching private subnets and `internal_alb_security_group_id` from
`repo-k8s-infra` state to enable the RFC-003 protected EKS route and Lambda
Authorizer.
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
Terraform also exposes environment-scoped API Gateway outputs: API id and
endpoint, `/auth` route key, authorizer id, and protected route, integration,
VPC Link, and backend URI values when full integration is enabled. Lambda
network inputs use the matching approved remote-state contracts.
Customer lookup uses the fixed cross-repository schema contract:

```sql
SELECT "id", "ativo" AS "active"
FROM "Cliente"
WHERE "documento" = $1
  AND "tipo_documento" = 'CPF'
```
