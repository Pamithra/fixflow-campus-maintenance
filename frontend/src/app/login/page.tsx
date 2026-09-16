'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Wrench, Shield, GraduationCap, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // One-click demo credential fillers
  const fillDemoAccount = (role: 'admin' | 'tech' | 'student') => {
    if (role === 'admin') {
      setEmail('admin@fixflow.edu');
      setPassword('Admin@123');
    } else if (role === 'tech') {
      setEmail('kasun.hvac@fixflow.edu');
      setPassword('Tech@123');
    } else {
      setEmail('student@fixflow.edu');
      setPassword('Student@123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 relative overflow-hidden">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Facilities Management
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">FixFlow</span>
          </h1>
          <p className="text-sm text-slate-400">Smart Campus Maintenance & Incident Response</p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Sign In</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your university credentials or choose a quick demo account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fixflow.edu"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>

            {/* Quick Demo Role Switcher */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Quick Demo Access:</span>
                <Badge variant="outline" className="text-[10pt] border-slate-700 text-slate-400">1-Click Fill</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-indigo-500/50 transition group"
                >
                  <Shield className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition" />
                  <span className="text-[11px] font-semibold text-slate-200">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('tech')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-amber-500/50 transition group"
                >
                  <Wrench className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition" />
                  <span className="text-[11px] font-semibold text-slate-200">Technician</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('student')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-emerald-500/50 transition group"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition" />
                  <span className="text-[11px] font-semibold text-slate-200">Student</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}