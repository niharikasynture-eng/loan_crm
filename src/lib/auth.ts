import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader, JwtPayload } from './jwt';

export function getAuthUser(req: NextRequest): JwtPayload | null {
  const token = extractTokenFromHeader(req.headers.get('authorization'));
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): JwtPayload {
  const user = getAuthUser(req);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export function requireRole(req: NextRequest, roles: string[]): JwtPayload {
  const user = requireAuth(req);
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}

export function apiError(message: string, status: number = 400) {
  return Response.json({ success: false, message }, { status });
}

export function apiSuccess(data: unknown, message?: string, status: number = 200) {
  return Response.json({ success: true, message, data }, { status });
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  MANAGER: 'manager',
  SALES_AGENT: 'sales_agent',
  ONSITE_VISITOR: 'onsite_visitor',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
