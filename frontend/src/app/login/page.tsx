'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  AlertCircle,
  ArrowLeft,
  ArrowRight, 
  Loader2, 
  Sparkles, 
  LogIn, 
  KeyRound, 
  CheckCircle2, 
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';
  const modeParam = searchParams.get('mode');
  const registeredParam = searchParams.get('registered');

  // If URL has ?mode=signup, seamlessly redirect to dedicated /signup page
  useEffect(() => {
    if (modeParam === 'signup') {
      router.replace(`/signup${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`);
    }
  }, [modeParam, redirectUrl, router]);

  // Log In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(registeredParam ? 'Account created successfully! Please sign in with your credentials.' : '');

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Clear inputs on mount & pre-warm cloud backend in background
  useEffect(() => {
    try {
      localStorage.removeItem('fixflow_saved_credentials');
      localStorage.removeItem('fixflow_remembered_email');
    } catch (e) {}
    setLoginEmail('');
    setLoginPassword('');

    // Pre-warm backend in background so cold-start delay happens before clicking submit
    api.get('/health').catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { 
        email: loginEmail, 
        password: loginPassword 
      });

      // Invoke browser native Credential Management API to trigger Google Chrome / Edge native "Save password?" prompt
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (navigator as any).credentials) {
        try {
          const cred = new (window as any).PasswordCredential({
            id: loginEmail,
            password: loginPassword,
            name: loginEmail,
          });
          (navigator as any).credentials.store(cred).catch(() => {});
        } catch (e) {}
      }

      login(res.data.token, res.data.user, redirectUrl || undefined);
    } catch (err: any) {
      if (!err.response) {
        setError('Unable to connect to the server. Please check your network connection and try again.');
      } else if (err.response.status === 401) {
        setError('Incorrect email or password. Please check your credentials and try again.');
      } else {
        setError(err.response.data?.error || 'Incorrect email or password. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    setForgotLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        new_password: forgotNewPassword,
      });

      setForgotSuccess('Password has been successfully updated! You can now sign in.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setLoginEmail(forgotEmail);
        setLoginPassword(forgotNewPassword);
        setForgotSuccess('');
        setSuccess('Password updated successfully! You can now sign in.');
      }, 1500);
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to reset password. Please check your email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 space-y-6">
      {/* Back to Home Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition bg-slate-900/70 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide hover:bg-indigo-500/20 transition">
          <Sparkles className="w-3.5 h-3.5" /> FixFlow Campus Operations
        </Link>
        <Link href="/" className="block group">
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 group-hover:from-blue-300 group-hover:to-indigo-300 transition">FixFlow</span>
          </h1>
        </Link>
        <p className="text-xs sm:text-sm text-slate-400">
          Faculty of Information Technology • Maintenance & Issue Reporting
        </p>
      </div>

      {/* Redirect Notification */}
      {redirectUrl && (
        <div className="p-3 text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {redirectUrl.includes('tag=') || redirectUrl.includes('category=') || redirectUrl.includes('floor=')
              ? '📲 Equipment detected via QR! Please log in or create an account to submit your maintenance report.'
              : 'Please log in to continue.'}
          </span>
        </div>
      )}

      {/* Auth Card */}
      <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-2 pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <LogIn className="w-5 h-5 text-indigo-400" /> Log In to FixFlow
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Enter your email and password to access your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-lg flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* LOG IN FORM */}
          <form onSubmit={handleLoginSubmit} method="post" autoComplete="on" className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="login-email" className="text-xs font-medium text-slate-300">Email Address</label>
              <Input
                id="login-email"
                name="username"
                type="email"
                autoComplete="username email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. name@gmail.com"
                required
                className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotError('');
                    setForgotSuccess('');
                    setShowForgotPassword(true);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline transition font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs py-2 shadow-lg shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Log In <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
            </Button>
          </form>

          {/* Switch to Sign Up */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
            Don't have an account?{' '}
            <Link 
              href={`/signup${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
            >
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Forgot / Reset Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2">
              <KeyRound className="w-5 h-5 text-indigo-400" />
            </div>
            <DialogTitle className="text-base text-white">Reset Your Password</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Enter your registered email address and create a new password to regain access.
            </DialogDescription>
          </DialogHeader>

          {forgotError && (
            <div className="p-2.5 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {forgotError}
            </div>
          )}

          {forgotSuccess && (
            <div className="p-2.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Registered Email</label>
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
                className="bg-slate-950 border-slate-800 text-white text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">New Password</label>
              <div className="relative">
                <Input
                  type={showForgotNewPassword ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showForgotConfirmPassword ? 'text' : 'password'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={forgotLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 font-semibold mt-2"
            >
              {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[250px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <Suspense fallback={<div className="text-white text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading FixFlow...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}