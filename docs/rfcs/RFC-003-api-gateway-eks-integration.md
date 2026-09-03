# RFC-003 — API Gateway e integração com EKS

- **Status**: Accepted
- **Date**: 2026-07-29
- **Source of truth**: the approved workspace contract. This implementation
  `repo-auth-serverless` and `repo-k8s-infra` for local visibility — update
  copy records the auth repository side of the decision.

## Context

HANDOFF.md §6.2 left API Gateway ownership open, and §4.2 suggested (without
deciding) a VPC Link + internal load balancer integration between the
Gateway and the EKS-hosted application. Both needed a decision before
`repo-k8s-infra`'s apply pipeline or `repo-auth-serverless`'s Gateway
resources could be implemented for real.

## Decision

1. **Ownership**: `repo-auth-serverless` owns the API Gateway resource,
   routes (`/auth`, protected routes), and the Lambda Authorizer
   association. `repo-k8s-infra` owns only the private integration target
   (internal ALB). Its listener ARN is an externally supplied deployment input
   when available; this repository does not assume an unsupported
   cross-repository output or remote-state mechanism.
2. **Integration**: HTTP API (not REST API) with a VPC Link to an internal
   Application Load Balancer in the EKS VPC, using `HTTP_PROXY` integration.

## Rationale

- The Gateway's only responsibilities (`/auth` routes, authorizer wiring)
  live in `repo-auth-serverless` already — co-locating ownership avoids a
  cross-repo dependency for changes that only ever touch that repo.
- HTTP API + VPC Link + ALB is cheaper and simpler than REST API + NLB, and
  neither WAF-at-gateway nor usage plans nor request/response
  transformation are current requirements.
- The application is planned to evolve from monolith to microservices.
  ALB (managed by the AWS Load Balancer Controller via Kubernetes Ingress)
  supports adding path/host-based routing rules per-service without
  touching the Gateway or VPC Link. An NLB (the alternative under REST API)
  is L4-only and would need new target-group wiring per new microservice —
  this decision was made specifically to avoid that redo later.

## Consequences

- The `backend_integration_uri` input carries an approved internal ALB/NLB
  listener ARN when available. This document records the contract, not runtime
  deployment evidence; no direct-ALB exposure is implied.
- `repo-auth-serverless` must provision the HTTP API, routes, VPC Link, and
  Lambda Authorizer, consuming the ALB output from `repo-k8s-infra`.
- Future microservice split: add Kubernetes Ingress rules + Gateway routes
  incrementally, no re-architecture of this integration.
