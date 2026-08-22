# ADR-0005: Reuso de regras de validação de CPF e emissão de JWT via pacote compartilhado (não duplicação manual)

**Status:** Proposto

**Contexto**
O monólito já implementa validação de CPF (`CpfCnpjVo` com `cpf-cnpj-validator`) e emissão de JWT (`AuthService.generateToken`). A Lambda, em repositório separado (ADR-0003), precisa da mesma lógica de validação e de um contrato de token compatível com o que o monólito valida hoje (`JwtStrategy`).

**Decisão**
Extrair a validação de CPF e a assinatura/claims do JWT para um **pacote npm compartilhado, versionado e publicado** (ex: pacote privado no GitHub Packages/NPM ou um repositório de "shared libs"), consumido tanto pela Lambda quanto, opcionalmente, pelo monólito.

**Justificativa**
- Evita duplicar (e divergir) a regra de validação de CPF e o formato de claims do JWT entre dois repositórios.
- Mudança de algoritmo/segredo/claims do JWT é feita em um único lugar e propagada por versão de pacote.

**Trade-offs**
- Overhead inicial de criar e publicar um pacote (setup de registry, versionamento semântico).
- **Atalho temporário adotado nesta etapa**: por restrição de prazo, a validação de CPF (algoritmo de dígito verificador) e a emissão de JWT (`jsonwebtoken`) foram implementadas de forma independente dentro deste repositório (`src/shared/cpf.ts`, `src/shared/jwt.ts`), replicando a mesma regra do monólito sem importar seu código. Isso é registrado explicitamente como **débito técnico**: risco de divergência futura entre as duas implementações de validação de CPF caso uma seja alterada sem replicar na outra.

**Impacto**
- Definir localização do pacote compartilhado e processo de publish antes da próxima iteração, para eliminar a duplicação atual.
