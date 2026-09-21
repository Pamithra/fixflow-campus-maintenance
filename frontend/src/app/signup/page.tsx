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
  UserPlus, 
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function SignupForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'STAFF' | 'TECHNICIAN'>('STUDENT');
  const [skillCategory, setSkillCategory] = useState('General');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-warm backend in background
  React.useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        full_name: fullName,
        email: email,
        password: password,
        phone_number: phoneNumber,
        role: role,
      };

      if (role === 'TECHNICIAN') {
        payload.skill_category = skillCategory;
      }

      await api.post('/auth/register', payload);

      // User requirement: after creating account, navigate to sign in page
      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push(`/login?registered=true${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`);
      }, 700);
    } catch (err: any) {
      if (!err.response) {
        setError('Unable to connect to the server. Please check your network connection and try again.');
      } else {
        setError(err.response.data?.error || 'Registration could not be completed. Please check your details and try again.');
      }
      setLoading(false);
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
          Faculty of Information Technology • User Registration
        </p>
      </div>

      {/* Redirect Notification */}
      {redirectUrl && (
        <div className="p-3 text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {redirectUrl.includes('tag=') || redirectUrl.includes('category=') || redirectUrl.includes('floor=')
              ? '📲 Equipment detected via QR! Create your account to submit your maintenance report.'
              : 'Create an account to access the requested page.'}
          </span>
        </div>
      )}

      {/* Auth Card */}
      <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" /> Create a New Account
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Join FixFlow to report campus issues, track repairs, and receive maintenance updates.
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
              <label htmlFor="signup-email" className="text-xs font-medium text-slate-300">Email Address</label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            <div className="space-y-1">
              <label htmlFor="signup-password" className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Input
                  id="signup-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="signup-confirm-password" className="text-xs font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <Input
                  id="signup-confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
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
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs py-2 shadow-lg shadow-indigo-500/20 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
            </Button>
          </form>

          {/* Switch to Log In */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
            Already have an account?{' '}
            <Link 
              href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
            >
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[250px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <Suspense fallback={<div className="text-white text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading FixFlow...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
