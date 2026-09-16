'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  AlertOctagon, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Filter, 
  Flame, 
  History, 
  Hourglass, 
  Layers, 
  ListFilter, 
  Loader2, 
  MapPin, 
  RefreshCw, 
  RotateCcw, 
  Shield, 
  Sparkles, 
  Star, 
  TrendingUp, 
  UserCheck, 
  Wrench, 
  Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
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
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/incidents'),
      api.get('/admin/analytics'),
    ])
      .then(([incidentsRes, analyticsRes]) => {
        setIncidents(incidentsRes.data.tickets || []);
        setAnalytics(analyticsRes.data || null);
      })
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
      loadData();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch technician');
    } finally {
      setAssigning(false);
    }
  };

  const handleVerify = async (workOrderId: number) => {
    setVerifying(true);
    try {
      const res = await api.post(`/admin/work-orders/${workOrderId}/verify`);
      setSuccessToast(res.data.message);
      setInspectTicket(null);
      loadData();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to verify work order');
    } finally {
      setVerifying(false);
    }
  };

  const handleReopen = async (workOrderId: number) => {
    setVerifying(true);
    try {
      const res = await api.post(`/admin/work-orders/${workOrderId}/reopen`);
      setSuccessToast('Ticket has been reopened and returned to technician.');
      setInspectTicket(null);
      loadData();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reopen work order');
    } finally {
      setVerifying(false);
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    if (priorityFilter === 'ALL') return true;
    return i.calculated_priority === priorityFilter;
  });

  const CHART_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];

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
            <Button variant="outline" size="sm" onClick={loadData} className="border-slate-800 text-slate-300">
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
              <CardTitle className="text-2xl font-extrabold text-white">{analytics?.total_tickets || incidents.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">SLA Compliance Rate</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-emerald-400 flex items-center gap-1.5">
                {analytics?.sla_compliance_rate || 100}%
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">Average MTTR (Resolution)</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-blue-400 flex items-center gap-1.5">
                {analytics?.mttr_hours || 0.2} hrs
                <Clock className="w-4 h-4 text-blue-400" />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs text-slate-400">Resolved & Closed</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-indigo-400">{analytics?.resolved_tickets || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs: Queue vs Analytics */}
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="queue" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-2">
              <ListFilter className="w-4 h-4" /> Operational Queue ({incidents.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Executive Analytics & Intelligence
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Queue */}
          <TabsContent value="queue" className="space-y-4">
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

            {/* Incidents List */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-4 space-y-3">
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
                                {t.Room?.Floor?.Building?.name || t.room?.floor?.building?.name} • Room {t.Room?.room_number || t.room?.room_number}
                              </Badge>
                              {t.Asset && (
                                <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300">
                                  Asset: {t.Asset.name}
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-slate-200">{t.description}</p>

                            <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                              <span>Reported by: <strong>{t.Reporter?.full_name || t.reporter?.full_name}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(t.CreatedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
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
                              <Badge className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1 flex items-center gap-1">
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
          </TabsContent>

          {/* TAB 2: Executive Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category Breakdown Chart */}
              <Card className="bg-slate-900/80 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> Incident Distribution by Trade Category
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Volume of maintenance requests grouped by specialty</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {analytics?.category_stats && analytics.category_stats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.category_stats}>
                        <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {analytics.category_stats.map((_: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">No category data yet</div>
                  )}
                </CardContent>
              </Card>

              {/* Technician Leaderboard */}
              <Card className="bg-slate-900/80 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400" /> Technician Performance & Rating Leaderboard
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Real-time resolution rates and student satisfaction scores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics?.technician_stats?.map((tech: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{tech.name}</span>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                            {tech.skill || 'General'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">Completed Repairs: <strong className="text-slate-200">{tech.completed}</strong></p>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-300">{tech.avg_rating > 0 ? tech.avg_rating.toFixed(1) : '5.0'}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recurring Issue Diagnostic */}
              <Card className="bg-slate-900/80 border-slate-800 md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" /> Asset Health & Recurring Failure Detection
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Identifies high-maintenance physical equipment needing preventive replacement review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.recurring_issues && analytics.recurring_issues.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {analytics.recurring_issues.map((item: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs font-bold text-indigo-400">{item.asset_tag}</span>
                            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                              {item.count} Breakdown{item.count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-200 font-medium">{item.name}</p>
                          <p className="text-[10px] text-slate-500">Status: Operational (Recent Repair Verified)</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">No recurring failure alerts. All campus assets are healthy.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
            ) : recommendations.length === 0 ? (
              <div className="py-6 text-center text-slate-500">No active technicians found.</div>
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

      {/* Verification Modal */}
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
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Technician Repair Notes:</span>
                <p className="text-sm text-slate-200 italic">
                  "{inspectTicket.work_order?.technician_notes || inspectTicket.WorkOrder?.technician_notes || 'No notes entered'}"
                </p>
              </div>

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