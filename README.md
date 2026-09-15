# repo-auth-serverless

Tech Challenge Fase 3 — autenticação via CPF e autorização JWT serverless.

## Escopo

- `src/authenticate-customer`: valida o CPF, verifica existência/status do cliente e emite o JWT.
- `src/authorize-request`: Lambda Authorizer que valida o JWT nas rotas protegidas.

Fora de escopo: código do monólito, provisionamento de EKS, provisionamento de RDS, duplicação do schema de negócio.

A autenticação valida os dígitos verificadores do CPF, exige um cliente ativo e
retorna uma resposta genérica de não autorizado para credenciais inválidas ou
desconhecidas. Os JWTs usam RS256 estrito e expiração de 30 minutos (`1800`
segundos). O contrato emitido é explícito na resposta de autenticação e nos
outputs do Terraform: `algorithm=RS256`, `issuer` a partir de `JWT_ISSUER` (os
roots impõem `repo-auth-serverless`), `audience` a partir de `JWT_AUDIENCE`
(os roots impõem `async-furious-project`), e `subject_claim=Cliente.id`. O
`sub` do JWT é a string `Cliente.id` do cliente, nunca o CPF; o monólito deve
resolver essa identidade e reverificar o status ativo. Os verificadores devem
exigir RS256, issuer, audience e `exp`.
Os correlation IDs são retornados e propagados às requisições protegidas do
backend.

Cada ambiente provisiona alarmes nativos do CloudWatch para erros das Lambdas
de autenticação e de authorizer, além de métricas `5XXError` da HTTP API para
`/auth` e, quando configurada, a rota protegida do VPC Link. Os alarmes são
criados sem dependência de notificação, para que uma conta possa anexar suas
ações aprovadas posteriormente.

## Status

O ambiente HML aplica automaticamente a partir de `develop`; pushes para
`main` aplicam produção após a aprovação do Environment protegido
`production`. Aplicações manuais continuam disponíveis via
`workflow_dispatch` e exigem a confirmação exata de produção `APPLY PROD`. O
CI builda, testa, empacota e inclui o `dist.zip` exato no artefato salvo do
plano do Terraform; o apply baixa esse mesmo artefato antes de aplicar.

## Empacotamento e deploy

Execute `npm run package` localmente para compilar os handlers e criar um
`dist.zip` determinístico contendo apenas as dependências de produção. O
workflow usa o mesmo comando de empacotamento e artefato para um `plan` ou
`apply` selecionado manualmente em `hml` ou `prod`.

Configure os GitHub Environments `hml` e `production` com estes secrets:

- `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` do usuário IAM da conta AWS
  pessoal. `AWS_SESSION_TOKEN` é opcional e só entra se estiver preenchido.
- `JWT_PRIVATE_KEY_SECRET_ARN`.
- `SEEDED_CPF`, usado apenas pelo `auth-smoke.yml` (nunca commite nem imprima o
  CPF).

O ARN do segredo do banco não é secret do GitHub: o CI o lê do output
`db_connection_secret_arn` (ou `db_secret_arn`) no state do `repo-db-infra`
do ambiente selecionado.

O workflow usa o mesmo modelo de credenciais nos dois ambientes lógicos:
pushes para `develop` fazem deploy de HML automaticamente, enquanto produção
usa a aprovação do Environment protegido `production`. Execuções manuais
selecionam `hml` ou `prod` e uma operação. O `ci.yml` fixa
`DEPLOY_ACADEMY_MODE: "false"`, então não há alternância de modo Academy.

O dispatch manual expõe `deploy_auth_only`, que assume `false` por padrão; as
execuções de deploy de HML e produção derivam um listener de backend válido a
partir do estado correspondente do Kubernetes e sempre selecionam o caminho
completo de deployment.

As variáveis não sensíveis lidas pelo Actions são `AWS_REGION`,
`JWT_PUBLIC_KEY_PARAMETER_NAME`, `JWT_PUBLIC_KEY_PARAMETER_ARN`, `JWT_ISSUER`,
`JWT_AUDIENCE` e `JWT_EXPIRES_IN` (os três últimos travados por validação nos
roots em `repo-auth-serverless`, `async-furious-project` e `1800`). A Lambda
consome as sub-redes privadas correspondentes do state do `repo-k8s-infra` e o
security group do banco do state do `repo-db-infra`; esses IDs não devem ser
definidos como variáveis do GitHub. Variáveis opcionais são
`AUTH_LAMBDA_ROLE_ARN` e `AUTHORIZER_LAMBDA_ROLE_ARN`. Os IDs de sub-rede
privada do VPC Link, o security group do ALB interno e o
`internal_alb_listener_arn` são lidos do state remoto correspondente do
`repo-k8s-infra`; eles não são variáveis do GitHub. Nenhum ID de recurso AWS é
armazenado neste repositório.

`BACKEND_INTEGRATION_URI` é derivado durante o CI a partir do output do state
do Terraform do `repo-k8s-infra` do ambiente selecionado,
`internal_alb_listener_arn`. O workflow falha de forma segura (fail closed)
quando esse state ou output não está disponível ou não é um ARN de listener
válido. Produção também rejeita o listener HML conhecido `tc3-hml-internal`;
ela nunca faz fallback para HML ou para um deployment apenas de auth.

Na conta AWS pessoal, o Terraform cria as roles de execução das duas Lambdas.
As variáveis `AUTH_LAMBDA_ROLE_ARN` e `AUTHORIZER_LAMBDA_ROLE_ARN` continuam
opcionais, para reaproveitar roles já existentes.

O repositório mantém um caminho legado para contas AWS Academy, hoje inativo:
com `academy_mode = true`, nenhuma role, anexo ou policy inline é criado, e as
duas Lambdas passam a usar o `LAB_ROLE_ARN` informado. Essa role precisa
confiar em Lambda e já permitir acesso a CloudWatch, Secrets Manager, VPC e
SSM.

### Rotacionar as credenciais AWS com `gh`

Defina cada valor a partir de um arquivo via stdin, para o ambiente que está
sendo implantado:

```bash
gh secret set AWS_ACCESS_KEY_ID --env hml < access-key-id.txt
gh secret set AWS_SECRET_ACCESS_KEY --env hml < secret-access-key.txt
```

Repita para o ambiente `production`. Chaves de usuário IAM não expiram
sozinhas: rotacione-as quando a chave for substituída na conta, e remova o
secret antigo com `gh secret delete`. Só defina `AWS_SESSION_TOKEN` se estiver
usando credenciais temporárias; nesse caso ele precisa ser renovado a cada
sessão, junto com os outros dois.

Use `-R OWNER/REPOSITORY` com esses comandos ao executá-los fora do checkout
do repositório. Não coloque credenciais em argumentos de comando nem faça
commit dos arquivos de origem.

### State do Terraform e execução local

O Terraform roda no runner do Actions e armazena o state no bucket S3
qualificado por conta `tc3-tfstate-<account-id>`, em
`repo-auth-serverless/<environment>/terraform.tfstate`, com locking nativo do
S3. As operações normais de `plan` e `apply` fazem o bootstrap desse bucket
antes da inicialização.

As operações `destroy-plan` e `destroy` estão disponíveis para `hml` e `prod`.
Em `hml`, `destroy` exige a confirmação exata `DESTROY HML`. Em `prod`, o
destroy só é aceito em disparo manual (`ci.yml` diretamente ou `down.yml`) e
exige `DESTROY PROD`.
O preflight de destroy apenas lê o bucket e o state existentes da conta
atual. Um bucket ausente, chave ausente, objeto de zero bytes, ou state sem
nenhuma instância de recurso gerenciado é um no-op bem-sucedido. Erros de
autorização e outros erros da AWS falham a execução. O destroy nunca cria ou
altera configurações de backend, e mantém tanto o bucket quanto o objeto de
state.

As operações de destroy pulam o empacotamento da Lambda e as verificações de
entrada de JWT/banco que só se aplicam ao deploy. O Terraform ainda avalia as
variáveis obrigatórias dos roots antes de montar um grafo de destroy, então o
workflow fornece placeholders não sensíveis, com nomes claros, e desabilita
os branches de VPC/backend usados apenas no deploy. `destroy-plan` apenas
planeja; um `destroy` confirmado salva um plano de destroy e aplica esse
arquivo exato.

Para execução local, gere um `backend.hcl` não versionado para o backend S3
existente, inicialize o root selecionado e execute os comandos usuais do
Terraform. Use `infra/prod` apenas para plan/apply; execute apply somente
após revisão. Forneça as variáveis obrigatórias por meio de um arquivo tfvars
não versionado. Os valores de integração ainda necessários para um deployment
completo são o ARN do Secrets Manager da chave privada do JWT, o ARN do
segredo do banco, e o nome e ARN do parâmetro SSM da chave pública do JWT. A
rede da VPC da Lambda é lida do state remoto correspondente de K8s/DB, e
quando `deploy_auth_only=false`, o ARN do listener do ALB/NLB é fornecido como
`backend_integration_uri`. O URI de backend do API Gateway não é conhecido por
este repositório e deve ser fornecido pelo deployment de
Kubernetes/infraestrutura; deve ser um ARN de listener de ALB/NLB, não uma URL
HTTP normal. O VPC Link usa as sub-redes privadas correspondentes e o
`internal_alb_security_group_id` do state do `repo-k8s-infra` para habilitar a
rota protegida do EKS da RFC-003 e o Lambda Authorizer.
O padrão `deploy_auth_only=true` do módulo Terraform é um fallback seguro,
apenas de auth, para uso local. O padrão do workflow é `false`; a regra de
URI de backend acima garante que um deployment completo orquestrado habilite
o caminho protegido de backend.

## Workflows

| Workflow | Disparo | O que faz |
| --- | --- | --- |
| `ci.yml` | pull request, push em `develop`/`main`, manual | Validação, plan, apply e destroy |
| `up.yml` | manual | Apply de HML |
| `down.yml` | manual | Destroy de HML ou PROD, com confirmação digitada |
| `auth-smoke.yml` | manual | Apply do ambiente e smoke test: chama `POST /auth` com `SEEDED_CPF` e confere a emissão do token sem imprimi-lo |
| `trivy.yml` | push, pull request, agendado | Scan do sistema de arquivos com gate em HIGH e CRITICAL |

## Desenvolvimento local

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run package   # exige Python no PATH (scripts/package-lambda.py)
```

A assinatura do JWT e a propriedade do API Gateway seguem as RFC-003 e
RFC-006 aprovadas. O Terraform também expõe outputs do API Gateway com escopo
por ambiente: id e endpoint da API, route key de `/auth`, id do authorizer, e
valores de rota, integração, VPC Link e URI de backend protegidos quando a
integração completa está habilitada. As entradas de rede da Lambda usam os
contratos de state remoto aprovados correspondentes.
A consulta ao cliente usa o contrato de schema fixo entre repositórios:

```sql
SELECT "id", "ativo" AS "active"
FROM "Cliente"
WHERE "documento" = $1
  AND "tipo_documento" = 'CPF'
```
