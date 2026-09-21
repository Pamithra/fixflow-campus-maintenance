'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  AlertOctagon, 
  AlertTriangle,
  BarChart3, 
  Camera,
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
  Phone,
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
import Navbar from '@/components/Navbar';
import PhotoPreviewModal, { PhotoPreviewState } from '@/components/PhotoPreviewModal';
import { resolveImageUrl, getCategoryFallbackPhoto } from '@/lib/utils';

const getBuildingDisplayName = (buildingName?: string, roomNumber?: string) => {
  if (buildingName && buildingName !== 'Main Building' && !buildingName.includes('Faculty of')) {
    return buildingName.replace('Phase 1 (Old Building)', 'Old Building').replace('Phase 2 (New Building)', 'New Building');
  }
  const rm = roomNumber || '';
  if (rm.startsWith('0LH') || rm.startsWith('1LH03') || rm.startsWith('2LH02') || rm.startsWith('2LH03') || rm.startsWith('4LH02') || rm.includes('ERP') || rm.includes('Data Sciences') || rm.includes('HPC') || rm.includes('Phase 2')) {
    return 'New Building';
  }
  return 'Old Building';
};

export default function AdminDashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Dispatch Modal State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Verification & Audit Modal State
  const [inspectTicket, setInspectTicket] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<PhotoPreviewState | null>(null);

  // Filter State
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PENDING' | 'ONGOING' | 'COMPLETED' | 'CLOSED'>('ALL');
  
  const { connected: wsConnected } = useWebSocket((event) => {
    console.log('Real-Time Event Received:', event);
    // Show instant toast notification
    setSuccessToast(event.message);
    // Automatically re-fetch data silently in background without full-screen reload
    loadData(true);
    setTimeout(() => setSuccessToast(''), 6000);
  });

  // Role Guard & Data Loader
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('fixflow_logging_out') === 'true') {
      return;
    }
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/dashboard');
      } else if (user.role !== 'ADMIN') {
        if (user.role === 'TECHNICIAN') {
          router.push('/tasks');
        } else {
          router.push('/report');
        }
      } else {
        loadData(false);
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      // Periodic background silent sync every 30s (no UI flicker)
      const interval = setInterval(() => loadData(true), 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      api.get('/admin/incidents'),
      api.get('/admin/analytics'),
    ])
      .then(([incidentsRes, analyticsRes]) => {
        setIncidents(incidentsRes.data.tickets || []);
        setAnalytics(analyticsRes.data || null);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  const getRemainingSLA = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - Date.now();
    const deadlineTime = new Date(deadlineStr).getTime();
    if (isNaN(deadlineTime) || deadlineTime <= 0) return null;
    if (diff <= 0) return { text: 'SLA BREACHED', breached: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${minutes}m remaining`, breached: false };
  };

  const openDispatch = (ticket: any) => {
    setSelectedTicket(ticket);
    setLoadingRecs(true);
    setRecommendations([]);
    setTargetCategory('');
    setFilterFreeOnly(false);

    api.get(`/admin/incidents/${ticket.ID || ticket.id}/recommendations`)
      .then((res) => {
        setRecommendations(res.data.recommendations || []);
        setTargetCategory(res.data.target_category || '');
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingRecs(false));
  };

  const handleAssign = async (techId: number) => {
    if (!selectedTicket) return;
    setAssigning(true);

    try {
      const isReassign = isIncidentOverdue(selectedTicket) || selectedTicket.work_order || selectedTicket.WorkOrder;
      const res = await api.post('/admin/assign', {
        request_id: selectedTicket.ID || selectedTicket.id,
        technician_id: techId,
      });

      setSuccessToast(res.data.message || (isReassign ? 'Work order successfully reassigned! Task moved to Ongoing Tasks.' : 'Work order dispatched!'));
      setSelectedTicket(null);
      // Immediately switch to Ongoing Tasks tab to display the reassigned job
      if (isReassign) {
        setStatusFilter('ONGOING');
      }
      loadData(true);
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
      loadData(true);
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
      loadData(true);
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reopen work order');
    } finally {
      setVerifying(false);
    }
  };

  // Helper to check if an incident's work order has passed deadline
  const isIncidentOverdue = (i: any) => {
    if (!i) return false;
    if (i.status === 'CLOSED') return false;
    const wo = i.work_order || i.WorkOrder;
    if (!wo || wo.status === 'COMPLETED' || wo.status === 'CLOSED') return false;
    const deadlineStr = wo.sla_deadline || wo.SLADeadline;
    if (!deadlineStr) return false;
    const deadlineTime = new Date(deadlineStr).getTime();
    if (isNaN(deadlineTime) || deadlineTime <= 0) return false;
    return deadlineTime <= Date.now() || wo.sla_breached === true || wo.SLABreached === true;
  };

  // Helper to check if an incident is pending dispatch (unassigned)
  const isIncidentPending = (i: any) => {
    if (!i || isIncidentOverdue(i)) return false;
    if (i.status === 'CLOSED') return false;
    const wo = i.work_order || i.WorkOrder;
    if (!wo) return true;
    if (wo.status === 'COMPLETED' || wo.status === 'CLOSED') return false;
    const techId = wo.technician_id || wo.TechnicianID;
    if (!techId) return true;
    return wo.status === 'PENDING' || wo.status === 'REPORTED';
  };

  // Helper to check if an incident is ongoing (assigned or in-progress, not overdue)
  const isIncidentOngoing = (i: any) => {
    if (!i || isIncidentOverdue(i)) return false;
    if (i.status === 'CLOSED') return false;
    const wo = i.work_order || i.WorkOrder;
    if (!wo) return false;
    if (wo.status === 'COMPLETED' || wo.status === 'CLOSED') return false;
    const techId = wo.technician_id || wo.TechnicianID;
    if (!techId) return false;
    return wo.status === 'ASSIGNED' || wo.status === 'IN_PROGRESS';
  };

  // Filter counts
  const allCount = incidents.length;
  const overdueCount = incidents.filter((i) => isIncidentOverdue(i)).length;
  const pendingCount = incidents.filter((i) => isIncidentPending(i)).length;
  const ongoingCount = incidents.filter((i) => isIncidentOngoing(i)).length;
  const completedCount = incidents.filter((i) => {
    const wo = i.work_order || i.WorkOrder;
    return wo && wo.status === 'COMPLETED';
  }).length;
  const closedCount = incidents.filter((i) => {
    const wo = i.work_order || i.WorkOrder;
    return i.status === 'CLOSED' || wo?.status === 'CLOSED';
  }).length;

  const filteredIncidents = incidents.filter((i) => {
    const wo = i.work_order || i.WorkOrder;

    // 1. Status Filter
    if (statusFilter === 'OVERDUE') {
      if (!isIncidentOverdue(i)) return false;
    } else if (statusFilter === 'PENDING') {
      if (!isIncidentPending(i)) return false;
    } else if (statusFilter === 'ONGOING') {
      if (!isIncidentOngoing(i)) return false;
    } else if (statusFilter === 'COMPLETED') {
      if (!wo || wo.status !== 'COMPLETED') return false;
    } else if (statusFilter === 'CLOSED') {
      if (i.status !== 'CLOSED' && (!wo || wo.status !== 'CLOSED')) return false;
    }

    // 2. Priority Filter
    if (priorityFilter !== 'ALL' && i.calculated_priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  const CHART_COLORS = ['#6366F1', '#F59E0B', '#06B6D4', '#10B981'];

  const TRADE_SPECIALTIES_4 = [
    { 
      key: 'General Maintenance', 
      label: 'General Maintenance', 
      detail: 'Air Conditioning & General', 
      match: (cat: string) => /general|other|air condition|hvac|cooling|furn|chair|desk|table|door/i.test(cat) || cat === 'General' 
    },
    { 
      key: 'Electrical & Power', 
      label: 'Electrical & Power', 
      detail: 'Electrical & Power Systems', 
      match: (cat: string) => /electric|light|power|socket|bulb/i.test(cat) || cat === 'Electrical' 
    },
    { 
      key: 'Plumbing & Water', 
      label: 'Plumbing & Water', 
      detail: 'Plumbing & Water Fixtures', 
      match: (cat: string) => /plumb|water|pipe|washroom|toilet|sink|leak/i.test(cat) || cat === 'Plumbing' 
    },
    { 
      key: 'IT & Projectors', 
      label: 'IT & Projectors', 
      detail: 'IT Hardware, Network & Projectors', 
      match: (cat: string) => /it|computer|pc|workstation|network|wifi|wi-fi|router|projector|display|screen|av/i.test(cat) || cat === 'IT' 
    },
  ];

  const categoryChartData = useMemo(() => {
    // 1. Calculate live counts from current loaded tickets
    const incidentCounts: Record<string, number> = {};
    TRADE_SPECIALTIES_4.forEach((s) => { incidentCounts[s.key] = 0; });

    if (incidents && incidents.length > 0) {
      incidents.forEach((inc: any) => {
        const cat = `${inc.equipment_category || ''} ${inc.custom_equipment_name || ''}`;
        let matched = false;
        for (const spec of TRADE_SPECIALTIES_4) {
          if (spec.match(cat)) {
            incidentCounts[spec.key]++;
            matched = true;
            break;
          }
        }
        if (!matched) {
          incidentCounts['General Maintenance']++;
        }
      });
    }

    // 2. Merge with backend analytics.category_stats if backend reported counts
    return TRADE_SPECIALTIES_4.map((spec) => {
      let count = incidentCounts[spec.key] || 0;
      if (analytics?.category_stats && Array.isArray(analytics.category_stats)) {
        analytics.category_stats.forEach((cs: any) => {
          if (spec.match(cs.category || '')) {
            if (typeof cs.count === 'number' && cs.count > count) {
              count = cs.count;
            }
          }
        });
      }
      return {
        category: spec.key,
        detail: spec.detail,
        count,
      };
    });
  }, [incidents, analytics]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Verifying Dispatcher Privileges...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 space-y-6 overflow-x-hidden w-full max-w-full">
      <Navbar />

      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
        
        {/* Sub-Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800 backdrop-blur w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                Incident Command & Dispatch Center
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  wsConnected 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">Triage campus incidents, review AI recommendations, and dispatch technicians</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(false)} className="w-full sm:w-auto border-slate-800 text-slate-300 hover:text-white text-xs shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Incidents
          </Button>
        </div>

        {/* Live Notification Banner */}
        {successToast && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5 sm:gap-3 animate-in fade-in text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-medium">{successToast}</span>
          </div>
        )}

        {/* Operational Bento KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription className="text-[11px] sm:text-xs text-slate-400">Total Incidents</CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-white">{analytics?.total_tickets || incidents.length}</CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5 sm:mt-1">Campus requests logged across faculty</p>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription className="text-[11px] sm:text-xs text-slate-400">SLA Compliance Rate</CardDescription>
              <CardTitle className={`text-xl sm:text-2xl font-extrabold flex items-center gap-1.5 ${
                (analytics?.sla_compliance_rate ?? 100) >= 90 ? 'text-emerald-400' :
                (analytics?.sla_compliance_rate ?? 100) >= 75 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {analytics?.sla_compliance_rate ?? 100}%
                <TrendingUp className="w-4 h-4" />
              </CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5 sm:mt-1">% of repairs finished within target deadline</p>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription className="text-[11px] sm:text-xs text-slate-400">Average MTTR (Repair Time)</CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-blue-400 flex items-center gap-1.5">
                {analytics?.mttr_hours || 0.2} hrs
                <Clock className="w-4 h-4 text-blue-400" />
              </CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5 sm:mt-1">Mean hours to diagnose & complete fixes</p>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription className="text-[11px] sm:text-xs text-slate-400">Resolved & Closed</CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-indigo-400">{analytics?.resolved_tickets || 0}</CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5 sm:mt-1">Inspected & verified by administrator</p>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs: Queue vs Analytics */}
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="bg-slate-900/90 border border-slate-800 p-1.5 w-full grid grid-cols-2 gap-1.5 h-auto rounded-xl shadow-lg">
            <TabsTrigger 
              value="queue" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition shadow-sm"
            >
              <ListFilter className="w-4 h-4 shrink-0" />
              <span className="truncate">Operational Queue ({incidents.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition shadow-sm"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="truncate">Executive Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Queue */}
          <TabsContent value="queue" className="space-y-4">
            {/* Status & Priority Filter Controls */}
            <div className="space-y-2.5 bg-slate-900/60 p-3 sm:p-3.5 rounded-xl border border-slate-800 w-full min-w-0">
              {/* Lifecycle Status Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium mr-1 w-full sm:w-auto">
                  <ListFilter className="w-3.5 h-3.5 text-indigo-400" /> Work Order Status:
                </span>
                
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 ${
                    statusFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All Tasks
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 font-mono">
                    {allCount}
                  </span>
                </button>

                {/* Passed Deadline (Overdue) - Dedicated Red Category */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('OVERDUE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 ${
                    statusFilter === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-rose-500 ${overdueCount > 0 ? 'animate-ping' : ''}`} />
                  Passed Deadline
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">
                    {overdueCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Pending Dispatch
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-mono">
                    {pendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('ONGOING')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 ${
                    statusFilter === 'ONGOING'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-blue-300 border border-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Ongoing Tasks
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    {ongoingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 ${
                    statusFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Needs Verification
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    {completedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('CLOSED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 ${
                    statusFilter === 'CLOSED'
                      ? 'bg-slate-700 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Resolved & Closed
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 font-mono">
                    {closedCount}
                  </span>
                </button>
              </div>

              {/* Severity / Priority Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium mr-1 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5" /> Severity Filter:
                </span>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPriorityFilter(lvl)}
                    className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition ${
                      priorityFilter === lvl ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
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
                    No incidents match the active status/priority filter.
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

                      const room = t.Room || t.room;
                      const floor = room?.Floor || room?.floor;
                      const building = floor?.Building || floor?.building;

                      return (
                        <div
                          key={t.ID}
                          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-3"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-2 max-w-2xl">
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

                                {isIncidentOverdue(t) ? (
                                  <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse font-bold">
                                    🚨 PASSED DEADLINE (OVERDUE)
                                  </Badge>
                                ) : (
                                  <Badge className={`text-[10px] ${
                                    isClosed ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                                    isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' :
                                    wo?.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                                    wo?.status === 'ASSIGNED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                    'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  }`}>
                                    {isClosed ? 'CLOSED' : isCompleted ? 'COMPLETED (PENDING VERIFICATION)' : (wo?.status === 'IN_PROGRESS' ? 'REPAIR UNDERWAY' : wo?.status === 'ASSIGNED' ? 'READY TO START (ASSIGNED)' : 'PENDING DISPATCH')}
                                  </Badge>
                                )}

                                {(t.custom_equipment_name || t.equipment_category || t.Asset?.name) && (
                                  <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300">
                                    Equipment: {t.custom_equipment_name || t.equipment_category || t.Asset?.name}
                                  </Badge>
                                )}
                              </div>

                              {/* Exact Maintenance Location Path */}
                              <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[10px]">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  <span>Exact Maintenance Location Path:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                                    IT Faculty
                                  </span>
                                  <span className="text-slate-600 font-bold">➔</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-medium">
                                    {floor ? (floor.floor_number === 0 ? 'Floor 0 (Ground Floor)' : `Floor ${floor.floor_number}`) : 'Ground Floor'}
                                  </span>
                                  <span className="text-slate-600 font-bold">➔</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-medium">
                                    {getBuildingDisplayName(building?.name, room?.room_number)}
                                  </span>
                                  <span className="text-slate-600 font-bold">➔</span>
                                  <span className="px-2.5 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/40 text-white font-bold">
                                    Room {room?.room_number || 'General'} {room?.room_type ? `(${room.room_type})` : ''}
                                  </span>
                                </div>
                              </div>

                              <p className="text-sm text-slate-200">{t.description}</p>

                              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                                <span>Reported by: <strong className="text-slate-300">{t.Reporter?.full_name || t.reporter?.full_name}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(t.CreatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons & SLA */}
                            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                              {sla && !isCompleted && !isClosed && (
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] font-mono px-2 py-0.5 flex items-center justify-center gap-1 ${
                                    sla.breached 
                                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <Hourglass className="w-3 h-3" />
                                  {sla.breached ? '🔴 SLA OVERDUE' : `⚡ SLA: ${sla.text}`}
                                </Badge>
                              )}

                              {t.status === 'REPORTED' || (!wo?.technician_id && !wo?.TechnicianID) ? (
                                <Button
                                  onClick={() => openDispatch(t)}
                                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 sm:py-1.5 h-auto flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 font-medium"
                                >
                                  <Zap className="w-3.5 h-3.5" /> Dispatch Tech
                                </Button>
                              ) : isCompleted ? (
                                <Button
                                  onClick={() => setInspectTicket(t)}
                                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 sm:py-1.5 h-auto flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 font-medium animate-pulse"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Inspect & Verify
                                </Button>
                              ) : isClosed ? (
                                <Badge className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1.5 flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolved & Verified
                                </Badge>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                  <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                    {tech?.full_name || 'Assigned'}
                                  </Badge>

                                  {isIncidentOverdue(t) && (
                                    <Button
                                      size="sm"
                                      onClick={() => openDispatch(t)}
                                      className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white text-xs px-2.5 py-1.5 h-8 sm:h-7 flex items-center justify-center gap-1 shadow-md shadow-rose-600/20 font-semibold"
                                    >
                                      <RefreshCw className="w-3 h-3" /> Reassign Technician
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Assigned Technician Detailed Card */}
                          {tech && !isClosed && (
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-indigo-400" />
                                <span className="text-slate-300 font-medium">
                                  Assigned Technician: <strong className="text-white">{tech.full_name}</strong>
                                </span>
                                {tech.skill_category && (
                                  <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] py-0 px-1.5">
                                    🎯 {tech.skill_category} Specialist
                                  </Badge>
                                )}
                              </div>
                              {tech.phone_number && (
                                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                                  <Phone className="w-3 h-3 text-emerald-400" />
                                  <span>Phone: <a href={`tel:${tech.phone_number}`} className="text-indigo-300 hover:underline">{tech.phone_number}</a></span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Closed Summary Banner */}
                          {isClosed && (wo?.technician_notes || wo?.after_image_url) && (
                            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Work Order Verified & Closed by Administrator
                              </div>
                              {wo.technician_notes && (
                                <p className="text-xs text-slate-400">
                                  <span className="text-slate-400 font-medium">Final Repair Notes:</span> "{wo.technician_notes}"
                                </p>
                              )}
                              {wo.after_image_url && (
                                <div 
                                  className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700 mt-1 cursor-pointer bg-slate-950 relative group flex items-center justify-center" 
                                  onClick={() => setPreviewPhoto({
                                    url: resolveImageUrl(wo.after_image_url),
                                    title: `Repaired Equipment - Ticket #${t.ticket_number}`,
                                    subtitle: `${t.equipment_category || 'Equipment'} • Room ${t.Room?.room_number || t.room?.room_number || 'General'}`,
                                    category: t.equipment_category,
                                    equipmentName: t.custom_equipment_name
                                  })}
                                >
                                  <img 
                                    src={resolveImageUrl(wo.after_image_url)} 
                                    alt="Repaired Evidence" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                    onError={(e) => {
                                      const fallback = getCategoryFallbackPhoto(t.equipment_category, t.custom_equipment_name);
                                      if (e.currentTarget.src !== fallback) {
                                        e.currentTarget.src = fallback;
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-semibold">
                                    <Eye className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
              <Card className="bg-slate-900/80 border-slate-800 w-full min-w-0 overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> Incident Distribution by Trade Category
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Volume of maintenance requests across the 4 core technician trade specialties</CardDescription>
                </CardHeader>
                <CardContent className="h-72 sm:h-80 w-full min-w-0 p-2 sm:p-6 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 28 }}>
                      <XAxis 
                        dataKey="category" 
                        stroke="#64748b" 
                        fontSize={11}
                        interval={0}
                        angle={-10}
                        textAnchor="end"
                        tick={{ fill: '#94a3b8' }}
                      />
                      <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [`${val} Tickets`, item?.payload?.detail ? `${item.payload.category} (${item.payload.detail})` : item?.payload?.category || name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {categoryChartData.map((_: any, idx: number) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
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

                      {tech.completed > 0 && tech.avg_rating > 0 ? (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-amber-300">{tech.avg_rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-slate-800/40 border border-slate-800 px-2.5 py-1 rounded-md text-slate-500">
                          <Star className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-[11px] font-medium text-slate-400">No reviews</span>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dispatch Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[88vh] overflow-y-auto overflow-x-hidden p-3.5 sm:p-6">
          <DialogHeader className="pr-7 sm:pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" /> 
              <span className="truncate">{selectedTicket?.work_order || isIncidentOverdue(selectedTicket) ? 'Reassign Maintenance Technician' : 'Technician Dispatch Engine'}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {selectedTicket?.work_order || isIncidentOverdue(selectedTicket)
                ? `Reassigning ${selectedTicket?.ticket_number}. Select an available technician to take over and expedite this repair.`
                : `Assigning ${selectedTicket?.ticket_number}. Technicians are evaluated by current availability (0 active tasks) and trade specialty match.`}
            </DialogDescription>
          </DialogHeader>

          {/* Ticket Context Banner */}
          {selectedTicket && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-300">
                  Target Equipment: <strong className="text-indigo-300">{selectedTicket.custom_equipment_name || selectedTicket.equipment_category || selectedTicket.Asset?.name || 'General Equipment'}</strong>
                </span>
                <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                  Required Specialty: {targetCategory || 'General'}
                </Badge>
              </div>
              <p className="text-slate-400 text-[11px] truncate">"{selectedTicket.description}"</p>
            </div>
          )}

          {/* Availability Filter Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-300">Technician Availability:</span>
            <div className="flex items-center gap-1.5 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterFreeOnly(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  !filterFreeOnly 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({recommendations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterFreeOnly(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                  filterFreeOnly 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-emerald-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Free Only ({recommendations.filter((r) => r.is_available || r.active_workload === 0).length})
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {loadingRecs ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Evaluating technician availability & skills...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">No active technicians found.</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] sm:max-h-96 overflow-y-auto pr-1">
                {recommendations
                  .filter((rec) => (!filterFreeOnly ? true : rec.is_available || rec.active_workload === 0))
                  .map((rec, idx) => {
                    const techId = rec.technician.ID || rec.technician.id;
                    const isFree = rec.is_available || rec.active_workload === 0;
                    const isBestMatch = idx === 0 || (isFree && rec.skill_match);

                    return (
                      <div
                        key={techId}
                        className={`p-2.5 sm:p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition ${
                          isBestMatch
                            ? 'bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-500/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full">{rec.technician.full_name}</span>
                            
                            {/* Availability Pill */}
                            {isFree ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Free (0 Active Tasks)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300/80 bg-amber-500/10">
                                ⏳ Busy ({rec.active_workload} active jobs)
                              </Badge>
                            )}

                            {/* Mobile score indicator */}
                            <Badge className="sm:hidden bg-indigo-500/15 border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
                              {rec.match_score} pts
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <span>Trade: <strong className="text-slate-300">{rec.technician.skill_category || 'General'}</strong></span>
                            {rec.technician.phone_number && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span>Phone: <a href={`tel:${rec.technician.phone_number}`} className="text-slate-300 hover:underline">{rec.technician.phone_number}</a></span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs font-mono font-bold text-indigo-400">{rec.match_score} pts</span>
                            <p className="text-[9px] text-slate-500">Score</p>
                          </div>
                          <Button
                            size="sm"
                            disabled={assigning}
                            onClick={() => handleAssign(techId)}
                            className={`w-full sm:w-auto text-xs h-8 font-medium shadow-md ${
                              isFree
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {selectedTicket?.work_order || isIncidentOverdue(selectedTicket) ? 'Reassign Task' : 'Assign Task'}
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
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[88vh] overflow-y-auto overflow-x-hidden p-3.5 sm:p-6">
          <DialogHeader className="pr-7 sm:pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> 
              <span>Repair Inspection & Audit Trail</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Inspect technician repair notes and photographic evidence before closing the ticket.
            </DialogDescription>
          </DialogHeader>

          {inspectTicket && (
            <div className="space-y-4 pt-2">
              {/* Exact Location Path */}
              <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[10px]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Exact Maintenance Location Path:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                    IT Faculty
                  </span>
                  <span className="text-slate-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-medium">
                    {(inspectTicket.Room?.Floor || inspectTicket.room?.floor) ? ((inspectTicket.Room?.Floor?.floor_number ?? inspectTicket.room?.floor?.floor_number) === 0 ? 'Floor 0 (Ground Floor)' : `Floor ${(inspectTicket.Room?.Floor?.floor_number ?? inspectTicket.room?.floor?.floor_number)}`) : 'Ground Floor'}
                  </span>
                  <span className="text-slate-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-medium">
                    {getBuildingDisplayName(inspectTicket.Room?.Floor?.Building?.name || inspectTicket.room?.floor?.building?.name, inspectTicket.Room?.room_number || inspectTicket.room?.room_number)}
                  </span>
                  <span className="text-slate-600 font-bold">➔</span>
                  <span className="px-2.5 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/40 text-white font-bold">
                    Room {inspectTicket.Room?.room_number || inspectTicket.room?.room_number || 'General'} {(inspectTicket.Room?.room_type || inspectTicket.room?.room_type) ? `(${inspectTicket.Room?.room_type || inspectTicket.room?.room_type})` : ''}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Technician Repair Notes:</span>
                <p className="text-sm text-slate-200 italic">
                  "{inspectTicket.work_order?.technician_notes || inspectTicket.WorkOrder?.technician_notes || 'No notes entered'}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                    Initial Defect Photo
                  </span>
                  <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center relative group">
                    {inspectTicket.image_url ? (
                      <>
                        <img 
                          src={resolveImageUrl(inspectTicket.image_url)} 
                          alt="Initial Defect" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewPhoto({
                            url: resolveImageUrl(inspectTicket.image_url),
                            title: `Initial Defect Photo - Ticket #${inspectTicket.ticket_number}`,
                            subtitle: `${inspectTicket.equipment_category || 'Equipment'} • Room ${inspectTicket.Room?.room_number || inspectTicket.room?.room_number || 'General'}`,
                            category: inspectTicket.equipment_category,
                            equipmentName: inspectTicket.custom_equipment_name
                          })}
                          onError={(e) => {
                            const fallback = getCategoryFallbackPhoto(inspectTicket.equipment_category, inspectTicket.custom_equipment_name);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                        <div 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5 cursor-pointer pointer-events-none"
                        >
                          <Eye className="w-4 h-4" /> Click to enlarge
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">No before photo uploaded</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    Repaired Completion Photo
                  </span>
                  <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center relative group">
                    {(inspectTicket.work_order?.after_image_url || inspectTicket.WorkOrder?.after_image_url) ? (
                      <>
                        <img 
                          src={resolveImageUrl(inspectTicket.work_order?.after_image_url || inspectTicket.WorkOrder?.after_image_url)} 
                          alt="Repaired Completion" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewPhoto({
                            url: resolveImageUrl(inspectTicket.work_order?.after_image_url || inspectTicket.WorkOrder?.after_image_url),
                            title: `Repaired Completion Photo - Ticket #${inspectTicket.ticket_number}`,
                            subtitle: `Verified Fix for ${inspectTicket.equipment_category || 'Equipment'}`,
                            category: inspectTicket.equipment_category,
                            equipmentName: inspectTicket.custom_equipment_name
                          })}
                          onError={(e) => {
                            const fallback = getCategoryFallbackPhoto(inspectTicket.equipment_category, inspectTicket.custom_equipment_name);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                        <div 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5 cursor-pointer pointer-events-none"
                        >
                          <Eye className="w-4 h-4" /> Click to enlarge
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">No completion photo uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-slate-800">
                <Button
                  variant="outline"
                  disabled={verifying}
                  onClick={() => handleReopen((inspectTicket.work_order?.ID || inspectTicket.WorkOrder?.ID))}
                  className="w-full sm:w-auto border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs h-9 sm:h-8 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reject & Reopen Job
                </Button>

                <Button
                  disabled={verifying}
                  onClick={() => handleVerify((inspectTicket.work_order?.ID || inspectTicket.WorkOrder?.ID))}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 sm:h-8 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 font-semibold"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve & Close Incident
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Enlarge Pop-up Modal */}
      <PhotoPreviewModal photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}