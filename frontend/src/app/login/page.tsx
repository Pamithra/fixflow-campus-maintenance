'use client';

import React, { useState, Suspense } from 'react';
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
  GraduationCap, 
  Briefcase, 
  Wrench, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  KeyRound, 
  CheckCircle2, 
  Lock, 
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';

  const modeParam = searchParams.get('mode');
  const [mode, setMode] = useState<'signin' | 'signup'>(modeParam === 'signup' ? 'signup' : 'signin');

  React.useEffect(() => {
    if (modeParam === 'signup') {
      setMode('signup');
    } else if (modeParam === 'signin') {
      setMode('signin');
    }
  }, [modeParam]);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up Form State
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'STAFF' | 'TECHNICIAN'>('STUDENT');
  const [skillCategory, setSkillCategory] = useState('General');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Clear any previously saved credentials on mount so inputs always start clean on load or logout
  React.useEffect(() => {
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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        full_name: fullName,
        email: signupEmail,
        password: signupPassword,
        phone_number: phoneNumber,
        role: role,
      };

      if (role === 'TECHNICIAN') {
        payload.skill_category = skillCategory;
      }

      await api.post('/auth/register', payload);
      setLoading(false);
      // Auto-transition to sign-in section with prefilled credentials
      setLoginEmail(signupEmail);
      setLoginPassword(signupPassword);
      setMode('signin');
      setSuccess('Account created successfully! Click Sign In below to proceed.');
    } catch (err: any) {
      if (!err.response) {
        setError('Unable to connect to the server. Please check your network connection and try again.');
      } else {
        setError(err.response.data?.error || 'Registration could not be completed. Please check your details and try again.');
      }
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
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail,
        new_password: forgotNewPassword,
      });
      setForgotSuccess(res.data.message || 'Password reset successfully!');
      setLoginEmail(forgotEmail);
      setLoginPassword(forgotNewPassword);
      setTimeout(() => {
        setShowForgotPassword(false);
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
              ? '📲 Equipment detected via QR! Please sign in or create an account to submit your maintenance report.'
              : 'Please sign in or create an account to continue.'}
          </span>
        </div>
      )}

      {/* Auth Card */}
      <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 pb-3">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
                mode === 'signin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign Up
            </button>
          </div>

          <div>
            <CardTitle className="text-lg text-white">
              {mode === 'signin' ? 'Sign In to FixFlow' : 'Create a New Account'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {mode === 'signin' 
                ? 'Enter your email and password to access the system.' 
                : 'Join FixFlow to report issues, track repairs, or manage work orders.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-lg flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              {success}
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleLoginSubmit} method="post" autoComplete="on" className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-xs font-medium text-slate-300">Email</label>
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
              </Button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} method="post" autoComplete="on" className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="signup-fullname" className="text-xs font-medium text-slate-300">Full Name</label>
                <Input
                  id="signup-fullname"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kasun Silva"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-email" className="text-xs font-medium text-slate-300">Email</label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="e.g. name@gmail.com"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-phone" className="text-xs font-medium text-slate-300">Phone Number (For SMS Updates)</label>
                <Input
                  id="signup-phone"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 077 123 4567"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-role" className="text-xs font-medium text-slate-300">Account Role</label>
                <select
                  id="signup-role"
                  name="role"
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="STAFF">Academic / Administrative Staff</option>
                  <option value="TECHNICIAN">Maintenance Technician</option>
                </select>
              </div>

              {role === 'TECHNICIAN' && (
                <div className="space-y-1 animate-in fade-in">
                  <label htmlFor="signup-trade" className="text-xs font-medium text-amber-400">Trade Specialty</label>
                  <select
                    id="signup-trade"
                    name="skill_category"
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="General">General Maintenance (Air Conditioning & General)</option>
                    <option value="Electrical">Electrical & Power Systems</option>
                    <option value="Plumbing">Plumbing & Water Fixtures</option>
                    <option value="IT">IT Hardware & Projectors</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="signup-password" className="text-xs font-medium text-slate-300">Password</label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showSignupPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      required
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="signup-confirm-password" className="text-xs font-medium text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs py-2 mt-2 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
              </Button>
            </form>
          )}
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
            <div className="p-2.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              {forgotSuccess}
            </div>
          )}

          <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Registered Email</label>
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="e.g. name@gmail.com"
                required
                className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs"
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
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  aria-label={showForgotNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showForgotNewPassword ? (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                  )}
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
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  aria-label={showForgotConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showForgotConfirmPassword ? (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForgotPassword(false)}
                className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={forgotLoading}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
              >
                {forgotLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    Reset & Sign In
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={<div className="text-slate-400 text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading FixFlow...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}