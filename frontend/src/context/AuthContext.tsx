'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'STUDENT';
  skill_category?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('fixflow_token');
    const savedUser = localStorage.getItem('fixflow_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('fixflow_token', newToken);
    localStorage.setItem('fixflow_user', JSON.stringify(newUser));

    // Dynamic routing based on role
    if (newUser.role === 'ADMIN') {
      router.push('/dashboard');
    } else if (newUser.role === 'TECHNICIAN') {
      router.push('/tasks');
    } else {
      router.push('/report');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fixflow_token');
    localStorage.removeItem('fixflow_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}