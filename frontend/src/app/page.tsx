'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Building2,
  CheckCircle2, 
  Clock, 
  GraduationCap, 
  MapPin, 
  QrCode, 
  Shield, 
  Sparkles, 
  Wrench, 
  Check,
  Camera,
  CameraOff,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Pre-warm cloud backend in background on initial landing
  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  // QR Scanner Modal State
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrTagInput, setQrTagInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLockRef = useRef<boolean>(false);

  const startCamera = async () => {
    try {
      setCameraError('');
      setScannedSuccess(null);
      scanLockRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError('Camera access unavailable or not permitted. You can type or click the registered equipment tag below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScannedSuccess(null);
    scanLockRef.current = false;
  };

  // QR Detection with native BarcodeDetector API if supported in browser
  useEffect(() => {
    let interval: any;
    if (cameraActive && typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        interval = setInterval(async () => {
          if (scanLockRef.current) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                const rawVal = barcodes[0].rawValue.trim();
                if (rawVal.length > 3) {
                  scanLockRef.current = true;
                  let tag = rawVal;
                  if (rawVal.includes('tag=')) {
                    tag = rawVal.split('tag=')[1].split('&')[0];
                  }
                  setScannedSuccess(tag);
                  setTimeout(() => {
                    handleProceedWithQR(tag);
                  }, 1200);
                }
              }
            } catch (e) {}
          }
        }, 350);
      } catch (e) {}
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive]);

  const handleProceedWithQR = (tagToUse: string) => {
    const cleanTag = tagToUse.trim();
    if (!cleanTag) {
      scanLockRef.current = false;
      setScannedSuccess(null);
      return;
    }
    stopCamera();
    setShowQRScanner(false);
    setScannedSuccess(null);
    scanLockRef.current = false;

    let targetReportPath = `/report?tag=${encodeURIComponent(cleanTag)}`;
    if (cleanTag.includes('/report?')) {
      const q = cleanTag.split('/report?')[1];
      targetReportPath = `/report?${q}`;
    } else if (cleanTag.startsWith('/report')) {
      targetReportPath = cleanTag;
    } else if (cleanTag.includes('category=') || cleanTag.includes('floor=') || cleanTag.includes('room=')) {
      const q = cleanTag.replace(/\|/g, '&');
      targetReportPath = `/report?${q}`;
    }

    if (user) {
      router.push(targetReportPath);
    } else {
      router.push(`/signup?redirect=${encodeURIComponent(targetReportPath)}`);
    }
  };

  const getWorkspaceHref = (roleTarget: 'STUDENT' | 'TECHNICIAN' | 'ADMIN') => {
    if (!user) {
      if (roleTarget === 'ADMIN') return '/login?redirect=/dashboard';
      if (roleTarget === 'TECHNICIAN') return '/login?redirect=/tasks';
      return '/login?redirect=/report';
    }
    if (roleTarget === 'ADMIN') return '/dashboard';
    if (roleTarget === 'TECHNICIAN') return '/tasks';
    return '/report';
  };

  const primaryReportHref = !user 
    ? '/login?redirect=/report' 
    : user.role === 'ADMIN' 
      ? '/dashboard' 
      : user.role === 'TECHNICIAN' 
        ? '/tasks' 
        : '/report';

  const primaryButtonLabel = !user
    ? 'Report Issue'
    : user.role === 'ADMIN'
      ? 'Command Dashboard'
      : user.role === 'TECHNICIAN'
        ? 'Technician Workbench'
        : 'Report Issue';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Background Radial Glow Accents */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[350px] bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Fix<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Flow</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#portals" className="hover:text-white transition">Workspaces</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300 font-medium">{user.full_name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase font-bold">
                    {user.role}
                  </span>
                </div>
                <Link href={primaryReportHref}>
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs shadow-lg shadow-indigo-500/20 font-medium">
                    {primaryButtonLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout} 
                  className="border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white text-xs"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white text-xs">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs shadow-lg shadow-indigo-500/20 font-medium">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide animate-in fade-in">
          <Building2 className="w-3.5 h-3.5" /> Faculty of Information Technology • Campus Operations
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Smart Campus Facility & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Maintenance Management
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Fast incident reporting, instant QR-code equipment identification, automated technician dispatch, and verified work order closures for university facilities.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link href={primaryReportHref}>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-7 shadow-xl shadow-indigo-600/25 text-sm">
              {user ? primaryButtonLabel : 'Report an Issue'} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button 
            size="lg" 
            onClick={() => {
              setShowQRScanner(true);
              setQrTagInput('');
            }}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/60 font-semibold px-6 text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/10 transition"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            Scan Equipment QR
          </Button>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold px-6 text-sm">
              How It Works
            </Button>
          </a>
        </div>

        {/* Operational Highlights Banner */}
        <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Fast Response
            </span>
            <p className="text-sm font-bold text-white mt-1">Under 2-Hour SLA</p>
            <p className="text-[11px] text-slate-500">Guaranteed emergency triage</p>
          </div>

          <div 
            onClick={() => {
              setShowQRScanner(true);
              setQrTagInput('');
            }}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer transition text-left group"
          >
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 group-hover:scale-110 transition" /> Equipment QR
            </span>
            <p className="text-sm font-bold text-white mt-1">1-Scan Auto-Fill</p>
            <p className="text-[11px] text-slate-500">Click to scan / enter QR tag →</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Multi-Trade
            </span>
            <p className="text-sm font-bold text-white mt-1">Specialist Dispatch</p>
            <p className="text-[11px] text-slate-500">General, Electrical, IT, Plumbing</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Full Coverage
            </span>
            <p className="text-sm font-bold text-white mt-1">Phase 1 & Phase 2</p>
            <p className="text-[11px] text-slate-500">Old & New IT faculty buildings</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900" id="how-it-works">
        <div className="text-center space-y-2 mb-12">
          <Badge className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-xs">Seamless Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">How FixFlow Resolves Campus Issues</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            From physical breakdown to administrator sign-off, every step is organized, measured, and verified.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-white">Scan or Report</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan the physical QR code pasted on any air conditioner, projector, or lab equipment. The floor, building, and room fill automatically.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-white">Automated Dispatch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The system calculates urgency and automatically routes the ticket to the qualified, available technician with trade specialty matching.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-white">Technician Repair</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The technician accepts the work order, performs physical repairs within the SLA deadline, and uploads completion proof.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-white">Sign-off & Rating</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Campus administration inspects the repair and signs off. Students and staff can submit a 5-star rating to ensure quality service.
            </p>
          </div>
        </div>
      </section>

      {/* Role Workspaces Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900" id="portals">
        <div className="text-center space-y-2 mb-12">
          <Badge className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-xs">Role-Based Access</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Dedicated Campus Workspaces</h2>
          <p className="text-xs sm:text-sm text-slate-400">Tailored environments designed for students, technical staff, and facility administrators</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Student Portal Card */}
          <Card className="bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 transition group backdrop-blur">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition">
                <GraduationCap className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg text-white">Student & Faculty Portal</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Effortless incident reporting with live ticket tracking and SMS alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-300 space-y-2.5">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Interactive 5-floor campus location selector</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> QR-code equipment auto-fill recognition</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Real-time ticket history and SMS updates</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> 5-Star repair satisfaction rating and feedback</li>
              </ul>
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
                Mobile-optimized task execution workstation with SLA countdown clocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-300 space-y-2.5">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Trade-specific work order queue</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Live resolution countdown with SLA alerts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Photographic repair verification upload</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Repair documentation notes & checklist logging</li>
              </ul>
            </CardContent>
          </Card>

          {/* Admin Command Center Card */}
          <Card className="bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 transition group backdrop-blur">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition">
                <Shield className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg text-white">Command Dashboard</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Central administrative dispatch, reassignments, and compliance analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-300 space-y-2.5">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Real-time incident triage and dispatch engine</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Technician workload balancing & reassignments</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Formal administrative repair sign-off</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> SLA adherence analytics & performance metrics</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-300">FixFlow</span>
            <span>— Smart Campus Maintenance Management System</span>
          </div>
          <p>Faculty of Information Technology • Campus Operations & Facility Management</p>
        </div>
      </footer>

      {/* QR Scanner Dialog */}
      <Dialog 
        open={showQRScanner} 
        onOpenChange={(open) => {
          if (!open) stopCamera();
          setShowQRScanner(open);
        }}
      >
        <DialogContent className="bg-slate-900 border border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
              <QrCode className="w-5 h-5 text-indigo-400" />
              Scan Campus Equipment QR Code
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Scan or enter the tag pasted on any campus equipment to automatically detect its location and proceed to incident reporting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Camera View Area */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col items-center justify-center">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`} 
              />
              
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-indigo-500/80 rounded-xl relative animate-pulse">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400 -mb-1 -mr-1"></div>
                  </div>
                </div>
              )}

              {/* Scanned Success Confirmation Overlay */}
              {scannedSuccess && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                  </div>
                  <p className="text-sm font-bold text-white">QR Code Scanned!</p>
                  <p className="text-xs text-emerald-300 mt-1 max-w-[260px] truncate bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                    {scannedSuccess}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Opening equipment report...
                  </p>
                </div>
              )}

              {!cameraActive && (
                <div className="text-center p-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Point your camera directly at the QR sticker on the equipment.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={startCamera}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  >
                    Start Camera Scan
                  </Button>
                </div>
              )}

              {cameraActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="absolute bottom-2 right-2 bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white text-[11px] h-7"
                >
                  <CameraOff className="w-3.5 h-3.5 mr-1" /> Stop Camera
                </Button>
              )}
            </div>

            {cameraError && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Manual Tag Entry */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-slate-300">Or Enter Equipment Tag Manually:</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. AC-IT-NEW-ERPLAB-01"
                  value={qrTagInput}
                  onChange={(e) => setQrTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleProceedWithQR(qrTagInput);
                  }}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
                <Button
                  type="button"
                  onClick={() => handleProceedWithQR(qrTagInput)}
                  disabled={!qrTagInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 shrink-0"
                >
                  Proceed
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}