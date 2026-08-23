# ADR-0001: Uso da AWS como provedor de nuvem para a Function Serverless

**Status:** Aprovado

**Contexto**
O Tech Challenge permite livre escolha de nuvem. O grupo tem acesso a contas de nuvem via **login de aluno da FIAP** (AWS Academy/Educate), o que fornece créditos e acesso já provisionado à AWS sem necessidade de cartão de crédito pessoal ou setup de billing próprio.

**Decisão**
Utilizar **AWS** como provedor de nuvem para a Function Serverless (e, por consequência, como candidato natural para os demais componentes de infraestrutura do Tech Challenge — API Gateway, banco gerenciado, Kubernetes — ainda que essa decisão para os outros repositórios seja formalizada em ADRs próprias).

**Justificativa**
- Acesso já disponibilizado pela instituição (FIAP), eliminando custo e fricção de criação de conta.
- Equipe já tem exposição a AWS Lambda/API Gateway pelo conteúdo do curso.
- AWS Lambda é o serviço serverless mais maduro e documentado do mercado, reduzindo risco de implementação sob prazo apertado do Tech Challenge.

**Trade-offs**
- **Confirmado**: a conta de aluno (AWS Academy/Educate) só disponibiliza a **role padrão do laboratório** (ex: `LabRole`/`voclabs`) — não é possível criar roles ou policies IAM customizadas. Toda decisão de permissão da Lambda precisa se resolver dentro do que essa role já permite, não através de novas policies.
- Sessão de credenciais com expiração (tipicamente ~4h), o que impede o uso de OIDC/roles assumidas de longa duração no pipeline de CD — a automação de deploy terá uma dependência manual de renovação de credenciais.
- Região tipicamente fixa (ex: `us-east-1`) e limite de orçamento (créditos do laboratório) — validar limites antes de provisionar recursos como RDS/VPC.

**Impacto**
- Todo o desenho técnico do repositório da Lambda assume AWS (SDK, IAM, CLI, SAM/Terraform provider `aws`).
