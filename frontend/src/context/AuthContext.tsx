'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  role: 'ADMIN' | 'STAFF' | 'TECHNICIAN' | 'STUDENT';
  skill_category?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User, redirectUrl?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      sessionStorage.removeItem('fixflow_logging_out');
    } catch (e) {}

    const savedToken = localStorage.getItem('fixflow_token');
    const savedUser = localStorage.getItem('fixflow_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, redirectUrl?: string) => {
    try {
      sessionStorage.removeItem('fixflow_logging_out');
    } catch (e) {}
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('fixflow_token', newToken);
    localStorage.setItem('fixflow_user', JSON.stringify(newUser));

    // If a specific redirect destination was requested (e.g. scanned QR equipment report), prioritize it
    let target = redirectUrl;
    if (target && target.includes('redirect=')) {
      try {
        const dummy = new URL(target, 'http://dummy.local');
        const inner = dummy.searchParams.get('redirect');
        if (inner) target = decodeURIComponent(inner);
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fixflow_qr_authed', 'true');
    }

    // Admin always goes to Command Dashboard, never to incident reporting
    if (newUser.role === 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (target && !target.startsWith('/login') && !target.startsWith('/signup')) {
      router.push(target);
      return;
    }

    // Dynamic routing based on role
    if (newUser.role === 'TECHNICIAN') {
      router.push('/tasks');
    } else {
      router.push('/report');
    }
  };

  const logout = () => {
    try {
      sessionStorage.setItem('fixflow_logging_out', 'true');
      sessionStorage.removeItem('fixflow_qr_authed');
    } catch (e) {}
    localStorage.removeItem('fixflow_token');
    localStorage.removeItem('fixflow_user');
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.push('/');
    }
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