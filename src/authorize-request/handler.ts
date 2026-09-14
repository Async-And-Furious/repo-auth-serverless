import type { APIGatewaySimpleAuthorizerResult } from "aws-lambda";
import { verifyToken } from "../lib/jwt.js";
import { getPublicKey } from "../lib/keys.js";

interface AuthorizerEvent {
  headers?: Record<string, string | undefined>;
  requestContext?: { requestId?: string };
}

function exceptionDetails(error: unknown): { exception_name: string; exception_message: string } {
  const exceptionName = error instanceof Error ? error.name : typeof error;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const sanitizedMessage = rawMessage
    .replace(/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g, "[REDACTED_CPF]")
    .replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[REDACTED_KEY]")
    .replace(/arn:aws[^\s,)}]+/gi, "[REDACTED_ARN]")
    .replace(/\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+/g, "[REDACTED_PARAMETER]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return { exception_name: exceptionName.slice(0, 80), exception_message: sanitizedMessage };
}

export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) return null;
  const fields = authHeader.trim().split(/\s+/);
  return fields.length === 2 && fields[0].toLowerCase() === "bearer" && fields[1] ? fields[1] : null;
}

export const authorizeRequest = async (
  event: AuthorizerEvent,
  publicKeyProvider: typeof getPublicKey = getPublicKey,
): Promise<APIGatewaySimpleAuthorizerResult & { context?: { correlation_id: string } }> => {
  const startedAt = Date.now();
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  const suppliedCorrelationId = event.headers?.["x-correlation-id"] ?? event.headers?.["X-Correlation-Id"];
  const correlationId = suppliedCorrelationId?.trim() || event.requestContext?.requestId || crypto.randomUUID();
  const token = extractBearerToken(authHeader);
  if (!token) {
    console.log(JSON.stringify({ level: "info", event: "authorizer_denied", reason: "missing_bearer", correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }

  let publicKey: string;
  try {
    publicKey = await publicKeyProvider();
  } catch (error) {
    console.log(JSON.stringify({ level: "error", event: "authorizer_denied", reason: "invalid_token", failure_stage: "key_fetch", ...exceptionDetails(error), correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }

  try {
    verifyToken(token, publicKey);
    console.log(JSON.stringify({ level: "info", event: "authorizer_allowed", correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
    return { isAuthorized: true, context: { correlation_id: correlationId } };
  } catch (error) {
    console.log(JSON.stringify({ level: "error", event: "authorizer_denied", reason: "invalid_token", failure_stage: "jwt_verification", ...exceptionDetails(error), correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }
};

export const handler = async (event: AuthorizerEvent) => authorizeRequest(event, getPublicKey);
