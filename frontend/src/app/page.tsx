'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Flame, 
  GraduationCap, 
  Hourglass, 
  Layers, 
  QrCode, 
  Shield, 
  Sparkles, 
  Wrench, 
  Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Background Radial Glow Accents */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Fix<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Flow</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs shadow-lg shadow-indigo-500/20">
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide animate-in fade-in">
          <Zap className="w-3.5 h-3.5" /> Faculty of Information Technology • Campus Operations
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Smart Campus Maintenance <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Powered by Go & Real-Time Events
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Fast incident reporting, structured floor-by-floor location tracking, QR-code equipment identification, and automated technician dispatch with SMS notifications.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/login">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-8 shadow-xl shadow-indigo-600/25">
              Access FixFlow <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold px-8">
              Explore Architecture
            </Button>
          </a>
        </div>

        {/* Tech Stack Highlights */}
        <div className="pt-12 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Go (Gin Framework)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> PostgreSQL 16 (GORM)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-black border border-white" /> Next.js 14 App Router</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> WebSockets Hub</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Docker Compose</span>
        </div>
      </section>

      {/* Role Portals Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12" id="portals">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl font-bold text-white">Three Specialized Workspaces</h2>
          <p className="text-xs text-slate-400">Tailored user experiences designed for distinct campus operational roles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Student Portal Card */}
          <Card className="bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 transition group backdrop-blur">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition">
                <GraduationCap className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg text-white">Student & Staff Portal</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Fast incident reporting with instant QR asset identification and smart multi-factor priority calculation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Cascading campus location selector</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Deterministic SLA priority scoring</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> 5-Star repair satisfaction rating</li>
              </ul>
              <Link href="/login" className="block pt-2">
                <Button variant="ghost" size="sm" className="w-full text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs">
                  Access Portal <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Technician Workbench Card */}
          <Card className="bg-slate-900/60 border-slate-800 hover:border-amber-500/50 transition group backdrop-blur">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-110 transition">
                <Wrench className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg text-white">Technician Workbench</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Mobile-first task execution dashboard with live SLA countdown timers and photographic evidence capture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Finite State Machine lifecycle</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Before vs After photographic proof</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Repair notes & checklist logging</li>
              </ul>
              <Link href="/login" className="block pt-2">
                <Button variant="ghost" size="sm" className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs">
                  Access Workbench <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Command Center Card */}
          <Card className="bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 transition group backdrop-blur">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition">
                <Shield className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg text-white">Admin Command Center</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Centralized triage, rule-based technician recommendation scoring, and real-time WebSocket live updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Skill & workload match algorithm</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Quality inspection & reopen actions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> MTTR & SLA compliance analytics</li>
              </ul>
              <Link href="/login" className="block pt-2">
                <Button variant="ghost" size="sm" className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs">
                  Access Command Center <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Differentiating Features */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900" id="features">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl font-bold text-white">Engineered Beyond Standard CRUD</h2>
          <p className="text-xs text-slate-400">Ten distinctive architectural capabilities implemented across the full stack</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Smart Priority Engine</h3>
            <p className="text-xs text-slate-400">Calculates deterministic severity using risk and population weights rather than user-entered ratings.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Technician Scoring Engine</h3>
            <p className="text-xs text-slate-400">Scores trade specialty match, availability, and active job load to rank top-recommended technicians.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Hourglass className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">Go Background SLA Worker</h3>
            <p className="text-xs text-slate-400">Native goroutines monitor deadlines every 30s and flag overdue SLA breaches automatically.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">QR-Code Fast Reporting</h3>
            <p className="text-xs text-slate-400">Physical equipment tags auto-select Building, Floor, Room, and Equipment in 0.001 milliseconds.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>FixFlow — Smart Campus Maintenance Management System • Built with Go, Next.js, and PostgreSQL</p>
      </footer>
    </div>
  );
}