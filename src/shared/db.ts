import { Pool } from "pg";

export interface ClienteRecord {
  id: string;
  nome: string;
  email: string;
}

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? "5432"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function findClienteByDocumento(documento: string): Promise<ClienteRecord | null> {
  const result = await getPool().query<ClienteRecord>(
    'SELECT id, nome, email FROM "Cliente" WHERE documento = $1 LIMIT 1',
    [documento]
  );

  return result.rows[0] ?? null;
}
