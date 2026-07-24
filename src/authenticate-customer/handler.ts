import type { APIGatewayProxyHandler } from "aws-lambda";

// TODO: validate CPF, query customer existence/status, issue JWT.
export const handler: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 501,
    body: JSON.stringify({ message: "not implemented" }),
  };
};
