import type { APIGatewaySimpleAuthorizerResult } from "aws-lambda";
import { verifyToken } from "../lib/jwt.js";
import { getPublicKey } from "../lib/keys.js";

interface AuthorizerEvent {
  headers?: Record<string, string | undefined>;
  requestContext?: { requestId?: string };
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

  try {
    const publicKey = await publicKeyProvider();
    verifyToken(token, publicKey);
    console.log(JSON.stringify({ level: "info", event: "authorizer_allowed", correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
    return { isAuthorized: true, context: { correlation_id: correlationId } };
  } catch {
    console.log(JSON.stringify({ level: "info", event: "authorizer_denied", reason: "invalid_token", correlation_id: correlationId, duration_ms: Date.now() - startedAt }));
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }
};

export const handler = authorizeRequest;
