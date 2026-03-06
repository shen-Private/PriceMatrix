import { createContext, useContext, useState, ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout } from './api/authApi';

export type Role = 'admin' | 'warehouse' | 'sales' | 'cs';

export type Action =
  | 'view_pricing'
  | 'view_inventory'
  | 'scan_inventory'
  | 'set_safety_stock'
  | 'manage_users';

const permissions: Record<Role, Action[]> = {
  admin: ['view_pricing', 'view_inventory', 'scan_inventory', 'set_safety_stock', 'manage_users'],
  warehouse: ['view_inventory', 'scan_inventory'],
  sales: ['view_pricing', 'view_inventory'],
  cs: ['view_inventory', 'set_safety_stock'],
};

interface AuthContextType {
  role: Role | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (action: Action) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const login = async (u: string, p: string) => {
    const res = await apiLogin(u, p);
    setRole(res.role as Role);
    setUsername(res.username);
  };

  const logout = async () => {
    await apiLogout();
    setRole(null);
    setUsername(null);
  };

  const can = (action: Action) => role ? permissions[role].includes(action) : false;

  return (
    <AuthContext.Provider value={{ role, username, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}