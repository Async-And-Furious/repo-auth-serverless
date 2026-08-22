import type { APIGatewayRequestAuthorizerEvent, APIGatewaySimpleAuthorizerWithContextResult } from "aws-lambda";
import { verifyToken } from "../shared/jwt.js";

function extractToken(event: APIGatewayRequestAuthorizerEvent): string | undefined {
  const authHeader =
    event.headers?.Authorization ?? event.headers?.authorization ?? undefined;

  if (!authHeader) {
    return undefined;
  }

  const fields = authHeader.trim().split(/\s+/);
  return fields.length === 2 && fields[0].toLowerCase() === "bearer" && fields[1] ? fields[1] : undefined;
}

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewaySimpleAuthorizerWithContextResult<{ correlation_id: string }>> => {
  const suppliedCorrelationId = event.headers?.["x-correlation-id"] ?? event.headers?.["X-Correlation-Id"];
  const correlationId = suppliedCorrelationId?.trim() || event.requestContext?.requestId || crypto.randomUUID();
  const token = extractToken(event);

  if (!token) {
    console.warn(JSON.stringify({ level: "warn", event: "authorization_denied", correlation_id: correlationId }));
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }

  try {
    await verifyToken(token);
    console.info(JSON.stringify({ level: "info", event: "request_authorized", correlation_id: correlationId }));
    return { isAuthorized: true, context: { correlation_id: correlationId } };
  } catch {
    console.error(JSON.stringify({ level: "error", event: "authorization_error", correlation_id: correlationId }));
    console.warn(JSON.stringify({ level: "warn", event: "authorization_denied", correlation_id: correlationId }));
    return { isAuthorized: false, context: { correlation_id: correlationId } };
  }
};
