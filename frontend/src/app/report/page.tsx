'use client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function ReportPage() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">🎓 Student & Staff Portal</h1>
          <p className="text-sm text-slate-400">Welcome, {user?.full_name} ({user?.email})</p>
        </div>
        <Button variant="outline" onClick={logout} className="border-slate-700 text-slate-200">Sign Out</Button>
      </div>
      <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-400">
        Reporting form with QR scanning and Smart Priority Engine will be implemented here next!
      </div>
    </div>
  );
}