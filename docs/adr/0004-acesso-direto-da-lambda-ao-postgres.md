# ADR-0004: Acesso da Lambda à base de dados — conexão direta ao Postgres gerenciado

**Status:** Aprovado

## Contexto

A Lambda precisa consultar a existência e o status do cliente na base de dados.
O banco (RDS PostgreSQL) é um recurso gerenciado e compartilhado entre a
Lambda e a aplicação principal, provisionado pelo repositório de infraestrutura
do banco.

## Decisão atual

A Lambda conecta-se diretamente ao RDS PostgreSQL para consultar `Cliente` por
`documento` (CPF), usando um client `pg` leve. A Lambda executa dentro da VPC,
e o banco permanece em sub-redes privadas, com acesso limitado pelos grupos de
segurança. A string de conexão é obtida do AWS Secrets Manager por meio de
`DATABASE_SECRET_ARN`; nenhum segredo é armazenado no código ou no repositório.

### Atualização (Fase 4, Feature #315)

O `repo-db-infra` passou a publicar um secret e um banco por serviço. O CI
continua lendo `db_connection_secret_arn` e `db_name` do remote state, que
agora apontam para o secret `tc3-db-os-<env>` e o banco `os_service` do OS
Service. A role do OS é dona da tabela `cliente`, então o `SELECT` do login
funciona. A policy `secretsmanager:GetSecretValue` já é escopada a
`var.database_secret_arn`, portanto passa a cobrir só o secret do OS, sem
mudança de código. O Lambda nunca usa o master. **Dívida:** role somente
leitura dedicada ao Lambda (hoje ele usa a credencial de escrita do OS).
**Ordem em HML:** `db-infra apply`, depois o deploy do OS (Job de bootstrap) e
só então o login por CPF volta a funcionar.

## Justificativa

- Evita acoplar a disponibilidade do login à disponibilidade do cluster
  Kubernetes da aplicação principal.
- Mantém o banco privado e centraliza a proteção e rotação da credencial no
  Secrets Manager.
- O client `pg` reduz o tamanho do pacote e o cold start em comparação com um
  ORM completo.

## Contexto histórico e trade-offs

Uma versão anterior deste ADR descrevia Lambda fora da VPC, RDS com endpoint
público e credenciais em variáveis de ambiente, como uma concessão para a conta
acadêmica. Essa alternativa foi superada pela decisão atual e não representa o
estado aprovado.

O acesso direto mantém acoplamento ao schema: mudanças na tabela `Cliente`
precisam ser refletidas no repositório. A execução em VPC exige sub-redes,
grupos de segurança e permissões de rede adequados para a role da Lambda.

## Impacto

- `repo-db-infra` fornece o RDS privado, a conectividade de rede e o segredo
  consumido por este repositório.
- A infraestrutura deste repositório concede à role da Lambda apenas o acesso
  necessário ao segredo e à rede, conforme a configuração aprovada.
- Não há evidência de deployment registrada por este ADR; ele documenta a
  arquitetura aprovada.
