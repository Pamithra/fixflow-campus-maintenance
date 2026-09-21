'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Bell, 
  CheckCircle2, 
  ChevronDown, 
  GraduationCap, 
  History, 
  LayoutDashboard, 
  LogOut, 
  PlusCircle, 
  Shield, 
  Sparkles, 
  User as UserIcon, 
  Wrench,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Notification state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/my');
      const list = res.data.notifications || [];
      // Only keep unread notifications in the notification center
      const unreadList = list.filter((n: any) => !n.is_read);
      setNotifications(unreadList);
      setUnreadCount(unreadList.length);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  const handleNotificationClick = (notif: any) => {
    setShowNotifications(false);
    if (!notif.is_read) {
      api.patch('/notifications/read', { id: notif.ID }).catch(() => {});
      // Remove read notification from the dropdown list
      setNotifications((prev) => prev.filter((n) => n.ID !== notif.ID));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notif.type === 'COMPLETION' && notif.ticket_number) {
      router.push(`/report?tab=history&rateTicket=${encodeURIComponent(notif.ticket_number)}`);
    } else if (role === 'TECHNICIAN') {
      router.push('/tasks');
    } else if (role === 'ADMIN') {
      router.push('/dashboard');
    } else {
      router.push('/report?tab=history');
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // WebSocket real-time updates
  useWebSocket((event) => {
    if (event.type === 'SMS_NOTIFICATION' || event.type === 'WORK_ORDER_ASSIGNED') {
      loadNotifications();
    }
  });

  if (!user) return null;

  const role = user.role;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-1 sm:gap-4 w-full">
        
        {/* Brand & Role Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href={role === 'ADMIN' ? '/dashboard' : role === 'TECHNICIAN' ? '/tasks' : '/report'} className="flex items-center gap-1.5 sm:gap-2 group">
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">
              Fix<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Flow</span>
            </span>
          </Link>

          <Badge className={`hidden md:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border ${
            role === 'ADMIN' 
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' 
              : role === 'TECHNICIAN'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : role === 'STAFF'
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          }`}>
            {role === 'ADMIN' ? '👑 Admin' : role === 'TECHNICIAN' ? '🔧 Technician' : role === 'STAFF' ? '💼 Staff' : '🎓 Student'}
          </Badge>
        </div>

        {/* Role-Based Nav Links */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* ADMIN LINKS */}
          {role === 'ADMIN' && (
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-xs gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 ${
                  pathname === '/dashboard' 
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          )}

          {/* TECHNICIAN LINKS */}
          {role === 'TECHNICIAN' && (
            <>
              <Link href="/tasks">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`text-xs gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 ${
                    pathname === '/tasks' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] sm:text-xs">Tasks</span>
                </Button>
              </Link>
              <Link href="/report">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`text-xs gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 ${
                    pathname === '/report' 
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] sm:text-xs">Report</span>
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions: Notifications Bell & User Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Notification Bell with Popover */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowNotifications(!showNotifications);
              }}
              className="relative p-2 h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Notifications Popover Dropdown */}
            {showNotifications && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 max-h-[80vh] flex flex-col">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-400" /> Notifications & Alerts
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline transition"
                      >
                        Mark all read
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
                    </span>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 text-xs flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      No unread notifications. You are all caught up!
                    </div>
                  ) : (
                    notifications.map((n, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 transition flex items-start gap-2.5 cursor-pointer ${
                          !n.is_read
                            ? 'bg-slate-900/90 hover:bg-slate-800/90 border-l-2 border-indigo-500'
                            : 'hover:bg-slate-800/40 opacity-75'
                        }`}
                      >
                        <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
                          {n.type === 'COMPLETION' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-200 truncate">{n.ticket_number || 'FixFlow Alert'}</span>
                              {!n.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {n.CreatedAt ? new Date(n.CreatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Recent'}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed break-words">{n.message}</p>
                          
                          {/* Rating CTA prompt for completed repairs */}
                          {n.type === 'COMPLETION' && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/25 transition">
                              ⭐ Click here to rate service (1-5★)
                            </div>
                          )}

                          {n.recipient_phone && (
                            <p className="text-[10px] text-indigo-300/80 mt-1">
                              📱 Dispatched to {n.recipient_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Sign Out */}
          <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-800 pl-1.5 sm:pl-2">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">{user.full_name}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.phone_number || user.email}</div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              title="Log out"
              className="h-8 w-8 sm:w-auto p-0 sm:px-2.5 border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white text-xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>

        </div>

      </div>
    </header>
  );
}
