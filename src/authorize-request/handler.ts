import type { APIGatewaySimpleAuthorizerResult } from "aws-lambda";

// TODO: validate JWT signature, expiration, claims.
export const handler = async (): Promise<APIGatewaySimpleAuthorizerResult> => {
  return { isAuthorized: false };
};
