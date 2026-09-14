# RFC-006: Estratégia de segredos e assinatura do JWT

## Status

Aceito — 2026-07-30

**Fonte de verdade**: o contrato de autenticação aprovado do workspace. Esta
cópia neste repositório registra a decisão de implementação e suas entradas
em runtime.

## Contexto

A lista de decisões do HANDOFF.md (§20) deixa três itens relacionados em
aberto:

- #2 — Lambda Authorizer vs. JWT authorizer nativo.
- #7 — assinatura do JWT: simétrica vs. assimétrica.
- #8 — duração e claims do token.

O `repo-auth-serverless` implementa as duas Lambdas e suas referências de
segredo em runtime. O módulo RDS do `repo-db-infra` fornece a referência do
segredo do banco de dados; o repositório de auth obtém o valor em runtime.

Isso também precisa considerar a mesma restrição de longo prazo da RFC-003:
o monólito no `repo-application` eventualmente vai se dividir em
microsserviços, e qualquer serviço futuro vai precisar verificar
independentemente os JWTs emitidos pelo `repo-auth-serverless`.

## Decisão

**Authorizer: Lambda Authorizer customizado**, não o JWT authorizer nativo do
API Gateway. O JWT authorizer nativo exige um endpoint HTTPS público de JWKS
para o issuer — infraestrutura extra permanente sem outro uso neste projeto.
Um Lambda Authorizer também combina com o layout de dois handlers que o
HANDOFF §4.3 já sugere (`authenticate-customer` / `authorize-request`) e
mantém controle total sobre a validação de claims customizadas.

**Assinatura: RS256 (assimétrica)**, não HS256. Justificativa:

- A chave privada nunca sai do `repo-auth-serverless`. Apenas suas duas
  Lambdas recebem `secretsmanager:GetSecretValue` no único segredo que a
  contém.
- A chave pública não é sensível. Ela vai para o SSM Parameter Store como um
  `String` simples (não `SecureString`), então qualquer verificador — a
  Lambda `authorize-request` de hoje, o `repo-application` fazendo sua
  própria verificação independente de claims amanhã, ou um futuro
  microsserviço — só precisa de acesso de leitura a um parâmetro não
  sensível. Sem compartilhamento de segredo entre repositórios, sem
  concessões de IAM sobre a chave de assinatura real fora do
  `repo-auth-serverless`.
- Com HS256, todo verificador precisa do mesmo segredo compartilhado, o que
  fica mais difícil de delimitar corretamente conforme mais serviços
  precisam verificar tokens.

**Contrato do token**: RS256, expiração de 30 minutos (`1800` segundos), e
claims mínimas — `sub` (a string `Cliente.id` da identidade do cliente),
`iat`, `exp`, `iss` (`repo-auth-serverless`), e audience
(`async-furious-project`). Sem CPF puro no payload. A resposta de `/auth` e
os dois roots do Terraform expõem o mesmo algoritmo, issuer, audience,
expiração e semântica de subject `Cliente.id` para o consumidor no monólito.

## Armazenamento de chaves

- Chave privada: AWS Secrets Manager, um único segredo, referenciado por ARN
  via uma variável de ambiente da Lambda (nunca o material da chave em si).
- Chave pública: SSM Parameter Store, um único parâmetro `String`,
  referenciado por nome via uma variável de ambiente da Lambda.
- As duas são provisionadas uma única vez fora de banda (geradas via
  `openssl`, armazenadas por quem tem acesso IAM) — não geradas ou commitadas
  pelo código da aplicação ou pelo state do Terraform.

## Consequências

- O `authorize-request` busca a chave pública no SSM e verifica assinaturas
  RS256 — sem dependência do `repo-db-infra` ou de qualquer outro
  repositório.
- A etapa de emissão de JWT do `authenticate-customer` busca a chave privada
  no Secrets Manager e assina com RS256.
- O `authenticate-customer` valida o CPF e realiza a consulta de cliente
  ativo usando o contrato de schema `Cliente` compartilhado antes de emitir
  um token.
- Resolve as decisões #2, #7 e #8 do HANDOFF.md.

## Alternativas consideradas

- **HS256 + Lambda Authorizer**: mais simples (um segredo, sem par de
  chaves), mas todo verificador futuro precisa do mesmo segredo
  compartilhado — pior encaixe para a direção de microsserviços.
- **JWT authorizer nativo (RS256 + endpoint JWKS)**: evita escrever código de
  authorizer, mas exige levantar e manter um endpoint JWKS público sem outro
  benefício nessa escala.
