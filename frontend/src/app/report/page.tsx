'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  Clock, 
  Flame, 
  GraduationCap, 
  History, 
  Layers, 
  Loader2, 
  MapPin, 
  PlusCircle, 
  Send, 
  Sparkles, 
  Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export default function StudentReportPage() {
  const { user, logout } = useAuth();

  // Facility state
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  // Form state
  const [description, setDescription] = useState('');
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [unusableRisk, setUnusableRisk] = useState(false);
  const [affectedCount, setAffectedCount] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Load facilities on mount
  useEffect(() => {
    api.get('/facilities')
      .then((res) => setFacilities(res.data.buildings || []))
      .catch((err) => console.error('Error loading facilities:', err));

    loadMyTickets();
  }, []);

  const loadMyTickets = () => {
    setLoadingTickets(true);
    api.get('/requests/my')
      .then((res) => setMyTickets(res.data.tickets || []))
      .catch((err) => console.error('Error loading tickets:', err))
      .finally(() => setLoadingTickets(false));
  };

  // Helper getters for cascading dropdowns
  const currentBuilding = facilities.find((b) => b.ID.toString() === selectedBuilding);
  const availableFloors = currentBuilding?.floors || [];
  const currentFloor = availableFloors.find((f: any) => f.ID.toString() === selectedFloor);
  const availableRooms = currentFloor?.rooms || [];
  const currentRoom = availableRooms.find((r: any) => r.ID.toString() === selectedRoom);
  const availableAssets = currentRoom?.assets || [];

  // Real-time Priority Preview Calculation
  const calculateLivePriority = () => {
    let score = 0;
    if (safetyRisk) score += 40;
    if (unusableRisk) score += 35;
    if (affectedCount > 10) score += 25;
    else if (affectedCount >= 2) score += 15;
    else score += 5;

    if (score >= 75) return { level: 'CRITICAL', sla: '2 Hours', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    if (score >= 50) return { level: 'HIGH', sla: '8 Hours', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    if (score >= 25) return { level: 'MEDIUM', sla: '24 Hours', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { level: 'LOW', sla: '72 Hours', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  };

  const livePriority = calculateLivePriority();

  // Handle Photo Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      alert('Please select a building, floor, and room.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');

    try {
      let uploadedUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = uploadRes.data.url;
      }

      await api.post('/requests', {
        room_id: parseInt(selectedRoom),
        asset_id: selectedAsset ? parseInt(selectedAsset) : null,
        description,
        image_url: uploadedUrl,
        safety_risk: safetyRisk,
        unusable_risk: unusableRisk,
        affected_count: affectedCount,
      });

      setSuccessMessage('Maintenance request submitted successfully! Dispatchers have been alerted.');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setSafetyRisk(false);
      setUnusableRisk(false);
      setAffectedCount(1);
      loadMyTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Student & Staff Portal</h1>
              <p className="text-xs text-slate-400">Welcome, {user?.full_name} ({user?.email})</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout} size="sm" className="border-slate-800 hover:bg-slate-800 text-slate-300">
            Sign Out
          </Button>
        </div>

        {/* Tabs: Report Issue vs My Reported Issues */}
        <Tabs defaultValue="report" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="report" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Report New Issue
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-2">
              <History className="w-4 h-4" /> My Incident History ({myTickets.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Report Issue Form */}
          <TabsContent value="report">
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-indigo-400" /> Fast Incident Reporting
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Select your campus location and answer 3 quick questions. Our engine computes the SLA automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {successMessage && (
                  <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1: Location Cascader */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> 1. Campus Location
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={selectedBuilding}
                        onChange={(e) => {
                          setSelectedBuilding(e.target.value);
                          setSelectedFloor('');
                          setSelectedRoom('');
                          setSelectedAsset('');
                        }}
                        required
                        className="bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Select Building...</option>
                        {facilities.map((b) => (
                          <option key={b.ID} value={b.ID}>{b.name} ({b.code})</option>
                        ))}
                      </select>

                      <select
                        value={selectedFloor}
                        onChange={(e) => {
                          setSelectedFloor(e.target.value);
                          setSelectedRoom('');
                          setSelectedAsset('');
                        }}
                        disabled={!selectedBuilding}
                        required
                        className="bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
                      >
                        <option value="">Select Floor...</option>
                        {availableFloors.map((f: any) => (
                          <option key={f.ID} value={f.ID}>Floor {f.floor_number}</option>
                        ))}
                      </select>

                      <select
                        value={selectedRoom}
                        onChange={(e) => {
                          setSelectedRoom(e.target.value);
                          setSelectedAsset('');
                        }}
                        disabled={!selectedFloor}
                        required
                        className="bg-slate-950 border border-slate-800 rounded-md p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
                      >
                        <option value="">Select Room / Lab...</option>
                        {availableRooms.map((r: any) => (
                          <option key={r.ID} value={r.ID}>{r.room_number} - {r.room_type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Optional Equipment Tag Link */}
                    {availableAssets.length > 0 && (
                      <div className="pt-2">
                        <select
                          value={selectedAsset}
                          onChange={(e) => setSelectedAsset(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800/80 rounded-md p-2 text-sm text-slate-300"
                        >
                          <option value="">Link Specific Equipment (Optional)...</option>
                          {availableAssets.map((a: any) => (
                            <option key={a.ID} value={a.ID}>{a.name} [{a.asset_tag}]</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Smart Priority Questionnaire */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> 2. Smart Priority Questionnaire
                      </label>
                      <Badge variant="outline" className={`px-2.5 py-1 text-xs font-bold border ${livePriority.color}`}>
                        Calculated Priority: {livePriority.level} (SLA: {livePriority.sla})
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-rose-400" /> Safety or Hazard Risk?
                          </span>
                          <p className="text-[11px] text-slate-400">Sparks, leaks, smoke, or physical danger</p>
                        </div>
                        <Switch checked={safetyRisk} onCheckedChange={setSafetyRisk} />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-400" /> Facility Completely Unusable?
                          </span>
                          <p className="text-[11px] text-slate-400">Class or lab cannot proceed at all</p>
                        </div>
                        <Switch checked={unusableRisk} onCheckedChange={setUnusableRisk} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" /> People Affected:
                      </span>
                      <div className="flex gap-2">
                        {[1, 5, 20].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setAffectedCount(num)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition ${
                              affectedCount === num
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {num === 1 ? 'Just me' : num === 5 ? 'A few (2-10)' : 'Entire room (10+)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Description & Photo */}
                  <div className="space-y-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      3. Issue Description & Photo Evidence
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      placeholder="e.g. AC is making loud grinding noise and leaking water onto desk 4..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500"
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition">
                        <Camera className="w-4 h-4 text-indigo-400" />
                        {imageFile ? 'Change Photo' : 'Attach Photo'}
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      </label>
                      {imagePreview && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 shadow-lg shadow-indigo-500/20"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit Maintenance Incident
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Incident History */}
          <TabsContent value="history">
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Your Submitted Incidents</CardTitle>
                <CardDescription className="text-slate-400">Live operational status and technician assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="text-center py-8 text-slate-500">Loading your history...</div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    You haven't reported any issues yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myTickets.map((t) => (
                      <div key={t.ID} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400">{t.ticket_number}</span>
                            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                              {t.Room?.Floor?.Building?.code} • Room {t.Room?.room_number}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-[10px] bg-slate-800 text-slate-200">
                              Priority: {t.calculated_priority}
                            </Badge>
                            <Badge className={`text-[10px] ${
                              t.status === 'REPORTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              t.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              Status: {t.status}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-slate-300">{t.description}</p>

                        {t.image_url && (
                          <div className="pt-1">
                            <img src={t.image_url} alt="Incident" className="w-20 h-20 object-cover rounded-lg border border-slate-800" />
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 flex items-center gap-2 border-t border-slate-900 pt-2">
                          <Clock className="w-3.5 h-3.5" />
                          Reported on {new Date(t.CreatedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}