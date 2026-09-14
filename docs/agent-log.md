# Log do agente

## 2026-09-11 — Diagnóstico seguro de falhas de autenticação

- Adicionados campos estruturados de erro em `authenticate_customer_failed`,
  incluindo nome seguro do erro, mensagem redigida, IDs de correlação/request
  e contexto de deployment da Lambda disponível. Corpos de requisição,
  valores de CPF, tokens, senhas, connection strings e segredos continuam
  excluídos dos logs.
- Adicionada cobertura de redação de falhas de DB e JWT preservando a
  resposta genérica HTTP 500. Validação aprovada: testes focados (11), suíte
  completa (32), typecheck e build. Nenhum apply ou destroy da AWS foi
  executado.

## 2026-09-09 — Backend de state remoto do Kubernetes para o listener

- O CI agora lê o `internal_alb_listener_arn` de HML/produção selecionado
  diretamente do state do Terraform correspondente do `repo-k8s-infra`,
  valida o ARN do listener e falha de forma segura quando o state ou o
  output não está disponível.
- Preservada a rejeição em produção do listener de HML conhecido. Nenhum
  apply ou destroy da AWS foi executado.

## 2026-09-04 — Rede via state remoto do VPC Link do API Gateway

- HML e produção agora consomem `private_subnet_ids` e
  `internal_alb_security_group_id` do state correspondente do
  `repo-k8s-infra` para o VPC Link privado do API Gateway. Removidas as
  entradas vazias de VPC Link do GitHub; a integração existente por ARN de
  listener do ALB e a rota privada permanecem inalteradas.
- Nenhum apply ou destroy da AWS foi executado.

## 2026-09-04 — Rede da Lambda via state remoto

- Removidas as entradas de sub-rede/security group do GitHub, incluindo o
  tratamento obsoleto de sub-rede de HML que causava falhas no plan do
  Terraform.
- HML e produção agora leem as sub-redes privadas correspondentes do state
  do `repo-k8s-infra` e o security group do banco do state do
  `repo-db-infra`. Nenhum apply ou destroy da AWS foi executado.

## 2026-09-04 — Workflow explícito de destroy de produção

- Adicionado destroy de produção apenas via dispatch, com o Environment
  protegido `production` e a confirmação exata `DESTROY PROD`.
- Mantidos o comportamento de destroy de HML, o backend de state e os
  segredos externos de JWT/banco inalterados; os placeholders do Terraform
  usados apenas em destroy são usados sem excluir esses recursos externos.
  Nenhum destroy foi executado.

## 2026-08-31 — Workflow Academy e artefato exato da Lambda

- Atualizadas a documentação e a cobertura de contrato do workflow para o
  workflow de HML/produção sempre-Academy e suas referências reais de
  credenciais.
- Incluído o `dist.zip` junto com o artefato de plano salvo do Terraform e
  seu download na raiz do repositório antes de aplicar o plano exato.
- Nenhuma ação AWS, commit ou push foi realizado.

## 2026-08-31 — Contrato de conexão TLS do RDS

- Adicionado `sslmode=require` ao fallback de detalhes de conexão do
  Secrets Manager da Lambda, alinhando com o contrato de deployment
  `force_ssl=1` do RDS.
- Adicionada cobertura focada para o fallback preservando o carregamento
  existente de segredo e o comportamento explícito de `DATABASE_URL`.
  Nenhuma ação AWS foi executada.

## 2026-08-31 — Guard de push de produção e observabilidade de rota

- Limitada a checagem de confirmação de produção a dispatches manuais para
  que pushes automáticos para `main` possam fazer deploy após o gate do
  Environment protegido `production`; o apply manual de produção ainda
  exige `APPLY PROD`.
- Adicionados alarmes nativos do CloudWatch para erro de Lambda e 5xx de
  rota do API Gateway aos dois ambientes do Terraform, incluindo a rota
  opcional do VPC Link.
- Nenhum commit, push, apply ou destroy da AWS foi executado.

## 2026-08-30 — Contrato explícito de consumidor do JWT

- Adicionados metadados de contrato do JWT em nível de código e validação de
  subject. `/auth` agora emite algorithm, issuer, audience, expiry e
  semântica de subject `Cliente.id`; os outputs do Terraform de
  HML/produção expõem o mesmo contrato.
- Adicionados testes de contrato e de subject. Nenhum apply/destroy da AWS,
  commit ou push foi realizado.

## 2026-08-30 — Alvo confirmado de entrega da auth

- Atualizado o workflow de auth para que as mesmas credenciais temporárias
  do AWS Academy possam servir HML e produção, com state/config/artefatos
  separados por ambiente.
- Preservados a entrega automática de HML em `develop`, a aprovação
  protegida de produção em `main`, e as operações destrutivas manuais
  restritas a HML.
- Reconciliados os outputs de rota/integração do API Gateway e atualizada a
  documentação obsoleta de RFC e de setup da AWS sem adicionar wiring entre
  repositórios não suportado.
- Adicionados testes de workflow e de Bearer malformado. Nenhum apply/destroy
  da AWS, commit ou push foi realizado.

## 2026-08-10

- Implementados validação de CPF, consulta de cliente no PostgreSQL,
  checagem de status ativo, emissão RS256, respostas estruturadas e testes.
- Adicionado Terraform de HML para as duas Lambdas, IAM, logs, referências
  em runtime de Secrets Manager/SSM, rota de auth da HTTP API, e rota
  protegida opcional de VPC Link da RFC-003.
- Validação: `npm test`, `npm run typecheck`, `npm run build` e
  `terraform validate` foram aprovados. Nenhum apply do Terraform foi
  executado.

## 2026-08-13 — Contrato de consulta de CPF

- Um pull fast-forward-only confirmou que os quatro repositórios
  `Async-And-Furious` já estavam alinhados com seus branches upstream;
  repositórios de comparação não foram tocados.
- Alinhada a consulta de cliente com o schema da aplicação: `"Cliente"`,
  `documento`, `tipo_documento = 'CPF'` e `ativo AS active`.
- Removido o override de SQL em runtime e adicionada cobertura focada para
  ativo, inativo, ausente e contrato de query.
- Validação aprovada: 12 testes, typecheck, lint, build,
  `git diff --check`, e uma verificação de contrato descartável em
  PostgreSQL 16 cobrindo status de CPF e exclusão de CNPJ.
- Nenhum commit, push, mutação AWS, apply do Terraform ou ação de produção
  foi executado.

## 2026-08-15 — Workflow de CI/CD

- Adicionados empacotamento determinístico da Lambda e um workflow manual
  de Terraform apoiado em OIDC para HML e produção com gates de GitHub
  Environment.
- O apply de produção nunca é disparado por pushes; está disponível apenas
  como entrada manual explícita do workflow.

## 2026-08-16 — Roles de execução de Lambda existentes

- Adicionadas variáveis opcionais de ARN de role de execução de HML/produção
  para a Lambda e o authorizer, para AWS Academy/Lab. Roles fornecidas
  ignoram a criação de role IAM e os recursos de policy do Terraform;
  valores vazios mantêm a criação gerenciada de role.
- Conectadas as variáveis não sensíveis do GitHub Environment ao workflow e
  documentados os comandos `gh variable set` e a ressalva de permissões do
  LabRole.
- A validação ficou a cargo do orquestrador; nenhum apply do Terraform foi
  executado.

## 2026-08-23 — Contrato de JWT entre repositórios

- Padronizados os tokens da Lambda em `sub=Cliente.id`, RS256, issuer
  `repo-auth-serverless`, audience `async-furious-project` e 1800 segundos;
  claims brutas de CPF/documento não são mais emitidas.
- O consumidor no monólito deve resolver o `sub` por `Cliente.id` e status
  ativo.
- Nenhum apply da AWS ou do Terraform foi executado. Os parâmetros de SSL da
  conexão Lambda-PostgreSQL permanecem como follow-up operacional porque a
  política de CA/SSL do RDS implantado não é conhecida.

## 2026-08-24 — Compatibilidade com AWS Academy

- Adicionadas entradas explícitas `academy_mode` e `lab_role_arn`
  obrigatórias ao Terraform de HML e produção. O modo Academy reutiliza a
  role existente para as duas Lambdas e pula todos os recursos de role IAM,
  attachment e policy inline.
- Adicionados dispatch de workflow e wiring de ambiente para o modo Academy;
  ele exige credenciais temporárias e não faz fallback para GitHub OIDC.
  Atualizado o README com os valores de integração obrigatórios e as
  ressalvas de permissões de role.
- Validação aprovada: lint, typecheck, 19 testes, build, formatação do
  Terraform e `terraform validate` para HML e produção. Nenhum apply do
  Terraform foi executado.

## 2026-08-24 — Contrato do workflow de deploy de auth

- Adicionada a entrada explícita de dispatch `deploy_auth_only` e exportado
  `TF_VAR_deploy_auth_only` com a regra de segurança de URI de backend: um
  `BACKEND_INTEGRATION_URI` configurado sempre seleciona o deployment
  completo.
- Documentada a seleção de auth-only/deployment completo e mantida a
  reutilização do LabRole do Academy sem criação de recursos IAM. Nenhum
  apply do Terraform foi executado.

## 2026-08-24 — State do Terraform no HCP Terraform

- Migrados os roots de HML e produção para o backend remoto do HCP Terraform
  com execução local e workspaces apenas de state
  `tc3-auth-hml`/`tc3-auth-prod`.
- Adicionado o mapeamento `TF_API_TOKEN` do GitHub; as credenciais do AWS
  Academy continuam como secrets do GitHub e não são configuradas no HCP
  Terraform. Nenhum apply do Terraform foi executado.

## 2026-08-24 — Inicialização do backend do HCP Terraform

- Configurados a organização do HCP Terraform e os nomes estáticos dos
  workspaces de HML/produção em cada root do Terraform.
- Simplificada a inicialização do workflow para usar a configuração de
  backend do root; o tratamento de credenciais do Academy permanece
  inalterado. Nenhum apply do Terraform foi executado.

## 2026-08-24 — Execução local com backend remoto

- Substituído o tratamento de variáveis/artefato de plano do Terraform no
  workflow por um `terraform.auto.tfvars.json` temporário; o plan agora roda
  sem `-out` e o apply é executado diretamente. HML, produção, credenciais
  do Academy e o tratamento de TF_TOKEN permanecem inalterados. Nenhum apply
  do Terraform foi executado.

## 2026-08-26 — Workflow de apply direto

- Divididos o plan e o apply manuais do Terraform em jobs separados. O apply
  agora roda após a validação sem uma etapa de plan, mantendo o backend
  remoto e o tratamento de credenciais do Academy. Nenhum apply do Terraform
  foi executado.

## 2026-08-29 — Contrato de deployment de HML/produção

- HML agora aplica automaticamente a partir de `develop`; produção continua
  sendo um apply manual com Environment protegido e um guard de confirmação
  explícito.
- Adicionadas checagens de preflight de credenciais e de state do Terraform,
  rejeição de Academy em produção, e um job de apply protegido que baixa e
  aplica o artefato de plano exato enviado.
- Adicionada cobertura de contrato de segurança para emissão RS256 de
  cliente ativo e decisões do authorizer, além de logs estruturados de
  sucesso/erro seguros para correlação.
- Validação executada localmente; nenhum comando AWS, apply ou destroy do
  Terraform foi executado.

## 2026-09-03 — Guard do listener de backend de produção

- Produção agora exige seu `BACKEND_INTEGRATION_URI` com escopo de ambiente
  e rejeita o listener de HML conhecido `tc3-hml-internal`, em vez de
  cruzar o wiring da integração do API Gateway. A entrada continua sendo o
  ARN de listener aprovado, vindo do state correspondente do
  `repo-k8s-infra`; nenhum atalho de state remoto ou tratamento de segredo
  foi adicionado. Nenhum apply do Terraform foi executado.
