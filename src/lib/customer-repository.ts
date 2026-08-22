import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import pg from "pg";

export interface Customer { id: string | number; active: boolean; }
export type CustomerLookup = (cpf: string) => Promise<Customer | null>;

const secrets = new SecretsManagerClient({});
let pool: pg.Pool | undefined;

export const CUSTOMER_LOOKUP_QUERY = `SELECT "id", "ativo" AS "active"
FROM "Cliente"
WHERE "documento" = $1
  AND "tipo_documento" = 'CPF'`;

async function connectionString(): Promise<string> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const arn = process.env.DATABASE_SECRET_ARN;
  if (!arn) throw new Error("DATABASE_URL or DATABASE_SECRET_ARN is not set");
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!result.SecretString) throw new Error("database secret has no SecretString");
  const value = JSON.parse(result.SecretString) as Record<string, unknown>;
  if (typeof value.connectionString === "string") return value.connectionString;
  if (typeof value.url === "string") return value.url;
  if (typeof value.host !== "string" || typeof value.username !== "string" || typeof value.password !== "string") {
    throw new Error("database secret has no connection details");
  }
  return `postgresql://${encodeURIComponent(value.username)}:${encodeURIComponent(value.password)}@${value.host}:${String(value.port ?? 5432)}/${String(value.dbname ?? value.database ?? "postgres")}`;
}

export async function findCustomer(cpf: string): Promise<Customer | null> {
  if (!pool) pool = new pg.Pool({ connectionString: await connectionString(), max: 2 });
  const result = await pool.query<{ id: string | number; active: boolean }>(CUSTOMER_LOOKUP_QUERY, [cpf]);
  return result.rows[0] ?? null;
}
