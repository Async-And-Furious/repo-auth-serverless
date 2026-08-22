import { beforeEach, describe, expect, it, vi } from "vitest";

const pg = vi.hoisted(() => ({
  Pool: vi.fn(),
  query: vi.fn(),
}));

vi.mock("pg", () => ({
  default: { Pool: pg.Pool },
}));

import { CUSTOMER_LOOKUP_QUERY, findCustomer } from "./customer-repository.js";

describe("findCustomer", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
    pg.Pool.mockClear();
    pg.Pool.mockReturnValue({ query: pg.query, end: vi.fn().mockResolvedValue(undefined) });
    pg.query.mockReset();
  });

  it("queries the CPF schema contract and preserves customer status", async () => {
    const cpf = "11111111111";
    const active = { id: "customer-active", active: true };
    const inactive = { id: "customer-inactive", active: false };
    pg.query
      .mockResolvedValueOnce({ rows: [active] })
      .mockResolvedValueOnce({ rows: [inactive] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(findCustomer(cpf)).resolves.toEqual(active);
    await expect(findCustomer(cpf)).resolves.toEqual(inactive);
    await expect(findCustomer(cpf)).resolves.toBeNull();

    expect(pg.query).toHaveBeenCalledTimes(3);
    expect(pg.query).toHaveBeenCalledWith(CUSTOMER_LOOKUP_QUERY, [cpf]);
    expect(CUSTOMER_LOOKUP_QUERY).toBe(`SELECT "id", "ativo" AS "active"
FROM "Cliente"
WHERE "documento" = $1
  AND "tipo_documento" = 'CPF'`);
  });

  it("resets a failed pool so the next invocation can retry", async () => {
    pg.query.mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValueOnce({ rows: [] });
    await expect(findCustomer("52998224725")).rejects.toThrow("database unavailable");
    await expect(findCustomer("52998224725")).resolves.toBeNull();
    expect(pg.Pool).toHaveBeenCalledTimes(1);
  });
});
