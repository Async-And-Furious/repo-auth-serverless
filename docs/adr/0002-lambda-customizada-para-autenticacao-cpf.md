# ADR-0002: Autenticação via CPF implementada em AWS Lambda customizada (não Cognito)

**Status:** Aprovado — ratifica e formaliza a decisão da Spike "Avaliar Estratégia de Autenticação via CPF"

**Contexto**
A Spike anterior comparou Amazon Cognito (Opção A) e Lambda customizada (Opção B) para autenticação via CPF. O Tech Challenge (Fase 3) exige explicitamente uma **Function Serverless** que: valide o CPF, consulte existência/status do cliente na base de dados, e gere/devolva um JWT — ou seja, o próprio enunciado da atividade descreve o comportamento de uma Lambda customizada, não de um serviço de identidade gerenciado como o Cognito (que não modela "consulta a cliente existente" como parte do fluxo de emissão de token).

**Decisão**
Implementar a autenticação via CPF como uma **AWS Lambda customizada**, e não via Amazon Cognito.

**Justificativa**
- O requisito do Tech Challenge pede literalmente uma função que valida CPF, consulta cliente e emite JWT — isso é a Opção B da Spike, não a Opção A.
- CPF como identificador não é suportado nativamente pelo Cognito (exigiria atributo customizado + Lambda Trigger), o que na prática já significaria escrever lógica Lambda de qualquer forma — sem os benefícios de simplicidade do Cognito.
- O grupo já tem acesso e familiaridade com AWS Lambda via a conta de aluno (ADR-0001), reduzindo curva de aprendizado frente a configurar User Pools do Cognito.

**Trade-offs**
- O time assume 100% da responsabilidade por segurança do fluxo de auth (validação de CPF, proteção contra brute-force, rotação de segredo do JWT, expiração) — sem os recursos prontos do Cognito (MFA, hosted UI, etc.).
- Necessário gerenciar o segredo de assinatura do JWT (Secrets Manager/SSM) e garantir que a Lambda e a aplicação principal validem o token com a mesma chave/algoritmo.

**Impacto**
- Repositório novo e dedicado só para essa Lambda (ver ADR-0003).
- A aplicação principal (monólito Nest) deixa de emitir seu próprio JWT para o fluxo de CPF — passa a apenas **validar** tokens emitidos pela Lambda (reaproveitando o `JwtStrategy` já existente, desde que o segredo/algoritmo seja compartilhado).
