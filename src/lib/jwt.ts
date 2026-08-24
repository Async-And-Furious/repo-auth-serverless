import jwt from "jsonwebtoken";

const ALGORITHM = "RS256";

export interface JwtClaims {
  sub: string;
}

interface VerifiedJwtClaims extends JwtClaims {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

function configuration(): { issuer: string; audience: string; expiresIn: number } {
  const issuer = process.env.JWT_ISSUER?.trim();
  const audience = process.env.JWT_AUDIENCE?.trim();
  const expiresIn = Number(process.env.JWT_EXPIRES_IN);
  if (!issuer || !audience || expiresIn !== 1800) {
    throw new Error("JWT_ISSUER, JWT_AUDIENCE, and JWT_EXPIRES_IN=1800 are required");
  }
  return { issuer, audience, expiresIn };
}

export function signToken(
  claims: JwtClaims,
  privateKey: string,
): string {
  const config = configuration();
  return jwt.sign(claims, privateKey, {
    algorithm: ALGORITHM,
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience,
  });
}

export function verifyToken(token: string, publicKey: string): VerifiedJwtClaims {
  const config = configuration();
  const decoded = jwt.verify(token, publicKey, {
    algorithms: [ALGORITHM],
    issuer: config.issuer,
    audience: config.audience,
  });

  if (typeof decoded === "string" || typeof decoded.sub !== "string" ||
    typeof decoded.iat !== "number" || typeof decoded.exp !== "number" ||
    decoded.iss !== config.issuer || decoded.aud !== config.audience ||
    decoded.sub.trim() === "") {
    throw new Error("token claims are invalid");
  }

  return { sub: decoded.sub, iat: decoded.iat, exp: decoded.exp, iss: decoded.iss, aud: decoded.aud };
}
