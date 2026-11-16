import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from './api';

export type Role = 'field_officer' | 'mandal_officer' | 'approving_officer';
export type User = { id: number; name: string; nameTe: string; role: Role; mandal: string };
type Ctx = { user: User | null; aiMode: 'live' | 'demo'; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => void };
const C = createContext<Ctx>(null as unknown as Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [aiMode, setAiMode] = useState<'live' | 'demo'>('demo');
  const [loading, setLoading] = useState(!!getToken());
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((r) => { setUser(r.user); setAiMode(r.aiMode); }).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);
  const login = async (username: string, password: string) => {
    const r = await api('/auth/login', { method: 'POST', body: { username, password } });
    setToken(r.token); setUser(r.user); setAiMode(r.aiMode);
  };
  const logout = () => { setToken(null); setUser(null); };
  return <C.Provider value={{ user, aiMode, loading, login, logout }}>{children}</C.Provider>;
}
export const useAuth = () => useContext(C);
