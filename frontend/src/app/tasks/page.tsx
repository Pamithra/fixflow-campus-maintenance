'use client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function TasksPage() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">🔧 Technician Field Workbench</h1>
          <p className="text-sm text-slate-400">Welcome, {user?.full_name} ({user?.skill_category} Specialist)</p>
        </div>
        <Button variant="outline" onClick={logout} className="border-slate-700 text-slate-200">Sign Out</Button>
      </div>
      <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-400">
        Assigned Work Orders, Before/After photos, and Task checklist will be here!
      </div>
    </div>
  );
}