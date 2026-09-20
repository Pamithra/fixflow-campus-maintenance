'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Check,
  Filter,
  ListFilter,
  Shield,
  Info,
  Zap,
  UserCheck,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Navbar from '@/components/Navbar';
import { resolveImageUrl } from '@/lib/utils';

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

export default function TechnicianTasksPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Dispatch / Reassign Modal State (for Admin)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [assigning, setAssigning] = useState(false);

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
      const res = await api.post('/admin/assign', {
        request_id: selectedTicket.ID || selectedTicket.id,
        technician_id: techId,
      });

      setSuccessToast(res.data.message);
      setSelectedTicket(null);
      loadTasks();
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign technician');
    } finally {
      setAssigning(false);
    }
  };

  // Completion Form State per task
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Role Guard & Data Loader
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('fixflow_logging_out') === 'true') {
      return;
    }
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/tasks');
      } else if (user.role === 'ADMIN') {
        router.push('/dashboard');
      } else if (user.role !== 'TECHNICIAN') {
        router.push('/report');
      } else {
        loadTasks();
      }
    }
  }, [user, authLoading, router]);

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
    if (diff <= 0) return { text: 'DEADLINE EXPIRED', breached: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${mins}m remaining`, breached: false };
  };

  // Action: Start Work
  const handleStartWork = async (taskId: number) => {
    setActionLoading(true);
    try {
      await api.patch(`/technician/tasks/${taskId}/start`);
      setSuccessToast('Job status updated to IN_PROGRESS. Work timer is running!');
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

      setSuccessToast(res.data.message || 'Repair successfully submitted for admin inspection!');
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

  // Helper to check if a task has passed deadline
  const isTaskOverdue = (wo: any) => {
    if (!wo) return false;
    if (wo.status === 'COMPLETED' || wo.status === 'CLOSED') return false;
    const deadlineStr = wo.sla_deadline || wo.SLADeadline;
    if (!deadlineStr) return false;
    return new Date(deadlineStr).getTime() <= Date.now();
  };

  // Filter Counts
  const allCount = tasks.length;
  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;
  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED' && !isTaskOverdue(t)).length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS' && !isTaskOverdue(t)).length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const closedCount = tasks.filter((t) => t.status === 'CLOSED').length;

  // Filtered Task List
  const filteredTasks = tasks.filter((t) => {
    const req = t.Request || t.request;
    const priority = req?.calculated_priority;
    const overdue = isTaskOverdue(t);

    // 1. Status Filter
    if (statusFilter === 'OVERDUE') {
      if (!overdue) return false;
    } else if (statusFilter === 'PENDING') {
      if (t.status !== 'PENDING') return false;
    } else if (statusFilter === 'ASSIGNED') {
      if (t.status !== 'ASSIGNED' || overdue) return false;
    } else if (statusFilter === 'IN_PROGRESS') {
      if (t.status !== 'IN_PROGRESS' || overdue) return false;
    } else if (statusFilter === 'COMPLETED') {
      if (t.status !== 'COMPLETED') return false;
    } else if (statusFilter === 'CLOSED') {
      if (t.status !== 'CLOSED') return false;
    }

    // 2. Priority Filter
    if (priorityFilter !== 'ALL' && priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  if (authLoading || !user || (user.role !== 'TECHNICIAN' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Maintenance Tasks Workbench...
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 space-y-6 overflow-x-hidden w-full max-w-full">
      <Navbar />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 space-y-6">
        
        {/* Sub-Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border shrink-0 ${isAdmin ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              {isAdmin ? <Shield className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                {isAdmin ? 'Campus Maintenance Tasks & Field Work Orders' : 'My Assigned Maintenance Tasks'}
              </h1>
              <p className="text-xs text-slate-400">
                Logged in as <strong>{user?.full_name}</strong> •{' '}
                {isAdmin ? (
                  <span className="text-purple-400 font-semibold">Campus Maintenance Administrator</span>
                ) : (
                  <span className="text-amber-400 font-semibold">{user?.skill_category || 'General'} Technician</span>
                )}
                {' '}{isAdmin ? '(Supervising all technician repair jobs across IT Faculty)' : '(Your assigned repair work orders)'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadTasks} className="w-full sm:w-auto border-slate-800 text-slate-300 hover:text-white text-xs shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Tasks
          </Button>
        </div>

        {/* Informative Guidance Box */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start sm:items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isAdmin ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-200">
              {isAdmin ? 'Administrator Field Supervisor Mode' : 'Technician Task Completion Guide'}
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {isAdmin 
                ? 'You are supervising all campus work orders across the IT Faculty. Use the filter bars below to track work order progress, monitor repair deadlines (SLAs), and inspect evidence submitted by technicians.'
                : 'Click "Start Repair Job" when you begin maintenance on-site. Once fixed, describe what was done and upload a photo of the completed repair to submit for Administrator sign-off.'
              }
            </p>
          </div>
        </div>

        {/* Dual Filter Bars */}
        <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
          {/* 1. Status Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium mr-1">
              <ListFilter className="w-3.5 h-3.5" /> Work Order Status:
            </span>
            {/* All Tasks */}
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
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

            {/* Passed Deadline (Overdue) - Dedicated Category */}
            <button
              type="button"
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
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

            {/* Pending Dispatch */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  statusFilter === 'PENDING'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-purple-300 border border-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Pending Dispatch
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  {pendingCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setStatusFilter('ASSIGNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'ASSIGNED'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-blue-300 border border-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Ready to Start
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-500/20 text-blue-300 font-mono">
                {assignedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Repair Underway
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {inProgressCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Awaiting Verification
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {completedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('CLOSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
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

          {/* 2. Priority / Severity Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium mr-1">
              <Filter className="w-3.5 h-3.5" /> Severity Filter:
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setPriorityFilter(lvl)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  priorityFilter === lvl 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
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
            <CardTitle className="text-white text-base">
              {isAdmin ? 'Campus Maintenance Work Orders' : 'My Assigned Work Orders'} ({filteredTasks.length})
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {isAdmin 
                ? 'Supervise technician work orders, inspect repair status, and review photographic evidence'
                : 'Execute assigned repairs, update operational status, and record photographic completion evidence'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading campus maintenance work orders...
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No work orders currently assigned. All systems are operational!
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg space-y-3">
                <p>No work orders match the selected filters ({statusFilter !== 'ALL' ? statusFilter : ''} {priorityFilter !== 'ALL' ? `${priorityFilter} Priority` : ''}).</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPriorityFilter('ALL');
                  }}
                  className="text-xs border-slate-800 text-indigo-400 hover:text-white"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((wo) => {
                  const req = wo.Request || wo.request;
                  const room = req?.Room || req?.room;
                  const floor = room?.Floor || room?.floor;
                  const building = floor?.Building || floor?.building;
                  const reporter = req?.Reporter || req?.reporter;
                  const asset = req?.Asset || req?.asset;

                  const sla = getRemainingSLA(wo.sla_deadline || wo.SLADeadline);
                  const isCompleted = wo.status === 'COMPLETED';
                  const isClosed = wo.status === 'CLOSED';

                  return (
                    <div
                      key={wo.ID}
                      className="p-3.5 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3.5 sm:space-y-4 hover:border-slate-700 transition"
                    >
                      {/* Top Bar: Ticket ID, Severity Badge, Status Badge, SLA */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">{req?.ticket_number}</span>
                          {(req?.created_at || req?.CreatedAt) && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(req.created_at || req.CreatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          )}
                          
                          {/* Priority / Severity Badge */}
                          <Badge
                            className={`text-[10px] ${
                              req?.calculated_priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              req?.calculated_priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              req?.calculated_priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-slate-700/50 text-slate-300 border border-slate-600'
                            }`}
                          >
                            {req?.calculated_priority || 'MEDIUM'} Priority
                          </Badge>

                          {/* Human-Friendly Status Badge */}
                          {isTaskOverdue(wo) ? (
                            <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse font-bold">
                              🚨 PASSED DEADLINE (OVERDUE)
                            </Badge>
                          ) : (
                            <Badge
                              className={`text-[10px] ${
                                wo.status === 'PENDING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse' :
                                wo.status === 'ASSIGNED' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                wo.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                                wo.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' :
                                'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {wo.status === 'PENDING' ? 'Pending Dispatch' :
                               wo.status === 'ASSIGNED' ? 'Ready to Start' :
                               wo.status === 'IN_PROGRESS' ? 'Repair Underway' :
                               wo.status === 'COMPLETED' ? 'Completed (Awaiting Sign-off)' :
                               'Resolved & Closed'}
                            </Badge>
                          )}
                        </div>

                        {/* SLA Countdown Timer */}
                        {sla && !isCompleted && !isClosed && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 flex items-center gap-1 max-w-full truncate self-start sm:self-auto ${
                              sla.breached 
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <Hourglass className="w-3 h-3 shrink-0" />
                            <span className="truncate">{sla.breached ? '🔴 SLA Overdue' : `⏱️ Deadline: ${sla.text}`}</span>
                          </Badge>
                        )}
                      </div>

                      {/* Exact Maintenance Location Breadcrumb */}
                      <div className="p-2.5 sm:p-3 rounded-lg bg-indigo-950/25 border border-indigo-500/20 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[10px] sm:text-[11px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>Exact Maintenance Location Path:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                            IT Faculty
                          </span>
                          <span className="text-slate-600 font-bold">➔</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-medium">
                            {floor ? (floor.floor_number === 0 ? 'Floor 0 (Ground)' : `Floor ${floor.floor_number}`) : 'Ground Floor'}
                          </span>
                          <span className="text-slate-600 font-bold">➔</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-medium">
                            {getBuildingDisplayName(building?.name, room?.room_number)}
                          </span>
                          <span className="text-slate-600 font-bold">➔</span>
                          <span className="px-2.5 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/40 text-white font-bold">
                            Room {room?.room_number || 'Main Area'} {room?.room_type ? `(${room.room_type})` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Equipment & Description */}
                      <div className="space-y-1">
                        {(req?.custom_equipment_name || req?.equipment_category || asset?.name) && (
                          <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Target Equipment: {req?.custom_equipment_name || req?.equipment_category || asset?.name} {asset?.asset_tag ? `[${asset.asset_tag}]` : ''}
                          </div>
                        )}
                        <p className="text-sm text-slate-200">{req?.description}</p>
                      </div>

                      {/* Before Photo & Personnel Info */}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        {req?.image_url && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Initial Problem Photo</span>
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-800 cursor-pointer" onClick={() => window.open(resolveImageUrl(req.image_url), '_blank')}>
                              <img 
                                src={resolveImageUrl(req.image_url)} 
                                alt="Initial Defect" 
                                className="w-full h-full object-cover hover:scale-105 transition" 
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>Reported by: <strong className="text-slate-300">{reporter?.full_name || 'Campus User'}</strong> {(req?.created_at || req?.CreatedAt) && <span className="text-slate-500 font-mono text-[11px] ml-1">at {new Date(req.created_at || req.CreatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>}</div>
                          <div>Assigned Technician: <strong className="text-indigo-300">{wo.Technician?.full_name || wo.technician?.full_name || user?.full_name || 'Assigned Technician'}</strong></div>
                        </div>
                      </div>

                      {/* Workflow State Actions */}
                      <div className="border-t border-slate-900 pt-3">
                        {wo.status === 'PENDING' && (
                          <div className="flex items-center justify-between gap-3">
                            {isAdmin ? (
                              <Button
                                onClick={() => openDispatch(req)}
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                              >
                                <Zap className="w-3.5 h-3.5" /> Dispatch Technician
                              </Button>
                            ) : (
                              <span className="text-xs text-purple-300 font-medium flex items-center gap-1.5">
                                <Hourglass className="w-3.5 h-3.5" /> Awaiting Administrator Dispatch to Technician
                              </span>
                            )}
                          </div>
                        )}

                        {isTaskOverdue(wo) && isAdmin && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 mb-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5" /> Passed SLA Resolution Deadline
                              </p>
                              <p className="text-[11px] text-slate-400">
                                This task exceeded its required completion time. Reassign to another technician to expedite resolution.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => openDispatch(req)}
                              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-2 sm:py-1.5 flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 shrink-0"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Reassign Technician
                            </Button>
                          </div>
                        )}

                        {wo.status === 'ASSIGNED' && (
                          <Button
                            onClick={() => handleStartWork(wo.ID)}
                            disabled={actionLoading}
                            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
                          >
                            <Play className="w-4 h-4 fill-white" /> Start Repair Job (Start Timer)
                          </Button>
                        )}

                        {wo.status === 'IN_PROGRESS' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Submit Completed Repair Work
                              </span>
                            </div>

                            <textarea
                              value={activeTaskId === wo.ID ? notes : ''}
                              onChange={(e) => {
                                setActiveTaskId(wo.ID);
                                setNotes(e.target.value);
                              }}
                              placeholder="Describe what was repaired (e.g., Replaced damaged chair leg, tightened screws, cleaned filters)..."
                              rows={3}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500"
                            />

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition w-full sm:w-auto">
                                  <Camera className="w-4 h-4 text-amber-400" />
                                  {afterImageFile ? 'Change Fixed Equipment Photo' : 'Upload Photo of Fixed Equipment'}
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
                                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/50 shrink-0">
                                    <img src={afterImagePreview} alt="After Preview" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>

                              <Button
                                onClick={() => handleCompleteWork(wo.ID)}
                                disabled={actionLoading}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                              >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Submit Repair for Admin Verification
                              </Button>
                            </div>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> Repair Finished by Technician • Waiting for Administrator Sign-off
                            </div>
                            {wo.technician_notes && (
                              <p className="text-xs text-slate-300">
                                <span className="text-slate-400 font-medium">Technician Notes:</span> "{wo.technician_notes}"
                              </p>
                            )}
                            {wo.after_image_url && (
                              <div className="pt-1">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Photo of Fixed Equipment:</span>
                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 mt-1 cursor-pointer" onClick={() => window.open(resolveImageUrl(wo.after_image_url), '_blank')}>
                                  <img 
                                    src={resolveImageUrl(wo.after_image_url)} 
                                    alt="Repaired Evidence" 
                                    className="w-full h-full object-cover hover:scale-105 transition" 
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {isClosed && (
                          <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                              <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Work Order Verified & Closed by Administrator
                            </div>
                            {wo.technician_notes && (
                              <p className="text-xs text-slate-300">
                                <span className="text-slate-400 font-medium">Final Repair Notes:</span> "{wo.technician_notes}"
                              </p>
                            )}
                            {wo.after_image_url && (
                              <div className="pt-1">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Photo of Fixed Equipment:</span>
                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 mt-1 cursor-pointer" onClick={() => window.open(resolveImageUrl(wo.after_image_url), '_blank')}>
                                  <img 
                                    src={resolveImageUrl(wo.after_image_url)} 
                                    alt="Repaired Evidence" 
                                    className="w-full h-full object-cover hover:scale-105 transition" 
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
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
      </main>

      {/* Dispatch / Reassign Modal for Admin */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[88vh] overflow-y-auto overflow-x-hidden p-3.5 sm:p-6">
          <DialogHeader className="pr-7 sm:pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" /> 
              <span className="truncate">{selectedTicket?.work_order || selectedTicket?.status !== 'REPORTED' ? 'Reassign Maintenance Technician' : 'Technician Dispatch Engine'}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {selectedTicket?.work_order || selectedTicket?.status !== 'REPORTED'
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Free Only ({recommendations.filter(r => r.is_available).length})
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {loadingRecs ? (
              <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Finding available qualified technicians...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active technicians found in this trade.
              </div>
            ) : (
              <div className="max-h-[50vh] sm:max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {recommendations
                  .filter((rec) => !filterFreeOnly || rec.is_available)
                  .map((rec) => {
                    const techId = rec.technician.ID || rec.technician.id;
                    const isFree = rec.is_available;
                    return (
                      <div
                        key={techId}
                        className="p-2.5 sm:p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-white truncate max-w-full">{rec.technician.full_name}</span>
                            {isFree ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Free (0 Active)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300/80 bg-amber-500/10">
                                ⏳ Busy ({rec.active_workload} active)
                              </Badge>
                            )}
                            {rec.skill_match && (
                              <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                                🎯 {rec.technician.skill_category} Specialist
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400">
                            <span>Trade: <strong className="text-slate-300">{rec.technician.skill_category || 'General'}</strong></span>
                            {rec.technician.phone_number && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="truncate">Phone: <a href={`tel:${rec.technician.phone_number}`} className="text-slate-300 hover:underline">{rec.technician.phone_number}</a></span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
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
                            {selectedTicket?.work_order || selectedTicket?.status !== 'REPORTED' ? 'Reassign Task' : 'Assign Task'}
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
    </div>
  );
}