import { useAuth as useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, organization, isLoading, login, logout, refreshUser } = useAuthContext();
  
  return {
    user,
    organization,
    isLoading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'org_admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
  };
}
