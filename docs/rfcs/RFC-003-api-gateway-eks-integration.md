# RFC-003 — API Gateway e integração com EKS

- **Status**: Aceito
- **Data**: 2026-07-29
- **Fonte de verdade**: o contrato aprovado do workspace. Esta decisão está
  implementada em `repo-auth-serverless` e `repo-k8s-infra`; esta cópia local
  registra apenas o lado do repositório de auth da decisão, para
  visibilidade.

## Contexto

A propriedade do API Gateway e a integração entre o Gateway e a aplicação
hospedada no EKS (via VPC Link + load balancer interno) eram decisões em
aberto que precisavam ser tomadas antes que o pipeline de apply do
`repo-k8s-infra` ou os recursos de Gateway do `repo-auth-serverless`
pudessem ser implementados de verdade. (Essas lacunas vêm de um documento de
planejamento da Fase 3 — `HANDOFF.md` — que nunca foi encontrado em nenhum
repositório da organização; a decisão abaixo é autocontida e não depende
dele.)

## Decisão

1. **Propriedade**: o `repo-auth-serverless` é dono do recurso API Gateway,
   das rotas (`/auth`, rotas protegidas) e da associação do Lambda
   Authorizer. O `repo-k8s-infra` é dono apenas do alvo de integração
   privado (ALB interno). O ARN do listener é uma entrada de deployment
   fornecida externamente quando disponível; este repositório não assume um
   mecanismo de output ou state remoto entre repositórios que não seja
   suportado.
2. **Integração**: HTTP API (não REST API) com um VPC Link para um
   Application Load Balancer interno na VPC do EKS, usando integração
   `HTTP_PROXY`.

## Justificativa

- As únicas responsabilidades do Gateway (rotas `/auth`, wiring do
  authorizer) já vivem no `repo-auth-serverless` — colocar a propriedade no
  mesmo lugar evita uma dependência entre repositórios para mudanças que só
  tocam esse repositório.
- O VPC Link usa os IDs de sub-rede privada correspondentes e o output do
  security group do ALB interno do state remoto do `repo-k8s-infra`; os
  security groups da Lambda/banco de dados não são reutilizados para a rede
  do Gateway.
- HTTP API + VPC Link + ALB é mais barato e mais simples do que REST API +
  NLB, e nem WAF no gateway, nem usage plans, nem transformação de
  request/response são requisitos atuais.
- A aplicação está planejada para evoluir de monólito para microsserviços.
  O ALB (gerenciado pelo AWS Load Balancer Controller via Kubernetes
  Ingress) suporta adicionar regras de roteamento por path/host por serviço
  sem tocar no Gateway ou no VPC Link. Um NLB (a alternativa sob REST API) é
  apenas L4 e exigiria novo wiring de target group por novo microsserviço —
  esta decisão foi tomada especificamente para evitar esse retrabalho depois.

## Consequências

- A entrada `backend_integration_uri` carrega um ARN de listener de
  ALB/NLB interno aprovado, quando disponível. Este documento registra o
  contrato, não evidência de deployment em runtime; nenhuma exposição direta
  do ALB é implicada.
- O `repo-auth-serverless` deve provisionar a HTTP API, as rotas, o VPC Link
  e o Lambda Authorizer, consumindo o output do ALB do `repo-k8s-infra`.
- Split futuro em microsserviços: adicionar regras de Ingress do Kubernetes +
  rotas de Gateway incrementalmente, sem reformular essa integração.
