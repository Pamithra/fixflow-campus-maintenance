'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Filter, 
  History, 
  Hourglass, 
  Loader2, 
  MapPin, 
  RefreshCw, 
  RotateCcw, 
  Shield, 
  Sparkles, 
  UserCheck, 
  Wrench, 
  Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Modal State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Verification & Audit Modal State
  const [inspectTicket, setInspectTicket] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Filter State
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadIncidents = () => {
    setLoading(true);
    api.get('/admin/incidents')
      .then((res) => setIncidents(res.data.tickets || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const getRemainingSLA = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return { text: 'SLA BREACHED', breached: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${minutes}m remaining`, breached: false };
  };

  const openDispatch = (ticket: any) => {
    setSelectedTicket(ticket);
    setLoadingRecs(true);
    setRecommendations([]);

    api.get(`/admin/incidents/${ticket.ID}/recommendations`)
      .then((res) => setRecommendations(res.data.recommendations || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingRecs(false));
  };

  const handleAssign = async (techId: number) => {
    if (!selectedTicket) return;
    setAssigning(true);

    try {
      const res = await api.post('/admin/assign', {
        request_id: selectedTicket.ID,
        technician_id: techId,
      });

      setSuccessToast(res.data.message);
      setSelectedTicket(null);
      loadIncidents();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch technician');
    } finally {
      setAssigning(false);
    }
  };

  // Verify and Close Job
  const handleVerify = async (workOrderId: number) => {
    setVerifying(true);
    try {
      const res = await api.post(`/admin/work-orders/${workOrderId}/verify`);
      setSuccessToast(res.data.message);
      setInspectTicket(null);
      loadIncidents();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to verify work order');
    } finally {
      setVerifying(false);
    }
  };

  // Reopen Job
  const handleReopen = async (workOrderId: number) => {
    setVerifying(true);
    try {
      const res = await api.post(`/admin/work-orders/${workOrderId}/reopen`);
      setSuccessToast('Ticket has been reopened and returned to technician.');
      setInspectTicket(null);
      loadIncidents();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reopen work order');
    } finally {
      setVerifying(false);
    }
  };

  // KPIs
  const totalCount = incidents.length;
  const pendingCount = incidents.filter((i) => i.status === 'REPORTED').length;
  const readyVerifyCount = incidents.filter((i) => {
    const wo = i.work_order || i.WorkOrder;
    return wo?.status === 'COMPLETED';
  }).length;
  const activeJobsCount = incidents.filter((i) => i.status === 'APPROVED').length;

  const filteredIncidents = incidents.filter((i) => {
    if (priorityFilter === 'ALL') return true;
    return i.calculated_priority === priorityFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Incident Command & Dispatch Center
              </h1>
              <p className="text-xs text-slate-400">Logged in as {user?.full_name} (Dispatcher)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadIncidents} className="border-slate-800 text-slate-300">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-slate-800 text-slate-300">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-medium text-sm">{successToast}</span>
          </div>
        )}

        {/* Operational Bento KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">Total Incidents</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-white">{totalCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">Pending Triage</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-amber-400">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">Ready for Verification</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-emerald-400">{readyVerifyCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">Active Work Orders</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-blue-400">{activeJobsCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 pb-1">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5" /> Severity Filter:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setPriorityFilter(lvl)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                priorityFilter === lvl ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Incident Queue */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Campus Incidents Queue</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Live tracking of reported campus issues, SLA timers, and technician completion evidence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading operational queue...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No incidents match the active filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map((t) => {
                  const wo = t.work_order || t.WorkOrder;
                  const tech = wo?.technician || wo?.Technician;
                  const slaDeadline = wo?.sla_deadline || wo?.SLADeadline;
                  const sla = getRemainingSLA(slaDeadline);
                  const isCompleted = wo?.status === 'COMPLETED';
                  const isClosed = t.status === 'CLOSED' || wo?.status === 'CLOSED';

                  return (
                    <div
                      key={t.ID}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">{t.ticket_number}</span>
                          <Badge
                            className={`text-[10px] ${
                              t.calculated_priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                              t.calculated_priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {t.calculated_priority} Priority
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                            {t.Room?.Floor?.Building?.name} • Room {t.Room?.room_number}
                          </Badge>
                          {t.Asset && (
                            <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300">
                              Asset: {t.Asset.name}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-200">{t.description}</p>

                        <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                          <span>Reported by: <strong>{t.Reporter?.full_name}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(t.CreatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end sm:items-center gap-2 shrink-0">
                        {t.status === 'REPORTED' ? (
                          <Button
                            onClick={() => openDispatch(t)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 h-auto flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                          >
                            <Zap className="w-3.5 h-3.5" /> Dispatch Tech
                          </Button>
                        ) : isCompleted ? (
                          <Button
                            onClick={() => setInspectTicket(t)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 h-auto flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 animate-pulse"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect & Verify
                          </Button>
                        ) : isClosed ? (
                          <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-xs px-3 py-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolved & Verified
                          </Badge>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                              {tech?.full_name || 'Kasun Perera'} ({wo?.status})
                            </Badge>

                            {sla && (
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-mono px-2 py-0.5 flex items-center gap-1 ${
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

      {/* Dispatch Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Dispatch Recommendation Engine
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Assigning {selectedTicket?.ticket_number}. Technicians are ranked by skill match and active workload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {loadingRecs ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Scoring available technicians...
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {recommendations.map((rec, idx) => {
                  const techId = rec.technician.ID || rec.technician.id;
                  return (
                    <div
                      key={techId}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{rec.technician.full_name}</span>
                          {idx === 0 && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px]">
                              Top Match
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Trade: <strong className="text-slate-200">{rec.technician.skill_category || 'General'}</strong></span>
                          <span>•</span>
                          <span>Active Jobs: <strong className="text-slate-200">{rec.active_workload}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-indigo-400">{rec.match_score} pts</span>
                          <p className="text-[10px] text-slate-500">Match Score</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={assigning}
                          onClick={() => handleAssign(techId)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                        >
                          Assign
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quality Verification & Audit Trail Modal */}
      <Dialog open={!!inspectTicket} onOpenChange={() => setInspectTicket(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Repair Inspection & Audit Trail
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Inspect technician repair notes and photographic evidence before closing the ticket.
            </DialogDescription>
          </DialogHeader>

          {inspectTicket && (
            <div className="space-y-4 pt-2">
              {/* Technician Notes */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Technician Repair Notes:</span>
                <p className="text-sm text-slate-200 italic">
                  "{inspectTicket.work_order?.technician_notes || inspectTicket.WorkOrder?.technician_notes || 'No notes entered'}"
                </p>
              </div>

              {/* Side-by-Side Photographic Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                    Initial Defect Photo
                  </span>
                  <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {inspectTicket.image_url ? (
                      <img src={inspectTicket.image_url} alt="Before" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-600">No before photo</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    Repaired Completion Photo
                  </span>
                  <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {(inspectTicket.work_order?.after_image_url || inspectTicket.WorkOrder?.after_image_url) ? (
                      <img src={inspectTicket.work_order?.after_image_url || inspectTicket.WorkOrder?.after_image_url} alt="After" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-600">No completion photo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-800">
                <Button
                  variant="outline"
                  disabled={verifying}
                  onClick={() => handleReopen((inspectTicket.work_order?.ID || inspectTicket.WorkOrder?.ID))}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reject & Reopen Job
                </Button>

                <Button
                  disabled={verifying}
                  onClick={() => handleVerify((inspectTicket.work_order?.ID || inspectTicket.WorkOrder?.ID))}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve & Close Incident
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}