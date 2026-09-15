# Pré-requisitos de setup da AWS

Este runbook antes mantinha uma cópia por repositório do handoff de setup de
conta. As quatro cópias divergiram entre si e todas descreviam infraestrutura
que não existe mais (um provedor OIDC do GitHub e uma role IAM criada
manualmente, um bucket `tc3-terraform-state` provisionado manualmente com uma
tabela DynamoDB `tc3-terraform-locks`, workspaces do HCP Terraform e
`TF_API_TOKEN`, e um gate de aprovação `hml-apply`).

Os documentos canônicos e atuais vivem na raiz do workspace:

- `HANDOFF-AWS-SETUP.md` — o que uma pessoa configura, por caminho (AWS
  Academy ou uma conta real com OIDC), e o que o pipeline provisiona por
  conta própria.
- `AWS_HML_RUNBOOK.md` — o procedimento do operador, os gates, e o uso do
  `scripts/aws_lab.py`.

Versão resumida para este repositório: o state do Terraform é S3 em
`tc3-tfstate-<account-id>` com locking nativo do S3, feito o bootstrap pelo
`.github/scripts/bootstrap-backend.sh` dentro do workflow. Nada relativo ao
backend de state é provisionado manualmente. Os mesmos valores da sessão do
AWS Academy podem ser rotacionados para os GitHub Environments `hml` e
`production` (protegido) no início de cada sessão de laboratório. `develop`
aplica HML automaticamente; `main` aplica produção somente após a aprovação
do Environment protegido. Ações destrutivas continuam manuais e restritas a
HML.
