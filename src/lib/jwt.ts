import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
};

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as JwtPayload;
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
