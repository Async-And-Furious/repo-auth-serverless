import { Pool } from "pg";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

export interface ClienteRecord {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

let poolPromise: Promise<Pool> | undefined;
const secretsManager = new SecretsManagerClient({});

export interface DatabaseSecret {
  host: string;
  port?: number;
  username: string;
  password: string;
  dbname: string;
  ssl?: boolean;
}

export function parseDatabaseSecret(value: string): DatabaseSecret {
  const secret = JSON.parse(value) as Partial<DatabaseSecret>;
  if (typeof secret.host !== "string" || typeof secret.username !== "string" ||
      typeof secret.password !== "string" || typeof secret.dbname !== "string") {
    throw new Error("invalid database secret shape");
  }
  if (secret.port !== undefined && (!Number.isInteger(secret.port) || secret.port < 1 || secret.port > 65535)) {
    throw new Error("invalid database secret port");
  }
  if (secret.ssl !== undefined && typeof secret.ssl !== "boolean") {
    throw new Error("invalid database secret ssl");
  }
  return secret as DatabaseSecret;
}

async function getPool(): Promise<Pool> {
  poolPromise ??= (async () => {
    const arn = process.env.DATABASE_SECRET_ARN?.trim();
    let config: DatabaseSecret;
    if (arn) {
      const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: arn }));
      if (!result.SecretString) throw new Error("database secret has no string value");
      config = parseDatabaseSecret(result.SecretString);
    } else {
      const { DB_HOST: host, DB_USER: username, DB_PASSWORD: password, DB_NAME: dbname } = process.env;
      if (!host || !username || !password || !dbname) throw new Error("database configuration is missing");
      config = { host, username, password, dbname, port: Number(process.env.DB_PORT ?? "5432"), ssl: process.env.DB_SSL === "true" };
    }
    return new Pool({ host: config.host, port: config.port ?? 5432, user: config.username,
      password: config.password, database: config.dbname,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined });
  })().catch((error) => {
    poolPromise = undefined;
    throw error;
  });
  return poolPromise;
}

export async function findClienteByDocumento(documento: string): Promise<ClienteRecord | null> {
  const result = await (await getPool()).query<ClienteRecord>(
    'SELECT id, nome, email, ativo FROM "Cliente" WHERE documento = $1 AND ativo = true LIMIT 1',
    [documento]
  );

  return result.rows[0] ?? null;
}
