import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const secrets = new SecretsManagerClient({});
const ssm = new SSMClient({});
let privateKey: string | undefined;
let publicKey: string | undefined;

export async function getPrivateKey(): Promise<string> {
  if (privateKey) return privateKey;
  if (process.env.JWT_PRIVATE_KEY) return (privateKey = process.env.JWT_PRIVATE_KEY);
  const id = process.env.JWT_PRIVATE_KEY_SECRET_ARN;
  if (!id) throw new Error("JWT private key is not configured");
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: id }));
  if (!result.SecretString) throw new Error("JWT private key is unavailable");
  return (privateKey = result.SecretString);
}

export async function getPublicKey(): Promise<string> {
  if (publicKey) return publicKey;
  if (process.env.JWT_PUBLIC_KEY) return (publicKey = process.env.JWT_PUBLIC_KEY);
  const name = process.env.JWT_PUBLIC_KEY_PARAM_NAME;
  if (!name) throw new Error("JWT public key is not configured");
  const result = await ssm.send(new GetParameterCommand({ Name: name }));
  if (!result.Parameter?.Value) throw new Error("JWT public key is unavailable");
  return (publicKey = result.Parameter.Value);
}
