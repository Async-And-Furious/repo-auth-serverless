import type { APIGatewayProxyHandler } from "aws-lambda";
import { isValidCpf, normalizeCpf } from "../shared/cpf.js";
import { findClienteByDocumento } from "../shared/db.js";
import { signCustomerToken } from "../shared/jwt.js";

const GENERIC_UNAUTHORIZED_BODY = JSON.stringify({ message: "Credenciais inválidas" });

function maskCpf(cpf: string): string {
  return `***.***.***-${cpf.slice(-2)}`;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  let cpf: unknown;

  try {
    const body = JSON.parse(event.body ?? "{}") as { cpf?: unknown };
    cpf = body.cpf;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: "Corpo da requisição inválido" }) };
  }

  if (typeof cpf !== "string" || cpf.trim().length === 0) {
    return { statusCode: 400, body: JSON.stringify({ message: "CPF é obrigatório" }) };
  }

  const documento = normalizeCpf(cpf);

  if (!isValidCpf(documento)) {
    return { statusCode: 401, body: GENERIC_UNAUTHORIZED_BODY };
  }

  try {
    const cliente = await findClienteByDocumento(documento);

    if (!cliente) {
      return { statusCode: 401, body: GENERIC_UNAUTHORIZED_BODY };
    }

    const { token, expiresIn } = signCustomerToken({ sub: cliente.id, documento });

    return { statusCode: 200, body: JSON.stringify({ token, expiresIn }) };
  } catch (error) {
    console.error(`Authentication error for CPF ${maskCpf(documento)}:`, error);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno" }) };
  }
};
