# RFC-008: Escolha do cloud provider (AWS)

- **Status**: Aceita (retroativa). **Parcialmente desatualizada** quanto ao
  tipo de conta AWS — ver nota abaixo.
- **Data**: 2026-09-14
- **Resolve**: requisito do Tech Challenge Fase 3 ("Documentação da
  Arquitetura" → RFCs para decisões técnicas relevantes, citando
  explicitamente "escolha da nuvem" como exemplo) e issue
  [#180](https://github.com/Async-And-Furious/async-furious-project/issues/180)
- **Fonte da verdade**: este arquivo, em `async-furious-project`. Cópia
  deve existir em `repo-k8s-infra`, `repo-db-infra` e
  `repo-auth-serverless` para visibilidade local (atualizar aqui primeiro,
  depois sincronizar).

## Nota de atualização (2026-09-15)

A escolha do provedor (**AWS**) continua válida e não é afetada por esta
nota. O que mudou foi o **tipo de conta**: este arquivo descreve a AWS
Academy Learner Lab (`LabRole`, credenciais de sessão temporárias vindas do
laboratório) como base de toda a análise de consequências e riscos abaixo.
O commit `6797d5f` (15/09/2026, `docs: registrar conta AWS pessoal no free
tier em vez de AWS Academy`) documenta que os ambientes passaram a rodar
numa **conta AWS pessoal, no free tier**, autenticada com credenciais de
usuário IAM permanentes (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, sem
`AWS_SESSION_TOKEN` em uso normal, sem OIDC) — ver
[`docs/infrastructure/aws.md`, seção 10](../infrastructure/aws.md#10-conta-aws)
em `async-furious-project`.
Esse commit já corrigiu ADR-0004, ADR-0005, `aws.md`, `cicd.md` e o runbook
de setup no repositório principal, mas não este arquivo.

Isso invalida partes concretas do texto abaixo:

- **Consequências negativas**: "`LabRole` fixa e sem permissão de anexar
  policies novas" e "credenciais de sessão temporárias... não sobrevivem ao
  encerramento do laboratório" não se aplicam mais. Os módulos hoje criam
  suas próprias roles IAM (cluster/nós EKS, IRSA do Load Balancer
  Controller, roles de execução das Lambdas).
- **Riscos**: o risco "Alto" de a conta do AWS Academy expirar com a
  matrícula do curso não existe na conta pessoal. O risco "Médio" de sessão
  do Learner Lab expirar também não se aplica a credenciais IAM permanentes.
- Os três repositórios de infraestrutura ainda carregam um caminho de
  código alternativo para modo Academy (`aws_academy`, `manage_iam`,
  `lab_role_arn`, `academy_mode`), hoje inativo por padrão — resquício, não
  a configuração em uso.

**O que não muda**: a justificativa de escolher AWS em vez de GCP/Azure (seção
"Contexto" e "Alternativas consideradas") não depende do tipo de conta, só
da disponibilidade de acesso gratuito. Isso continua válido para a leitura
histórica da decisão.

## Contexto

O enunciado da Fase 3 lista a infraestrutura obrigatória (API Gateway,
Function Serverless, banco gerenciado, cluster Kubernetes, Terraform) como
"livre escolha de nuvem", nenhum provedor é exigido pelo curso.

Mesmo com a escolha nominalmente livre, a AWS já era a única opção com uma
conta pronta e sem custo: o curso (FIAP) disponibiliza acesso ao **AWS
Academy Learner Lab** para os alunos. GCP e Azure também oferecem camadas
gratuitas para estudantes (Google Cloud for Education, Azure for
Students), mas nenhuma delas vem provisionada pelo curso, exigiriam que o
grupo criasse e configurasse uma conta própria em outro provedor, sem
necessidade concreta que justificasse o esforço.

Não há, em nenhum ADR/RFC anterior deste projeto ou dos três repositórios
satélite (`repo-k8s-infra`, `repo-db-infra`, `repo-auth-serverless`), um
comparativo formal entre AWS, GCP e Azure. A decisão foi tomada antes da
Fase 3 começar a ser documentada: ADR-0002 (autenticação via API Gateway +
Function Serverless) e ADR-0003 (Kubernetes/EKS) já assumem AWS como
premissa, sem justificar a escolha do provedor em si.

## Decisão

Adotar a **AWS**, via conta do **AWS Academy Learner Lab**, como provedor
de nuvem único para toda a infraestrutura da Fase 3:

- **AWS API Gateway**: roteamento e proteção de rotas sensíveis
  (`repo-auth-serverless`).
- **AWS Lambda**: Function Serverless de autenticação via CPF
  (`repo-auth-serverless`).
- **Amazon EKS**: cluster Kubernetes gerenciado, com o mesmo conjunto de
  manifests `/k8s` usado localmente em `kind` (`repo-k8s-infra`, ver
  ADR-0003 de `async-furious-project`).
- **Amazon RDS for PostgreSQL**: banco de dados gerenciado
  (`repo-db-infra`, ver `database-justification.md` em
  `async-furious-project`).
- **Terraform com provider `aws`**: provisionamento de todos os itens
  acima, em todos os quatro repositórios.

## Alternativas consideradas

Nenhuma foi avaliada com rigor técnico. A decisão nasceu da
disponibilidade da conta, não de uma comparação de recursos. Registro
aqui apenas para deixar a lacuna explícita, em vez de omitida:

- **Google Cloud Platform**: equivalentes diretos existem para todos os
  itens obrigatórios (API Gateway, Cloud Functions, GKE, Cloud SQL). Sem
  conta gratuita pronta fornecida pelo curso, exigiria cadastro e cartão
  de crédito para sair do trial padrão do Google Cloud.
- **Microsoft Azure**: mesma situação (API Management, Azure Functions,
  AKS, Azure Database for PostgreSQL), sem conta provisionada pelo curso.
- **Multi-cloud**: descartado sem análise. Nenhuma vantagem aparente para
  a escala de um projeto acadêmico de um único cluster/banco, e custo de
  coordenação adicional (rede entre provedores, autenticação cruzada) sem
  benefício correspondente.

## Consequências positivas

- Custo zero: conta acadêmica sem necessidade de cartão de crédito.
- Cobertura nativa de 1:1 para todos os itens obrigatórios do enunciado
  (API Gateway, Function Serverless, banco gerenciado, Kubernetes,
  Terraform), sem precisar combinar serviços de provedores diferentes.
- Um único conjunto de credenciais e providers Terraform (`aws`) em todos
  os quatro repositórios.

## Consequências negativas

- **`LabRole` fixa e sem permissão de anexar policies novas**: já forçou
  pelo menos uma mudança de arquitetura registrada (RFC-007: RDS público
  em vez de dentro da VPC, porque a `LabRole` não pode receber permissões
  de VPC/ENI necessárias para a Lambda acessar o banco dentro da rede
  privada).
- **Credenciais de sessão temporárias**: `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN` vêm de uma sessão do AWS
  Academy (ver `docs/runbooks/aws-setup.md` em `async-furious-project`),
  não de um usuário IAM permanente, precisam ser renovadas periodicamente
  e não sobrevivem ao encerramento do laboratório.
- **Sem controle de billing/quotas**: a conta é gerenciada pelo curso, sem
  visibilidade ou ajuste de limites de serviço pelo grupo.
- Ausência de comparação formal significa que trade-offs de custo/recursos
  de GCP e Azure para este caso de uso nunca foram de fato explorados.

## Riscos

- **Alto**: a conta do AWS Academy é ligada à matrícula do curso. Se o
  acesso expirar (fim do módulo/curso) antes da entrega final, toda a
  infraestrutura provisionada (EKS, RDS, Lambda, API Gateway) fica
  inacessível sem migração para uma conta AWS real.
- **Médio**: sessões do Learner Lab têm duração limitada; pipelines de
  CI/CD que dependem de credenciais válidas podem falhar se disparados
  fora de uma sessão ativa (mitigado hoje por renovação manual via
  `scripts/aws_lab.py`, conforme `docs/runbooks/aws-setup.md`).

## Referências

- Tech Challenge Fase 3 (PDF do enunciado), seção "Infraestrutura
  obrigatória (livre escolha de nuvem)" e "Documentação da Arquitetura"
- ADR-0002 (`async-furious-project`): autenticação via API Gateway + Function Serverless
- ADR-0003 (`async-furious-project`): Kubernetes/EKS
- RFC-007 (`async-furious-project`): impacto da `LabRole` no
  desenho de rede do RDS
- `docs/runbooks/aws-setup.md` (`async-furious-project`): credenciais
  de sessão do AWS Academy
