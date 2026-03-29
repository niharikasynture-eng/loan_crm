'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  phone?: string;
  avatar?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  status?: string;
  leadFormToken?: string;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('crm_token');
    if (storedToken) {
      setToken(storedToken);
      refreshUserWithToken(storedToken);
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshUserWithToken(t: string) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Invalid token');
      const data = await res.json();
      setUser(data.data.user);
      setOrganization(data.data.organization ? {
        id: data.data.organization.id || data.data.organization._id,
        name: data.data.organization.name,
        slug: data.data.organization.slug,
        status: data.data.organization.status,
        leadFormToken: data.data.organization.leadFormToken,
      } : null);
    } catch {
      localStorage.removeItem('crm_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    const { token: t, user: u, organization: o } = data.data;
    localStorage.setItem('crm_token', t);
    setToken(t);
    setUser(u);
    setOrganization(o);
    router.push('/dashboard');
  }

  function logout() {
    localStorage.removeItem('crm_token');
    setToken(null);
    setUser(null);
    setOrganization(null);
    router.push('/login');
  }

  async function refreshUser() {
    if (token) await refreshUserWithToken(token);
  }

  return (
    <AuthContext.Provider value={{ user, organization, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
