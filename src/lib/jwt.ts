import jwt from "jsonwebtoken";

const ISSUER = "repo-auth-serverless";
const ALGORITHM = "RS256";

export interface JwtClaims {
  sub: string;
}

export function signToken(
  claims: JwtClaims,
  privateKey: string,
  expiresInSeconds = 1800,
): string {
  return jwt.sign(claims, privateKey, {
    algorithm: ALGORITHM,
    expiresIn: expiresInSeconds,
    issuer: ISSUER,
  });
}

export function verifyToken(token: string, publicKey: string): JwtClaims {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  });

  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("token missing sub claim");
  }

  return { sub: decoded.sub };
}
