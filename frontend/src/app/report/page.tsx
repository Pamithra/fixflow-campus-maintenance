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
import { resolveImageUrl } from '@/lib/utils';

const EQUIPMENT_CATEGORIES = [
  { id: 'Computers & Workstations', label: 'Computers & Workstations', icon: Monitor },
  { id: 'Projectors & Smart Displays', label: 'Projectors & Smart Displays', icon: Tv },
  { id: 'Air Conditioners (AC / Cooling)', label: 'Air Conditioners (AC / Cooling)', icon: Wind },
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
  const [selectedUrgency, setSelectedUrgency] = useState<'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW'>('LOW');
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [classInProgress, setClassInProgress] = useState(false);
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
  const [qrError, setQrError] = useState('');
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

  // 1. Enforce authentication & QR redirect handling
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('fixflow_logging_out') === 'true') {
      return;
    }
    if (!authLoading) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const isQRScan = params.has('tag') || params.has('category') || params.has('room') || params.has('floor');
        const isFromAuth = params.get('authed') === '1' || sessionStorage.getItem('fixflow_qr_authed') === 'true';

        // Fresh QR scan with equipment details must ALWAYS navigate to /signup first
        if (isQRScan && !isFromAuth) {
          params.set('authed', '1');
          const targetPath = `${window.location.pathname}?${params.toString()}`;
          router.replace(`/signup?redirect=${encodeURIComponent(targetPath)}`);
          return;
        }

        if (isQRScan && isFromAuth) {
          sessionStorage.setItem('fixflow_qr_authed', 'true');
        }
      }

      if (!user) {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/signup?redirect=${encodeURIComponent(currentPath)}`);
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

  // Helper to map category alias to full category label
  const normalizeCategory = (cat: string) => {
    const upper = cat.toUpperCase().trim();
    if (upper.includes('HVAC') || upper.includes('AC') || upper.includes('COOLING') || upper.includes('AIR')) {
      return 'Air Conditioners (AC / Cooling)';
    }
    if (upper.includes('PROJ') || upper.includes('DISPLAY') || upper.includes('SMART') || upper.includes('SCREEN') || upper.includes('TV')) {
      return 'Projectors & Smart Displays';
    }
    if (upper.includes('NET') || upper.includes('WIFI') || upper.includes('SWITCH') || upper.includes('ROUTER') || upper.includes('AP')) {
      return 'Network & Wi-Fi Equipment';
    }
    if (upper.includes('ELEC') || upper.includes('POWER') || upper.includes('LIGHT') || upper.includes('SOCKET') || upper.includes('BULB')) {
      return 'Electrical & Lighting';
    }
    if (upper.includes('PLUMB') || upper.includes('WATER') || upper.includes('LEAK') || upper.includes('PIPE') || upper.includes('WASHROOM') || upper.includes('TOILET') || upper.includes('SINK')) {
      return 'Plumbing & Washrooms';
    }
    if (upper.includes('FURN') || upper.includes('CHAIR') || upper.includes('DESK') || upper.includes('TABLE') || upper.includes('BENCH')) {
      return 'Furniture (Chairs, Desks)';
    }
    if (upper.includes('IT') || upper.includes('PC') || upper.includes('COMPUTER') || upper.includes('LAB') || upper.includes('WORKSTATION') || upper.includes('KEYBOARD') || upper.includes('MOUSE')) {
      return 'Computers & Workstations';
    }
    return cat;
  };

  // Helper to resolve Floor, Building/Phase, Room, and Category from parameters or structured text
  const applyStructuredData = (params: { floor?: any; phase?: any; room?: any; category?: any }) => {
    let matchedFloor: number | null = null;
    let matchedBuildingId = '';
    let matchedRoomId = '';
    let matchedRoomName = '';
    let matchedBuildingName = '';

    // 1. Resolve Floor Number (0, 1, 2, 3, 4)
    if (params.floor !== undefined && params.floor !== null && params.floor !== '') {
      const parsedFloor = parseInt(params.floor.toString().replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedFloor) && parsedFloor >= 0 && parsedFloor <= 4) {
        matchedFloor = parsedFloor;
        setSelectedFloorNum(parsedFloor);
      }
    }

    // 2. Resolve Phase / Building (Phase 1 / IT-OLD or Phase 2 / IT-NEW)
    if (params.phase && facilities.length > 0) {
      const phaseStr = params.phase.toString().toLowerCase().trim();
      let targetBuilding: any = null;
      if (phaseStr.includes('2') || phaseStr.includes('new') || phaseStr.includes('phase 2') || phaseStr.includes('phase2')) {
        targetBuilding = facilities.find((b: any) => b.code === 'IT-NEW');
      } else if (phaseStr.includes('1') || phaseStr.includes('old') || phaseStr.includes('phase 1') || phaseStr.includes('phase1')) {
        targetBuilding = facilities.find((b: any) => b.code === 'IT-OLD');
      }
      if (targetBuilding) {
        matchedBuildingId = (targetBuilding.ID || targetBuilding.id).toString();
        matchedBuildingName = targetBuilding.name;
        setSelectedBuildingId(matchedBuildingId);
      }
    }

    // 3. Resolve Room Name / Code
    if (params.room && facilities.length > 0) {
      const rawRoom = params.room.toString().trim();
      const cleanQuery = rawRoom.toLowerCase().replace(/[\s\-_]/g, '');
      let foundRoom: any = null;

      for (const b of facilities) {
        if (matchedBuildingId && (b.ID || b.id).toString() !== matchedBuildingId) continue;

        const floors = b.floors || b.Floors || [];
        for (const f of floors) {
          if (matchedFloor !== null && f.floor_number !== matchedFloor) continue;

          const rooms = f.rooms || f.Rooms || [];
          for (const r of rooms) {
            const num = (r.room_number || '').toLowerCase();
            const cleanNum = num.replace(/[\s\-_]/g, '');
            const type = (r.room_type || '').toLowerCase();
            const cleanType = type.replace(/[\s\-_]/g, '');

            if (
              cleanNum.includes(cleanQuery) || 
              cleanQuery.includes(cleanNum) || 
              cleanType.includes(cleanQuery) || 
              cleanQuery.includes(cleanType)
            ) {
              foundRoom = r;
              matchedRoomId = (r.ID || r.id).toString();
              matchedRoomName = r.room_number;
              if (matchedFloor === null) {
                matchedFloor = f.floor_number;
                setSelectedFloorNum(f.floor_number);
              }
              if (!matchedBuildingId) {
                matchedBuildingId = (b.ID || b.id).toString();
                matchedBuildingName = b.name;
                setSelectedBuildingId(matchedBuildingId);
              }
              break;
            }
          }
          if (foundRoom) break;
        }
        if (foundRoom) break;
      }

      if (matchedRoomId) {
        setSelectedRoomId(matchedRoomId);
      }
    }

    // 4. Resolve Category
    if (params.category) {
      const normalized = normalizeCategory(params.category.toString());
      setSelectedCategory(normalized);
    }

    // Success Notification
    const infoParts = [];
    if (params.category) infoParts.push(normalizeCategory(params.category.toString()));
    if (matchedRoomName) infoParts.push(`Room: ${matchedRoomName}`);
    if (matchedFloor !== null) infoParts.push(matchedFloor === 0 ? 'Ground Floor' : `Floor ${matchedFloor}`);
    if (matchedBuildingName) infoParts.push(matchedBuildingName);

    if (infoParts.length > 0) {
      setSuccessMessage(`📲 QR Equipment Identified: ${infoParts.join(' • ')}! Form fields have been automatically filled.`);
      setTimeout(() => setSuccessMessage(''), 8000);
    }
  };

  // 3. Handle incoming QR parameters or tag from URL
  useEffect(() => {
    const paramCategory = searchParams.get('category');
    const paramFloor = searchParams.get('floor');
    const paramPhase = searchParams.get('phase') || searchParams.get('building');
    const paramRoom = searchParams.get('room');
    const tag = searchParams.get('tag') || searchParams.get('asset');

    if (paramFloor !== null || paramCategory || paramRoom || paramPhase) {
      applyStructuredData({
        floor: paramFloor,
        phase: paramPhase,
        room: paramRoom,
        category: paramCategory,
      });
    } else if (tag) {
      setManualQRTag(tag);
      applyQRTag(tag);
    }
  }, [searchParams, facilities]);

  // 4. Auto-open rating dialog if rateTicket param is present and not yet rated
  useEffect(() => {
    if (rateTicketParam && myTickets.length > 0) {
      const found = myTickets.find((t: any) => t.ticket_number === rateTicketParam);
      const isAlreadyRated = found?.work_order?.rating > 0;
      if (found && !isAlreadyRated) {
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
          const isAlreadyRated = found?.work_order?.rating > 0;
          if (found && !isAlreadyRated) {
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

  // Instant QR code resolver (supports database tags, full URLs, shortlinks, and structured category/floor/phase/room)
  const applyQRTag = async (rawTag: string) => {
    setQrScanning(true);
    setQrError('');

    let tag = rawTag.trim();
    if (!tag) {
      setQrScanning(false);
      return;
    }

    // 1. If tag is an HTTP/HTTPS URL
    if (tag.startsWith('http://') || tag.startsWith('https://')) {
      try {
        const parsedUrl = new URL(tag);
        
        // If it points to /signup with a redirect param (e.g. ?redirect=/report?category=...)
        const redir = parsedUrl.searchParams.get('redirect');
        if (redir) {
          const decodedTarget = decodeURIComponent(redir);
          const q = decodedTarget.includes('?') ? decodedTarget.split('?')[1] : decodedTarget;
          const urlParams = new URLSearchParams(q);
          applyStructuredData({
            floor: urlParams.get('floor'),
            phase: urlParams.get('phase') || urlParams.get('building'),
            room: urlParams.get('room'),
            category: urlParams.get('category'),
          });
          setQrScanning(false);
          return;
        }

        // If it points to FixFlow /report directly with query parameters
        if (
          parsedUrl.searchParams.get('category') || 
          parsedUrl.searchParams.get('floor') || 
          parsedUrl.searchParams.get('room')
        ) {
          applyStructuredData({
            floor: parsedUrl.searchParams.get('floor'),
            phase: parsedUrl.searchParams.get('phase') || parsedUrl.searchParams.get('building'),
            room: parsedUrl.searchParams.get('room'),
            category: parsedUrl.searchParams.get('category'),
          });
          setQrScanning(false);
          return;
        }

        // If it has a tag param: /report?tag=...
        const queryTag = parsedUrl.searchParams.get('tag') || parsedUrl.searchParams.get('asset');
        if (queryTag) {
          tag = queryTag;
        } else {
          // It is an external short URL (e.g. https://qrco.de/bh1XSL)
          // Directly navigate to it so the browser resolves the 302 redirect
          window.location.href = tag;
          return;
        }
      } catch (e) {
        window.location.href = tag;
        return;
      }
    }

    // 2. Check if tag contains structured query parameters or pipe delimiters
    if (tag.includes('=') || tag.includes('&') || tag.includes('|') || tag.includes('?') || tag.toLowerCase().includes('floor') || tag.toLowerCase().includes('phase')) {
      const cleaned = tag.includes('?') ? tag.split('?')[1] : tag;
      const urlParams = new URLSearchParams(cleaned.replace(/\|/g, '&'));
      const floor = urlParams.get('floor');
      const phase = urlParams.get('phase') || urlParams.get('building');
      const room = urlParams.get('room');
      const category = urlParams.get('category');

      if (floor !== null || phase || room || category) {
        applyStructuredData({ floor, phase, room, category });
        setQrScanning(false);
        return;
      }
    }

    try {
      const res = await api.get(`/assets/${encodeURIComponent(tag)}`);
      const data = res.data;

      setSelectedFloorNum(data.floor_number);
      setSelectedBuildingId(data.building_id.toString());
      setSelectedRoomId(data.room_id.toString());
      setSelectedAssetId(data.asset_id.toString());

      if (data.category) {
        setSelectedCategory(normalizeCategory(data.category));
      }

      setSuccessMessage(`📲 QR Code Identified: "${data.asset_name}" in ${data.room_number} (${data.building_name})! Location fields have been automatically filled.`);
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err) {
      // Fallback: Check if tag is in hyphen format e.g. AC-PHASE2-FLOOR0-ERPLAB or AC-NEW-ERPLAB
      const parts = tag.split('-');
      if (parts.length >= 2) {
        const cat = parts[0];
        const phase = parts.some(p => p.includes('NEW') || p.includes('PHASE2') || p.includes('P2')) ? '2' : parts.some(p => p.includes('OLD') || p.includes('PHASE1') || p.includes('P1')) ? '1' : '';
        const floorMatch = tag.match(/floor(\d)/i) || tag.match(/fl(\d)/i);
        const floor = floorMatch ? floorMatch[1] : undefined;
        const room = parts.slice(parts.length > 2 ? 2 : 1).join(' ');
        applyStructuredData({ floor, phase, room, category: cat });
      } else {
        setQrError(`Equipment QR tag "${tag}" was not recognized. Please select your room and category manually below.`);
        setTimeout(() => setQrError(''), 10000);
      }
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
  const currentRoomObj = roomsOnSelectedFloor.find((r) => (r.ID || r.id).toString() === selectedRoomId);

  // Priority & SLA Turnaround Calculation (Campus Standards)
  const calculateLivePriority = () => {
    // If active safety hazard, ongoing lecture/exam, or user picked Immediate
    if (safetyRisk || classInProgress || selectedUrgency === 'IMMEDIATE') {
      return { 
        level: 'CRITICAL', 
        sla: 'Within 1 Hour', 
        description: 'Immediate emergency dispatch required', 
        color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
      };
    }
    if (selectedUrgency === 'HIGH' || unusableRisk || affectedCount > 10) {
      return { 
        level: 'HIGH', 
        sla: 'Within 4 Hours', 
        description: 'Urgent priority for today’s sessions', 
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
      };
    }
    if (selectedUrgency === 'MEDIUM' || affectedCount >= 2) {
      return { 
        level: 'MEDIUM', 
        sla: 'Within 8 Hours (Same Day)', 
        description: 'Standard repair within regular work hours', 
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
      };
    }
    return { 
      level: 'LOW', 
      sla: 'Within 24 Hours (Next Day)', 
      description: 'Routine maintenance and scheduled inspection', 
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
    };
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

      const currentLive = calculateLivePriority();
      await api.post('/requests', {
        room_id: parseInt(selectedRoomId),
        asset_id: selectedAssetId ? parseInt(selectedAssetId) : null,
        equipment_category: selectedCategory,
        custom_equipment_name: selectedCategory === 'Other' ? customEquipmentName : '',
        description,
        image_url: uploadedUrl,
        safety_risk: safetyRisk || classInProgress || selectedUrgency === 'IMMEDIATE',
        unusable_risk: unusableRisk || selectedUrgency === 'HIGH',
        affected_count: affectedCount,
        immediate_attention: selectedUrgency === 'IMMEDIATE' || safetyRisk || classInProgress,
        requested_priority: currentLive.level,
      });

      setSuccessMessage('Thank you! Your maintenance incident has been submitted. Maintenance staff and technicians have been alerted.');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedUrgency('LOW');
      setSafetyRisk(false);
      setClassInProgress(false);
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

  const closeRatingDialog = () => {
    setRatingTicket(null);
    setFeedbackNotes('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('rateTicket');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
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

      closeRatingDialog();
      loadMyTickets();
      loadNotifications();
      alert('Thank you! Your rating and feedback have been recorded.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading FixFlow Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 overflow-x-hidden w-full max-w-full">
      <Navbar />

      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-6">
        
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
                  <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 w-full sm:w-auto">
                    <QrCode className="w-4 h-4 text-indigo-400 shrink-0 ml-1" />
                    <Input
                      type="text"
                      placeholder="Scan/Type QR Tag (e.g. AC-IT-NEW-ERPLAB-01)"
                      value={manualQRTag}
                      onChange={(e) => setManualQRTag(e.target.value)}
                      className="h-7 text-xs bg-slate-900 border-slate-700 text-white w-full sm:w-52 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyQRTag(manualQRTag.trim())}
                      disabled={!manualQRTag.trim() || qrScanning}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 shrink-0"
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

                {qrError && (
                  <div className="mb-6 p-4 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-3 text-xs sm:text-sm animate-in fade-in">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                    <span>{qrError}</span>
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

                    </div>
                  )}

                  {/* STEP 3: URGENCY & REQUIRED RESOLUTION TIMEFRAME */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" /> 3. How Urgently Do You Need This Fixed?
                        </label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Select your required repair timeframe for campus technicians.
                        </p>
                      </div>
                      <Badge variant="outline" className={`px-2.5 py-1 text-xs font-bold border shrink-0 ${livePriority.color}`}>
                        Target SLA: {livePriority.level} ({livePriority.sla})
                      </Badge>
                    </div>

                    {/* Direct Urgency Selector Buttons (4 Tiers) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                      {[
                        {
                          id: 'IMMEDIATE',
                          badge: 'Within 1 Hour',
                          title: 'Immediate / Emergency',
                          desc: 'Lecture or exam in session, safety risk, or total blocker',
                          icon: '🚨',
                          activeClass: 'bg-rose-500/20 border-rose-500 text-white shadow-md shadow-rose-500/10',
                        },
                        {
                          id: 'HIGH',
                          badge: 'Within 4 Hours',
                          title: 'Urgent Priority',
                          desc: 'Needed for today’s classes or faculty operations',
                          icon: '⚡',
                          activeClass: 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10',
                        },
                        {
                          id: 'MEDIUM',
                          badge: 'Within 8 Hours',
                          title: 'Standard (Same Day)',
                          desc: 'Faulty equipment, needs fix before campus closes',
                          icon: '⏱️',
                          activeClass: 'bg-blue-500/20 border-blue-500 text-white shadow-md shadow-blue-500/10',
                        },
                        {
                          id: 'LOW',
                          badge: 'Within 24 Hours',
                          title: 'Routine Maintenance',
                          desc: 'Minor issue or scheduled maintenance checkup',
                          icon: '📋',
                          activeClass: 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10',
                        },
                      ].map((u) => {
                        const isSelected = selectedUrgency === u.id || (u.id === 'IMMEDIATE' && (safetyRisk || classInProgress));
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUrgency(u.id as any);
                            }}
                            className={`p-3 rounded-lg border text-left transition flex flex-col justify-between gap-2 ${
                              isSelected
                                ? u.activeClass
                                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-base">{u.icon}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isSelected ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {u.badge}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{u.title}</p>
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{u.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Specific Situational Context Factors */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Additional Situational Factors:
                      </span>

                      {/* Factor 1: Safety Hazard */}
                      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-slate-900/90 border border-slate-800 gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-rose-400 shrink-0" /> Is there an active safety danger or hazard?
                          </span>
                          <p className="text-[11px] text-slate-400">
                            Electrical sparks, smoke, burning smell, or water near sockets (Immediately sets Within 1 Hour).
                          </p>
                        </div>
                        <Switch
                          checked={safetyRisk}
                          onCheckedChange={(checked) => {
                            setSafetyRisk(checked);
                            if (checked) setSelectedUrgency('IMMEDIATE');
                          }}
                        />
                      </div>

                      {/* Factor 2: Class in Progress */}
                      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-slate-900/90 border border-slate-800 gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs font-medium text-white flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" /> Is a lecture, lab session, or exam in progress right now?
                          </span>
                          <p className="text-[11px] text-slate-400">
                            Academic work is actively blocked and requires an on-site technician right now (Within 1 Hour).
                          </p>
                        </div>
                        <Switch
                          checked={classInProgress}
                          onCheckedChange={(checked) => {
                            setClassInProgress(checked);
                            if (checked) setSelectedUrgency('IMMEDIATE');
                          }}
                        />
                      </div>

                      {/* Factor 3: People affected */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-lg bg-slate-900/90 border border-slate-800 gap-2.5">
                        <span className="text-xs font-medium text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-400 shrink-0" /> How many people are affected?
                        </span>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          {[
                            { count: 1, label: 'Just me (1)' },
                            { count: 5, label: 'Small group (2-10)' },
                            { count: 20, label: 'Entire room (10+)' },
                          ].map((item) => (
                            <button
                              key={item.count}
                              type="button"
                              onClick={() => setAffectedCount(item.count)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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

                          {/* Ticket Photo Preview */}
                          {t.image_url && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Attached Problem Photo</span>
                              <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-800 cursor-pointer" onClick={() => window.open(resolveImageUrl(t.image_url), '_blank')}>
                                <img 
                                  src={resolveImageUrl(t.image_url)} 
                                  alt="Reported Defect" 
                                  className="w-full h-full object-cover hover:scale-105 transition" 
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              </div>
                            </div>
                          )}

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
                              Reported on {new Date(t.CreatedAt).toLocaleDateString()} at {new Date(t.CreatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
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
      <Dialog open={!!ratingTicket} onOpenChange={(open) => { if (!open) closeRatingDialog(); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[88vh] overflow-y-auto overflow-x-hidden p-3.5 sm:p-6">
          <DialogHeader className="pr-7 sm:pr-8">
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