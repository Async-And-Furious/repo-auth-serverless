# ADR-0003: Lambda em repositório Git dedicado, independente do monólito

**Status:** Aprovado

**Contexto**
O Tech Challenge exige explicitamente 4 repositórios separados, cada um com seu próprio CI/CD e deploy automático, sendo o repositório 1 dedicado exclusivamente à "Lambda (Function Serverless)".

**Decisão**
Criar um repositório Git novo e independente (`repo-auth-serverless`) contendo somente o código da função de autenticação via CPF, seu pipeline de CI/CD e sua infraestrutura de deploy — sem depender do código-fonte do monólito NestJS.

**Justificativa**
- Requisito explícito do Tech Challenge.
- Ciclo de vida de deploy desacoplado: a Lambda pode ser publicada sem exigir build/release de todo o monólito.
- Reduz superfície de acesso: credenciais/pipeline da Lambda não precisam de acesso ao restante do código da aplicação.

**Trade-offs**
- Lógica de validação de CPF e de geração de JWT que hoje vive no monólito (`CpfCnpjVo`, padrão de `AuthService.generateToken`) precisa ser **duplicada ou publicada como pacote compartilhado** — decisão registrada na ADR-0005.
- Overhead de coordenação entre repositórios (ex: mudança de contrato de payload exige alinhar dois repos).

**Impacto**
- Repositório `repo-auth-serverless` criado nesta etapa.
- Necessário decidir o contrato de dados entre Lambda e banco/aplicação (ADR-0004) e a estratégia de reuso de lógica de domínio (ADR-0005).
