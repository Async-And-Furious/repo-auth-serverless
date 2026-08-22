import type { APIGatewayProxyHandler } from "aws-lambda";
import { isValidCpf, normalizeCpf } from "../shared/cpf.js";
import { findClienteByDocumento } from "../shared/db.js";
import { signCustomerToken } from "../shared/jwt.js";

const GENERIC_UNAUTHORIZED_BODY = JSON.stringify({ message: "Credenciais inválidas" });

function correlationId(event: Parameters<APIGatewayProxyHandler>[0]): string {
  const supplied = event.headers?.["x-correlation-id"] ?? event.headers?.["X-Correlation-Id"];
  return supplied?.trim() || event.requestContext?.requestId || crypto.randomUUID();
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = correlationId(event);
  const response = (statusCode: number, body: string) => ({ statusCode, headers: { "content-type": "application/json", "x-correlation-id": requestId }, body });
  let cpf: unknown;

  try {
    const body = JSON.parse(event.body ?? "{}") as { cpf?: unknown };
    cpf = body.cpf;
  } catch {
    return response(400, JSON.stringify({ message: "Corpo da requisição inválido" }));
  }

  if (typeof cpf !== "string" || cpf.trim().length === 0) {
    return response(400, JSON.stringify({ message: "CPF é obrigatório" }));
  }

  const documento = normalizeCpf(cpf);

  if (!isValidCpf(documento)) {
    return response(401, GENERIC_UNAUTHORIZED_BODY);
  }

  try {
    const cliente = await findClienteByDocumento(documento);

    if (!cliente) {
      return response(401, GENERIC_UNAUTHORIZED_BODY);
    }

    const { token, expiresIn } = await signCustomerToken({ sub: cliente.id, documento });

    console.info(JSON.stringify({ level: "info", event: "customer_authenticated", correlation_id: requestId }));
    return response(200, JSON.stringify({ token, expiresIn }));
  } catch {
    console.error(JSON.stringify({ level: "error", event: "authentication_failed", correlation_id: requestId }));
    return response(500, JSON.stringify({ message: "Erro interno" }));
  }
};
