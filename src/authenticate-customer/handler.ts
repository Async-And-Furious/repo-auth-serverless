import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrivateKey } from "../lib/keys.js";
import { jwtContract, signToken } from "../lib/jwt.js";
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

export function sanitizeErrorMessage(value: unknown): string {
  let message: string;
  try {
    message = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  } catch {
    message = "Unable to serialize error";
  }

  return message
    .replace(/(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, "[REDACTED_CONNECTION_STRING]")
    .replace(/\bBearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g, "[REDACTED_CPF]")
    .replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/\b(?:password|passwd|secret|token|authorization|api[_-]?key|private[_-]?key|database_url|connection[_-]?string)\s*[:=]\s*[^\s,;}]+/gi, "[REDACTED_CREDENTIAL]")
    .replace(/\b(?:DATABASE_URL|DATABASE_SECRET_ARN|JWT_PRIVATE_KEY_SECRET_ARN|JWT_PUBLIC_KEY_PARAM_NAME)\b/gi, "[REDACTED_CONFIG]")
    .slice(0, 1000);
}

function safeErrorName(error: unknown): string {
  const name = error instanceof Error ? error.name : error && typeof error === "object" ? error.constructor?.name : undefined;
  return typeof name === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(name) ? name : "UnknownError";
}

function log(level: "info" | "error", event: string, correlationId: string, startedAt: number, error?: unknown, requestId?: string): void {
  const record: Record<string, unknown> = {
    level,
    event,
    correlation_id: correlationId,
    duration_ms: Date.now() - startedAt,
  };
  if (requestId) record.request_id = requestId;
  if (process.env.DEPLOY_ENVIRONMENT) record.environment = process.env.DEPLOY_ENVIRONMENT;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) record.function_name = process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) record.function_version = process.env.AWS_LAMBDA_FUNCTION_VERSION;
  if (error !== undefined) {
    record.error_name = safeErrorName(error);
    record.error_message = sanitizeErrorMessage(error instanceof Error ? error.message : error);
  }
  (level === "error" ? console.error : console.log)(JSON.stringify(record));
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
    const contract = jwtContract();
    const token = signToken({ sub: String(customer.id) }, await privateKeyProvider());
    return complete(200, {
      token,
      token_type: "Bearer",
      expires_in: contract.expiresIn,
      algorithm: contract.algorithm,
      issuer: contract.issuer,
      audience: contract.audience,
      subject_claim: contract.subject,
    });
  } catch (error) {
    log("error", "authenticate_customer_failed", correlationId, startedAt, error, event.requestContext.requestId);
    return response(500, { error: "internal_error", message: "Unable to authenticate" }, correlationId);
  }
}

export async function handler(event: Pick<APIGatewayProxyEvent, "body" | "headers" | "requestContext">, _context?: unknown): Promise<APIGatewayProxyResult> {
  return authenticateCustomer(event);
}
