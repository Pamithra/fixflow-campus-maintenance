'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
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
  QrCode, 
  Send, 
  Sparkles, 
  Star, 
  Users, 
  Phone, 
  MessageSquare, 
  Check, 
  Monitor, 
  Tv, 
  Wind, 
  Wifi, 
  Zap, 
  Armchair, 
  Droplet, 
  MoreHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';

const EQUIPMENT_CATEGORIES = [
  { id: 'Computers & Workstations', label: 'Computers & Workstations', icon: Monitor },
  { id: 'Projectors & Smart Displays', label: 'Projectors & Smart Displays', icon: Tv },
  { id: 'Air Conditioners (AC / HVAC)', label: 'Air Conditioners (AC / HVAC)', icon: Wind },
  { id: 'Network & Wi-Fi Equipment', label: 'Network & Wi-Fi Equipment', icon: Wifi },
  { id: 'Electrical & Lighting', label: 'Electrical & Lighting', icon: Zap },
  { id: 'Furniture (Chairs, Desks)', label: 'Furniture (Chairs & Desks)', icon: Armchair },
  { id: 'Plumbing & Washrooms', label: 'Plumbing & Washroom Fixtures', icon: Droplet },
  { id: 'Other', label: 'Other Equipment (Specify below)', icon: MoreHorizontal },
];

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

function ReportContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Facility state
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFloorNum, setSelectedFloorNum] = useState<number | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');

  // Equipment Category state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customEquipmentName, setCustomEquipmentName] = useState<string>('');

  // Form state
  const [description, setDescription] = useState('');
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [unusableRisk, setUnusableRisk] = useState(false);
  const [affectedCount, setAffectedCount] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Manual QR lookup
  const [manualQRTag, setManualQRTag] = useState('');
  const [qrScanning, setQrScanning] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [smsNotifications, setSmsNotifications] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Rating Modal State
  const [ratingTicket, setRatingTicket] = useState<any | null>(null);
  const [selectedStars, setSelectedStars] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Tab State
  const tabParam = searchParams.get('tab');
  const rateTicketParam = searchParams.get('rateTicket');
  const [activeTab, setActiveTab] = useState<string>(tabParam === 'history' || rateTicketParam ? 'history' : 'report');

  useEffect(() => {
    if (tabParam === 'history' || rateTicketParam) {
      setActiveTab('history');
    }
  }, [tabParam, rateTicketParam]);

  // 1. Enforce authentication & redirect handling (Admin redirected to dashboard)
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else if (user.role === 'ADMIN') {
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // 2. Load campus facilities & user tickets
  useEffect(() => {
    api.get('/facilities')
      .then((res) => setFacilities(res.data.buildings || []))
      .catch((err) => console.error('Error loading facilities:', err));

    if (user) {
      loadMyTickets();
      loadNotifications();
    }
  }, [user]);

  // 3. Handle incoming QR tag from URL (?tag=... or ?asset=...)
  useEffect(() => {
    const tag = searchParams.get('tag') || searchParams.get('asset');
    if (tag && facilities.length > 0) {
      applyQRTag(tag);
    }
  }, [searchParams, facilities]);

  // 4. Auto-open rating dialog if rateTicket param is present
  useEffect(() => {
    if (rateTicketParam && myTickets.length > 0) {
      const found = myTickets.find((t: any) => t.ticket_number === rateTicketParam);
      if (found) {
        setRatingTicket(found);
        setActiveTab('history');
      }
    }
  }, [rateTicketParam, myTickets]);

  const loadMyTickets = () => {
    setLoadingTickets(true);
    api.get('/requests/my')
      .then((res) => {
        const tickets = res.data.tickets || [];
        setMyTickets(tickets);
        if (rateTicketParam) {
          const found = tickets.find((t: any) => t.ticket_number === rateTicketParam);
          if (found) {
            setRatingTicket(found);
            setActiveTab('history');
          }
        }
      })
      .catch((err) => console.error('Error loading tickets:', err))
      .finally(() => setLoadingTickets(false));
  };

  const loadNotifications = () => {
    api.get('/notifications/my')
      .then((res) => setSmsNotifications(res.data.notifications || []))
      .catch((err) => console.error('Error loading notifications:', err));
  };

  // Instant QR code resolver
  const applyQRTag = async (tag: string) => {
    setQrScanning(true);
    try {
      const res = await api.get(`/assets/${tag}`);
      const data = res.data;

      setSelectedFloorNum(data.floor_number);
      setSelectedBuildingId(data.building_id.toString());
      setSelectedRoomId(data.room_id.toString());
      setSelectedAssetId(data.asset_id.toString());

      if (data.category) {
        if (data.category.toUpperCase().includes('HVAC') || data.category.toUpperCase().includes('AC')) {
          setSelectedCategory('Air Conditioners (AC / HVAC)');
        } else if (data.category.toUpperCase().includes('IT')) {
          setSelectedCategory('Projectors & Smart Displays');
        } else if (data.category.toUpperCase().includes('NETWORK')) {
          setSelectedCategory('Network & Wi-Fi Equipment');
        } else if (data.category.toUpperCase().includes('ELECTRICAL')) {
          setSelectedCategory('Electrical & Lighting');
        } else {
          setSelectedCategory(data.category);
        }
      }

      setSuccessMessage(`📲 QR Code Identified: "${data.asset_name}" in ${data.room_number} (${data.building_name})! Location fields have been automatically filled.`);
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err) {
      alert(`Equipment with QR tag "${tag}" was not found in campus database.`);
    } finally {
      setQrScanning(false);
    }
  };

  // Helper: Filter rooms by selected floor across Old & New Buildings
  const getRoomsOnFloor = () => {
    if (selectedFloorNum === null) return [];
    const roomsList: any[] = [];

    for (const b of facilities) {
      const floors = b.floors || b.Floors || [];
      const floorMatch = floors.find((f: any) => f.floor_number === selectedFloorNum);
      if (floorMatch) {
        const rooms = floorMatch.rooms || floorMatch.Rooms || [];
        for (const r of rooms) {
          roomsList.push({
            ...r,
            building_name: b.name,
            building_code: b.code,
            building_id: b.ID || b.id,
            floor_id: floorMatch.ID || floorMatch.id,
          });
        }
      }
    }
    return roomsList;
  };

  const roomsOnSelectedFloor = getRoomsOnFloor();
  const oldBuildingRooms = roomsOnSelectedFloor.filter((r) => r.building_code === 'IT-OLD');
  const newBuildingRooms = roomsOnSelectedFloor.filter((r) => r.building_code === 'IT-NEW');

  // Currently selected room metadata
  const currentRoomObj = roomsOnSelectedFloor.find((r) => (r.ID || r.id).toString() === selectedRoomId);
  const availableAssetsInRoom = currentRoomObj?.assets || currentRoomObj?.Assets || [];

  // Priority Calculation with simple English feedback
  const calculateLivePriority = () => {
    let score = 0;
    if (safetyRisk) score += 40;
    if (unusableRisk) score += 35;
    if (affectedCount > 10) score += 25;
    else if (affectedCount >= 2) score += 15;
    else score += 5;

    if (score >= 75) return { level: 'CRITICAL', sla: 'Within 2 Hours', description: 'Immediate emergency response required', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    if (score >= 50) return { level: 'HIGH', sla: 'Within 8 Hours', description: 'Same-day urgent priority', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    if (score >= 25) return { level: 'MEDIUM', sla: 'Within 24 Hours', description: 'Next-day maintenance schedule', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { level: 'LOW', sla: 'Within 3 Days', description: 'Routine operational repair', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  };

  const livePriority = calculateLivePriority();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      alert('Please select a floor and place (room, lecture hall, or lab).');
      return;
    }

    if (!selectedCategory) {
      alert('Please select an equipment category.');
      return;
    }

    if (selectedCategory === 'Other' && !customEquipmentName.trim()) {
      alert('Please specify the name of the equipment in the text box.');
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
        room_id: parseInt(selectedRoomId),
        asset_id: selectedAssetId ? parseInt(selectedAssetId) : null,
        equipment_category: selectedCategory,
        custom_equipment_name: selectedCategory === 'Other' ? customEquipmentName : '',
        description,
        image_url: uploadedUrl,
        safety_risk: safetyRisk,
        unusable_risk: unusableRisk,
        affected_count: affectedCount,
      });

      setSuccessMessage('Thank you! Your maintenance incident has been submitted. Maintenance staff and technicians have been alerted.');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setSafetyRisk(false);
      setUnusableRisk(false);
      setAffectedCount(1);
      setSelectedCategory('');
      setCustomEquipmentName('');
      setSelectedAssetId('');
      loadMyTickets();
      loadNotifications();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit maintenance incident.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (!ratingTicket) return;
    setSubmittingFeedback(true);

    try {
      await api.post(`/requests/${ratingTicket.ID}/feedback`, {
        rating: selectedStars,
        feedback: feedbackNotes,
      });

      alert('Thank you! Your rating and feedback have been recorded.');
      setRatingTicket(null);
      setFeedbackNotes('');
      loadMyTickets();
      loadNotifications();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (authLoading || (user && user.role === 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> {user?.role === 'ADMIN' ? 'Redirecting to Command Dashboard...' : 'Loading FixFlow Portal...'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="report" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-2 text-xs">
              <PlusCircle className="w-4 h-4" /> Report New Issue
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex items-center gap-2 text-xs">
              <History className="w-4 h-4" /> My Incident History ({myTickets.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REPORT ISSUE FORM */}
          <TabsContent value="report">
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
              <CardHeader className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-indigo-400" /> Maintenance Incident Form
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Faculty of Information Technology (IT Faculty)
                    </CardDescription>
                  </div>

                  {/* QR Scan or Manual Tag Quick Box */}
                  <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                    <QrCode className="w-4 h-4 text-indigo-400 shrink-0 ml-1" />
                    <Input
                      type="text"
                      placeholder="Scan/Type QR Tag (e.g. AC-IT-NEW-ERPLAB-01)"
                      value={manualQRTag}
                      onChange={(e) => setManualQRTag(e.target.value)}
                      className="h-7 text-xs bg-slate-900 border-slate-700 text-white w-52"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyQRTag(manualQRTag.trim())}
                      disabled={!manualQRTag.trim() || qrScanning}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5"
                    >
                      {qrScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {successMessage && (
                  <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3 text-xs sm:text-sm animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* STEP 1: IT FACULTY LOCATION CASCADER (5 FLOORS) */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> 1. Select IT Faculty Floor & Room
                    </label>

                    {/* Floor Selector Buttons */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-300 font-medium">Select Floor:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { num: 0, label: 'Ground Floor', badge: 'Floor 0' },
                          { num: 1, label: 'First Floor', badge: 'Floor 1' },
                          { num: 2, label: 'Second Floor', badge: 'Floor 2' },
                          { num: 3, label: 'Third Floor', badge: 'Floor 3' },
                          { num: 4, label: 'Fourth Floor', badge: 'Floor 4' },
                        ].map((f) => (
                          <button
                            key={f.num}
                            type="button"
                            onClick={() => {
                              setSelectedFloorNum(f.num);
                              setSelectedRoomId('');
                              setSelectedAssetId('');
                            }}
                            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                              selectedFloorNum === f.num
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold text-indigo-400">{f.badge}</span>
                            <span className="text-xs font-semibold text-white">{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Places on Selected Floor (Filtered by Old vs New Building) */}
                    {selectedFloorNum !== null && (
                      <div className="space-y-3 pt-2 animate-in fade-in">
                        <span className="text-xs text-slate-300 font-medium">
                          Select the Specific Place on {selectedFloorNum === 0 ? 'Ground Floor' : `Floor ${selectedFloorNum}`}:
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Phase 1 (Old Building) Column */}
                          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                              Phase 1 (Old Building)
                            </span>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {oldBuildingRooms.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No rooms recorded on this floor.</p>
                              ) : (
                                oldBuildingRooms.map((r) => {
                                  const rId = (r.ID || r.id).toString();
                                  const isSelected = selectedRoomId === rId;
                                  return (
                                    <button
                                      key={rId}
                                      type="button"
                                      onClick={() => {
                                        setSelectedRoomId(rId);
                                        setSelectedAssetId('');
                                      }}
                                      className={`w-full text-left p-2 rounded-md text-xs transition flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white font-semibold'
                                          : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <span>{r.room_number}</span>
                                      <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                                        {r.room_type || 'Facility'}
                                      </Badge>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Phase 2 (New Building) Column */}
                          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wide">
                              Phase 2 (New Building)
                            </span>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {newBuildingRooms.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No rooms recorded on this floor.</p>
                              ) : (
                                newBuildingRooms.map((r) => {
                                  const rId = (r.ID || r.id).toString();
                                  const isSelected = selectedRoomId === rId;
                                  return (
                                    <button
                                      key={rId}
                                      type="button"
                                      onClick={() => {
                                        setSelectedRoomId(rId);
                                        setSelectedAssetId('');
                                      }}
                                      className={`w-full text-left p-2 rounded-md text-xs transition flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white font-semibold'
                                          : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <span>{r.room_number}</span>
                                      <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                                        {r.room_type || 'Facility'}
                                      </Badge>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selected Location Pill */}
                        {currentRoomObj && (
                          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>
                              <strong>Selected Place:</strong> {currentRoomObj.room_number} ({currentRoomObj.room_type}) • {currentRoomObj.building_name}, Floor {selectedFloorNum}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* STEP 2: EQUIPMENT CATEGORY CHECKBOXES */}
                  {selectedRoomId && (
                    <div className="space-y-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 animate-in fade-in">
                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" /> 2. What equipment has a problem?
                      </label>
                      <p className="text-xs text-slate-400">Select the category that best matches the faulty equipment:</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {EQUIPMENT_CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const isChecked = selectedCategory === cat.id;

                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`p-3 rounded-lg border text-left transition flex items-start gap-2.5 ${
                                isChecked
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <div className={`p-1.5 rounded-md ${isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-semibold block">{cat.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* "Other" Custom Equipment Name Input */}
                      {selectedCategory === 'Other' && (
                        <div className="space-y-1.5 pt-2 animate-in fade-in">
                          <label className="text-xs font-semibold text-amber-400">
                            Please specify the equipment name:
                          </label>
                          <Input
                            type="text"
                            value={customEquipmentName}
                            onChange={(e) => setCustomEquipmentName(e.target.value)}
                            placeholder="e.g. Soldering Station, Digital Oscilloscope, Amplifier..."
                            required
                            className="bg-slate-950 border-slate-700 text-white text-xs"
                          />
                        </div>
                      )}

                      {/* Optional: Link specific registered asset if available */}
                      {availableAssetsInRoom.length > 0 && (
                        <div className="pt-2">
                          <label className="text-[11px] text-slate-400 font-medium block mb-1">
                            Link registered asset tag (Optional):
                          </label>
                          <select
                            value={selectedAssetId}
                            onChange={(e) => setSelectedAssetId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200"
                          >
                            <option value="">-- Select Specific QR Asset (Optional) --</option>
                            {availableAssetsInRoom.map((a: any) => (
                              <option key={a.ID || a.id} value={a.ID || a.id}>
                                {a.name} [{a.asset_tag || a.AssetTag}]
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: SIMPLE, MEANINGFUL PRIORITY QUESTIONS */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> 3. Help Us Understand the Urgency
                      </label>
                      <Badge variant="outline" className={`px-2.5 py-1 text-xs font-bold border ${livePriority.color}`}>
                        Estimated Priority: {livePriority.level} ({livePriority.sla})
                      </Badge>
                    </div>

                    <div className="space-y-3 pt-1">
                      
                      {/* Question 1: Safety */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-rose-400 shrink-0" /> Is there an immediate safety danger or hazard?
                          </span>
                          <p className="text-[11px] text-slate-400">
                            For example: electrical sparks, smoke, burning smell, or water leaking near electric sockets.
                          </p>
                        </div>
                        <Switch checked={safetyRisk} onCheckedChange={setSafetyRisk} />
                      </div>

                      {/* Question 2: Usability */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-amber-400 shrink-0" /> Is the room or equipment completely unusable right now?
                          </span>
                          <p className="text-[11px] text-slate-400">
                            For example: the lecture, lab session, or faculty work cannot proceed at all.
                          </p>
                        </div>
                        <Switch checked={unusableRisk} onCheckedChange={setUnusableRisk} />
                      </div>

                      {/* Question 3: Population */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 gap-3">
                        <span className="text-xs font-medium text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-400 shrink-0" /> How many people are affected by this problem?
                        </span>
                        <div className="flex gap-2 shrink-0">
                          {[
                            { count: 1, label: 'Just me (1)' },
                            { count: 5, label: 'Small group (2-10)' },
                            { count: 20, label: 'Entire room (10+)' },
                          ].map((item) => (
                            <button
                              key={item.count}
                              type="button"
                              onClick={() => setAffectedCount(item.count)}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                affectedCount === item.count
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 4: DESCRIPTION & PHOTO */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      4. Describe the Problem & Attach Photo
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      placeholder="Please explain simply what is wrong (e.g., The projector turns on but displays no image, or the AC is leaking water onto lab desk 3)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500"
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition">
                        <Camera className="w-4 h-4 text-indigo-400" />
                        {imageFile ? 'Change Photo' : 'Attach Photo of Problem'}
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
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 text-xs sm:text-sm shadow-lg shadow-indigo-500/20"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit Maintenance Incident
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: INCIDENT HISTORY */}
          <TabsContent value="history">
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-base">Your Submitted Incidents</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Track the progress of your maintenance requests and submit feedback once completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="text-center py-8 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading your incident history...
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    You have not reported any maintenance incidents yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myTickets.map((t) => {
                      const wo = t.work_order || t.WorkOrder;
                      const isClosed = t.status === 'CLOSED' || wo?.status === 'CLOSED';
                      const hasRated = wo?.rating && wo?.rating > 0;

                      return (
                        <div key={t.ID} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-400">{t.ticket_number}</span>
                              {t.equipment_category && (
                                <Badge className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                  {t.custom_equipment_name || t.equipment_category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[10px] bg-slate-800 text-slate-200">
                                Priority: {t.calculated_priority}
                              </Badge>
                              <Badge className={`text-[10px] ${
                                isClosed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                t.status === 'REPORTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {isClosed ? 'Resolved & Verified' : `Status: ${t.status}`}
                              </Badge>
                            </div>
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
                                {(t.Room?.Floor || t.room?.floor) ? ((t.Room?.Floor?.floor_number ?? t.room?.floor?.floor_number) === 0 ? 'Floor 0 (Ground Floor)' : `Floor ${(t.Room?.Floor?.floor_number ?? t.room?.floor?.floor_number)}`) : 'Ground Floor'}
                              </span>
                              <span className="text-slate-600 font-bold">➔</span>
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-medium">
                                {getBuildingDisplayName(t.Room?.Floor?.Building?.name || t.room?.floor?.building?.name, t.Room?.room_number || t.room?.room_number)}
                              </span>
                              <span className="text-slate-600 font-bold">➔</span>
                              <span className="px-2.5 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/40 text-white font-bold">
                                Room {t.Room?.room_number || t.room?.room_number || 'General'} {(t.Room?.room_type || t.room?.room_type) ? `(${t.Room?.room_type || t.room?.room_type})` : ''}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-300">{t.description}</p>

                          {/* Technician Notes & Repair Confirmation */}
                          {isClosed && (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                              <div className="font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> Maintenance Verified & Completed
                              </div>
                              {wo?.technician_notes && (
                                <p className="italic text-slate-300">"{wo.technician_notes}"</p>
                              )}
                            </div>
                          )}

                          {/* Rate Service Button / Stars Display */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900 pt-2 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Reported on {new Date(t.CreatedAt).toLocaleDateString()}
                            </div>

                            {isClosed && (
                              <div>
                                {hasRated ? (
                                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                                    <span>Rated:</span>
                                    {Array.from({ length: wo.rating }).map((_, i) => (
                                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    ))}
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setRatingTicket(t)}
                                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-7 px-2.5 flex items-center gap-1"
                                  >
                                    <Star className="w-3 h-3 fill-white" /> Rate Repair (1-5★)
                                  </Button>
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

        </Tabs>
      </main>

      {/* Star Rating Dialog */}
      <Dialog open={!!ratingTicket} onOpenChange={() => setRatingTicket(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Rate Maintenance Service
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Is the equipment in {ratingTicket?.ticket_number} working properly now? Please rate the repair and share your feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* 5-Star Rating */}
            <div className="flex justify-center items-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  className="p-1 hover:scale-125 transition"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= selectedStars
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Tell us if the equipment is working properly now (e.g., The AC cooling is working great and room is cold!)..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500"
            />

            <Button
              onClick={handleRatingSubmit}
              disabled={submittingFeedback}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2"
            >
              {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Submit Feedback & Rating'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">Loading FixFlow...</div>}>
      <ReportContent />
    </Suspense>
  );
}