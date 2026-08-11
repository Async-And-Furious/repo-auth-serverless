# ADR-0004: Acesso da Lambda à base de dados — conexão direta ao Postgres gerenciado

**Status:** Aprovado

**Contexto**
A Lambda precisa "consultar a existência e o status do cliente na base de dados". O Tech Challenge prevê um repositório próprio de "Infraestrutura do Banco de Dados Gerenciado" (`repo-db-infra`) — ou seja, o banco (RDS Postgres) é um recurso de infraestrutura compartilhado entre a Lambda e a aplicação principal, não algo interno ao monólito.

**Decisão**
A Lambda conecta-se **diretamente** ao banco de dados gerenciado (RDS Postgres) para consultar `Cliente` por `documento` (CPF), em vez de fazer uma chamada HTTP à aplicação principal. Implementada com um client `pg` leve (não Prisma completo), fora de VPC — RDS com endpoint público, protegido por Security Group restrito.

**Justificativa**
- Evita acoplar a disponibilidade do login à disponibilidade do cluster Kubernetes da aplicação principal — login continua funcionando mesmo se o monólito estiver degradado.
- Menor latência (uma chamada a menos na cadeia).
- É o padrão mais comum em arquiteturas serverless de autenticação (a função de auth acessa a fonte de verdade diretamente).

**Trade-offs**
- Exige que a Lambda tenha acesso de rede ao RDS. Como a conta só oferece a **role padrão do laboratório** (ADR-0001), a Lambda **não pode ter uma IAM Role própria com as permissões de rede (`ec2:CreateNetworkInterface` etc.) criadas sob medida**. Rodar a Lambda dentro de uma VPC é inviável na conta acadêmica, então a alternativa adotada é acessar o RDS **fora de VPC** (endpoint público, credencial protegida por Security Group restrito ao range de IPs autorizados) — solução aceitável apenas neste contexto educacional, não recomendada em produção real.
- Lambda fora de VPC evita o overhead de ENI attachment no cold start, mas o RDS público exige disciplina extra de Security Group.
- Acoplamento de schema: qualquer mudança na tabela `Cliente` (nome de coluna, tipo) precisa ser replicada no client de banco usado pela Lambda.
- Sem Secrets Manager: a `LabRole` não pode ser ampliada com `secretsmanager:GetSecretValue` sob medida, então a credencial do banco é passada via variável de ambiente da Lambda (menos seguro, aceito neste contexto educacional).

**Impacto**
- A Lambda usa um client Postgres leve (`pg`), não Prisma completo, para reduzir tamanho do pacote e cold start.
- Credencial de conexão ao banco via variável de ambiente (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), nunca hardcoded ou commitada.
- `repo-db-infra` provê o RDS com endpoint público e Security Group como saída consumível por este repositório.
