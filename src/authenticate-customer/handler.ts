import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrivateKey } from "../lib/keys.js";
import { signToken } from "../lib/jwt.js";
import { findCustomer, type CustomerLookup } from "../lib/customer-repository.js";

export function normalizeCpf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cpf = value.replace(/[.\-\s]/g, "");
  if (!/^\d{11}$/.test(cpf) || new Set(cpf).size === 1) return null;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return null;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]) ? cpf : null;
}

function response(statusCode: number, body: Record<string, unknown>, correlationId: string): APIGatewayProxyResult {
  return { statusCode, headers: { "content-type": "application/json", "x-correlation-id": correlationId }, body: JSON.stringify(body) };
}

function log(level: "info" | "error", event: string, correlationId: string, startedAt: number): void {
  console.log(JSON.stringify({ level, event, correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
}

export async function authenticateCustomer(
  event: Pick<APIGatewayProxyEvent, "body" | "headers" | "requestContext">,
  lookup: CustomerLookup = findCustomer,
  privateKeyProvider: typeof getPrivateKey = getPrivateKey,
): Promise<APIGatewayProxyResult> {
  const startedAt = Date.now();
  const correlationId = (event.headers?.["x-correlation-id"] ?? event.headers?.["X-Correlation-Id"])?.trim() || event.requestContext.requestId || crypto.randomUUID();
  const complete = (statusCode: number, body: Record<string, unknown>) => {
    log(statusCode >= 500 ? "error" : "info", statusCode >= 400 ? "authenticate_customer_rejected" : "authenticate_customer_succeeded", correlationId, startedAt);
    return response(statusCode, body, correlationId);
  };
  try {
    let input: unknown;
    try {
      input = event.body ? JSON.parse(event.body) : {};
    } catch {
      return complete(400, { error: "invalid_request", message: "Request body must be valid JSON" });
    }
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return complete(400, { error: "invalid_request", message: "A valid CPF is required" });
    }
    const cpfValue = (input as { cpf?: unknown }).cpf;
    if (typeof cpfValue !== "string") return complete(400, { error: "invalid_request", message: "A valid CPF is required" });
    const cpf = normalizeCpf(cpfValue);
    if (!cpf) return complete(401, { error: "unauthorized", message: "Invalid customer credentials" });
    const customer = await lookup(cpf);
    if (!customer || !customer.active) return complete(401, { error: "unauthorized", message: "Invalid customer credentials" });
    const expiresIn = Number(process.env.JWT_EXPIRES_IN);
    const token = signToken({ sub: String(customer.id) }, await privateKeyProvider());
    return complete(200, { token, token_type: "Bearer", expires_in: expiresIn });
  } catch {
    log("error", "authenticate_customer_failed", correlationId, startedAt);
    return response(500, { error: "internal_error", message: "Unable to authenticate" }, correlationId);
  }
}

export const handler = authenticateCustomer;
