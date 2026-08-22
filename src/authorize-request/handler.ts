import type { APIGatewayRequestAuthorizerEvent, APIGatewaySimpleAuthorizerResult } from "aws-lambda";
import { verifyToken } from "../shared/jwt.js";

function extractToken(event: APIGatewayRequestAuthorizerEvent): string | undefined {
  const authHeader =
    event.headers?.Authorization ?? event.headers?.authorization ?? undefined;

  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewaySimpleAuthorizerResult> => {
  const token = extractToken(event);

  if (!token) {
    return { isAuthorized: false };
  }

  try {
    verifyToken(token);
    return { isAuthorized: true };
  } catch {
    return { isAuthorized: false };
  }
};
