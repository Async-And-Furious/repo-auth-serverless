import { describe, expect, it, vi } from "vitest";
import { findClienteByDocumento, parseDatabaseSecret } from "./db.js";

vi.mock("pg", () => ({
  Pool: class {
    async query() { return { rows: [] }; }
  },
}));

describe("database secret configuration", () => {
  it("parses the documented JSON shape", () => {
    expect(parseDatabaseSecret(JSON.stringify({ host: "db", username: "app", password: "secret", dbname: "main" }))).toMatchObject({ host: "db", username: "app", dbname: "main" });
  });

  it("rejects incomplete secrets", () => {
    expect(() => parseDatabaseSecret(JSON.stringify({ host: "db" }))).toThrow("invalid database secret shape");
  });

  it.each([
    [{ host: "db", port: "5432", username: "app", password: "secret", dbname: "main" }, "port"],
    [{ host: "db", port: 0, username: "app", password: "secret", dbname: "main" }, "port"],
    [{ host: "db", ssl: "true", username: "app", password: "secret", dbname: "main" }, "ssl"],
  ])("rejects invalid %s", (secret, field) => {
    expect(() => parseDatabaseSecret(JSON.stringify(secret))).toThrow(`invalid database secret ${field}`);
  });

  it("does not cache a failed pool initialization", async () => {
    const original = { ...process.env };
    try {
      delete process.env.DATABASE_SECRET_ARN;
      delete process.env.DB_HOST;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_NAME;
      await expect(findClienteByDocumento("52998224725")).rejects.toThrow("database configuration is missing");
      process.env.DB_HOST = "db";
      process.env.DB_USER = "app";
      process.env.DB_PASSWORD = "secret";
      process.env.DB_NAME = "main";
      await expect(findClienteByDocumento("52998224725")).resolves.toBeNull();
    } finally {
      process.env = original;
    }
  });
});
