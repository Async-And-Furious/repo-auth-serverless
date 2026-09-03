import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const secretsClient = new SecretsManagerClient({});
const ssmClient = new SSMClient({});

// Cached for the lifetime of the Lambda execution context — avoids a
// Secrets Manager/SSM round trip on every invocation (RFC-006).
let cachedPrivateKey: string | undefined;
let cachedPublicKey: string | undefined;

export async function getPrivateKey(): Promise<string> {
  if (cachedPrivateKey) return cachedPrivateKey;

  const secretId = process.env.JWT_PRIVATE_KEY_SECRET_ARN;
  if (!secretId) {
    throw new Error("JWT_PRIVATE_KEY_SECRET_ARN is not set");
  }

  const result = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  if (!result.SecretString) {
    throw new Error("JWT private key secret has no SecretString");
  }

  cachedPrivateKey = result.SecretString;
  return cachedPrivateKey;
}

export async function getPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  const name = process.env.JWT_PUBLIC_KEY_PARAM_NAME;
  if (!name) {
    throw new Error("JWT_PUBLIC_KEY_PARAM_NAME is not set");
  }

  const result = await ssmClient.send(new GetParameterCommand({ Name: name }));
  if (!result.Parameter?.Value) {
    throw new Error("JWT public key parameter has no value");
  }

  cachedPublicKey = result.Parameter.Value;
  return cachedPublicKey;
}
