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

export const handler = async (
  event: AuthorizerEvent,
): Promise<APIGatewaySimpleAuthorizerResult & { context?: { correlation_id: string } }> => {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  const suppliedCorrelationId = event.headers?.["x-correlation-id"] ?? event.headers?.["X-Correlation-Id"];
  const correlationId = suppliedCorrelationId?.trim() || event.requestContext?.requestId || crypto.randomUUID();
  const token = extractBearerToken(authHeader);
  if (!token) return { isAuthorized: false, context: { correlation_id: correlationId } };

  try {
    const publicKey = await getPublicKey();
    verifyToken(token, publicKey);
    return { isAuthorized: true, context: { correlation_id: correlationId } };
  } catch {
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }
};
