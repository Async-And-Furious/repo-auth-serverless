import type { APIGatewaySimpleAuthorizerResult } from "aws-lambda";
import { verifyToken } from "../lib/jwt.js";
import { getPublicKey } from "../lib/keys.js";

interface AuthorizerEvent {
  headers?: Record<string, string | undefined>;
}

export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

export const handler = async (
  event: AuthorizerEvent,
): Promise<APIGatewaySimpleAuthorizerResult> => {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  const token = extractBearerToken(authHeader);
  if (!token) return { isAuthorized: false };

  try {
    const publicKey = await getPublicKey();
    verifyToken(token, publicKey);
    return { isAuthorized: true };
  } catch {
    return { isAuthorized: false };
  }
};
