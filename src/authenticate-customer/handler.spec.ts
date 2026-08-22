import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { generateKeyPairSync } from "node:crypto";

vi.mock("../shared/db.js", () => ({
  findClienteByDocumento: vi.fn(),
}));

const { findClienteByDocumento } = await import("../shared/db.js");
const { handler } = await import("./handler.js");

const VALID_CPF = "52998224725";
const INVALID_CPF = "11111111111";
const TEST_PRIVATE_KEY = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function buildEvent(body: unknown): APIGatewayProxyEvent {
  return { body: JSON.stringify(body) } as APIGatewayProxyEvent;
}

describe("authenticate-customer handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.JWT_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.JWT_ISSUER = "test-issuer";
    process.env.JWT_AUDIENCE = "test-audience";
    process.env.JWT_EXPIRES_IN = "1800";
  });

  it("returns 400 when body is missing cpf", async () => {
    const result = await handler(buildEvent({}), {} as never, {} as never);
    expect(result?.statusCode).toBe(400);
  });

  it("returns 400 when body is malformed JSON", async () => {
    const event = { body: "not-json" } as APIGatewayProxyEvent;
    const result = await handler(event, {} as never, {} as never);
    expect(result?.statusCode).toBe(400);
  });

  it("returns 401 generic for invalid CPF without querying the database", async () => {
    const result = await handler(buildEvent({ cpf: INVALID_CPF }), {} as never, {} as never);

    expect(result?.statusCode).toBe(401);
    expect(findClienteByDocumento).not.toHaveBeenCalled();
  });

  it("returns 401 generic when customer does not exist", async () => {
    vi.mocked(findClienteByDocumento).mockResolvedValue(null);

    const result = await handler(buildEvent({ cpf: VALID_CPF }), {} as never, {} as never);

    expect(result?.statusCode).toBe(401);
  });

  it("returns 401 generic for an inactive customer", async () => {
    vi.mocked(findClienteByDocumento).mockResolvedValue(null);
    const result = await handler(buildEvent({ cpf: VALID_CPF }), {} as never, {} as never);
    expect(result?.statusCode).toBe(401);
  });

  it("returns 200 with token when CPF is valid and customer exists", async () => {
    vi.mocked(findClienteByDocumento).mockResolvedValue({
      id: "cliente-1",
      nome: "Fulano",
      email: "fulano@example.com",
      ativo: true,
    });

    const result = await handler(buildEvent({ cpf: VALID_CPF }), {} as never, {} as never);

    expect(result?.statusCode).toBe(200);
    const body = JSON.parse(result!.body) as { token: string; expiresIn: number };
    expect(body.token).toEqual(expect.any(String));
    expect(body.expiresIn).toBe(1800);
  });
});
