'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  Camera, 
  CheckCircle2, 
  Clock, 
  Hourglass, 
  Loader2, 
  MapPin, 
  Play, 
  RefreshCw, 
  Send, 
  Sparkles, 
  Wrench, 
  Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TechnicianTasksPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Completion Form State per task
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    setLoading(true);
    api.get('/technician/tasks')
      .then((res) => setTasks(res.data.work_orders || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  // SLA Countdown Helper
  const getRemainingSLA = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return { text: 'SLA BREACHED', breached: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${mins}m remaining`, breached: false };
  };

  // Action: Start Work
  const handleStartWork = async (taskId: number) => {
    setActionLoading(true);
    try {
      await api.patch(`/technician/tasks/${taskId}/start`);
      setSuccessToast('Job status updated to IN_PROGRESS. Clock is running!');
      loadTasks();
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start job');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Complete Work
  const handleCompleteWork = async (taskId: number) => {
    if (!notes.trim()) {
      alert('Please provide repair notes describing what was fixed.');
      return;
    }
    setActionLoading(true);

    try {
      let uploadedUrl = '';
      if (afterImageFile) {
        const formData = new FormData();
        formData.append('image', afterImageFile);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = uploadRes.data.url;
      }

      const res = await api.post(`/technician/tasks/${taskId}/complete`, {
        technician_notes: notes,
        after_image_url: uploadedUrl,
      });

      setSuccessToast(res.data.message);
      setActiveTaskId(null);
      setNotes('');
      setAfterImageFile(null);
      setAfterImagePreview(null);
      loadTasks();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete job');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Technician Field Workbench
              </h1>
              <p className="text-xs text-slate-400">
                Logged in as <strong>{user?.full_name}</strong> • <span className="text-amber-400 font-semibold">{user?.skill_category || 'HVAC'} Specialist</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadTasks} className="border-slate-800 text-slate-300">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-slate-800 text-slate-300">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-medium text-sm">{successToast}</span>
          </div>
        )}

        {/* Work Orders List */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">My Assigned Work Orders ({tasks.length})</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Execute assigned repairs, update operational status, and record photographic completion evidence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading your assigned work orders...
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No work orders currently assigned to you. Great job!
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((wo) => {
                  const req = wo.Request || wo.request;
                  const room = req?.Room || req?.room;
                  const floor = room?.Floor || room?.floor;
                  const building = floor?.Building || floor?.building;
                  const reporter = req?.Reporter || req?.reporter;
                  const asset = req?.Asset || req?.asset;

                  const sla = getRemainingSLA(wo.sla_deadline || wo.SLADeadline);
                  const isCompleted = wo.status === 'COMPLETED' || wo.status === 'CLOSED';

                  return (
                    <div
                      key={wo.ID}
                      className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 hover:border-slate-700 transition"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">{req?.ticket_number}</span>
                          <Badge
                            className={`text-[10px] ${
                              wo.status === 'ASSIGNED' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                              wo.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            Status: {wo.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                            {building?.name || 'Faculty'} • Room {room?.room_number || 'General'}
                          </Badge>
                        </div>

                        {/* SLA Countdown Timer */}
                        {sla && !isCompleted && (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-mono px-2.5 py-0.5 flex items-center gap-1 ${
                              sla.breached 
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <Hourglass className="w-3 h-3" />
                            {sla.breached ? '🔴 SLA OVERDUE' : `⚡ SLA: ${sla.text}`}
                          </Badge>
                        )}
                      </div>

                      {/* Equipment & Description */}
                      <div className="space-y-1">
                        {asset && (
                          <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Target Equipment: {asset.name} [{asset.asset_tag}]
                          </div>
                        )}
                        <p className="text-sm text-slate-200">{req?.description}</p>
                      </div>

                      {/* Before Photo & Reporter Info */}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        {req?.image_url && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Initial Problem Photo</span>
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-800">
                              <img src={req.image_url} alt="Initial Defect" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>Reported by: <strong className="text-slate-300">{reporter?.full_name || 'Campus User'}</strong></div>
                          <div>Room Type: <strong className="text-slate-300">{room?.room_type || 'General Facility'}</strong></div>
                        </div>
                      </div>

                      {/* Workflow State Machine Actions */}
                      <div className="border-t border-slate-900 pt-3">
                        {wo.status === 'ASSIGNED' && (
                          <Button
                            onClick={() => handleStartWork(wo.ID)}
                            disabled={actionLoading}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 shadow-lg shadow-amber-600/20"
                          >
                            <Play className="w-4 h-4 fill-white" /> Start Job (Begin Clock)
                          </Button>
                        )}

                        {wo.status === 'IN_PROGRESS' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Repair Completion Form
                              </span>
                            </div>

                            <textarea
                              value={activeTaskId === wo.ID ? notes : ''}
                              onChange={(e) => {
                                setActiveTaskId(wo.ID);
                                setNotes(e.target.value);
                              }}
                              placeholder="Describe what was repaired (e.g., Unclogged condensate drain line and recharged refrigerant R410A)..."
                              rows={3}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500"
                            />

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition">
                                  <Camera className="w-4 h-4 text-amber-400" />
                                  {afterImageFile ? 'Change After-Photo' : 'Attach Repaired Photo'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        setActiveTaskId(wo.ID);
                                        setAfterImageFile(file);
                                        setAfterImagePreview(URL.createObjectURL(file));
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                {afterImagePreview && activeTaskId === wo.ID && (
                                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/50">
                                    <img src={afterImagePreview} alt="After Preview" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>

                              <Button
                                onClick={() => handleCompleteWork(wo.ID)}
                                disabled={actionLoading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                              >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Complete & Submit for Verification
                              </Button>
                            </div>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> Work Completed • Awaiting Admin Final Verification
                            </div>
                            {wo.technician_notes && (
                              <p className="text-xs text-slate-300 italic">"{wo.technician_notes}"</p>
                            )}
                            {wo.after_image_url && (
                              <div className="pt-1">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Repaired Evidence</span>
                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 mt-1">
                                  <img src={wo.after_image_url} alt="Repaired" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}