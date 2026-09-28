import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  MapPin,
  ClipboardCheck,
  Wrench,
  FileText,
  FolderKanban,
  Building2,
  Files,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  Users,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Landmark,
  ExternalLink,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const navigationLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', path: '/assets', icon: Layers },
  { name: 'GIS Map', path: '/map', icon: MapPin },
  { name: 'Inspections', path: '/inspections', icon: ClipboardCheck },
  { name: 'Issues', path: '/issues', icon: AlertCircle },
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  { name: 'Work Orders', path: '/work-orders', icon: FileText },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Contractors', path: '/contractors', icon: Building2 },
  { name: 'Documents', path: '/documents', icon: Files },
  { name: 'Financials', path: '/financials', icon: DollarSign },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Alerts', path: '/alerts', icon: AlertTriangle, badge: '1' },
  { name: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck },
  { name: 'Users', path: '/users', icon: Users, adminOnly: true },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const AppLayout = () => {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sampleNotifications = [
    {
      id: 1,
      title: 'Structural Alert: Tapi Causeway',
      time: '12m ago',
      type: 'critical',
      desc: 'Health score degraded to 36. Immediate intervention ordered.',
    },
    {
      id: 2,
      title: 'Milling Work Order Active',
      time: '1h ago',
      type: 'info',
      desc: 'Apex Infra commenced resurfacing on Ring Road Corridor.',
    },
    {
      id: 3,
      title: 'Capital Inspection Due',
      time: '3h ago',
      type: 'warning',
      desc: 'Adajan RO Plant biannual quality audit scheduled for next week.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Banner: Government Identity Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 z-30 sticky top-0 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          {/* Left: Mobile trigger & System Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center text-white shadow-sm border border-blue-500/30">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-sm sm:text-base leading-none">
                    InfraTrack
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-900/80 text-blue-200 border border-blue-700/50 px-1.5 py-0.5 rounded">
                    Gov.in
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  State Infrastructure Asset Lifecycle Platform
                </span>
              </div>
            </div>
          </div>

          {/* Right: Notifications & User Profile */}
          <div className="flex items-center gap-3">
            {/* Department Pill */}
            {user?.department && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/70 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-slate-200">{user.department.code}</span>
                <span className="text-slate-400">|</span>
                <span className="text-[11px] truncate max-w-[150px]">{user.department.name}</span>
              </div>
            )}

            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 py-2 text-slate-800 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      System Notifications
                    </span>
                    <span className="text-[10px] font-medium bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                      3 Unread
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {sampleNotifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
                    <NavLink
                      to="/alerts"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center justify-center gap-1"
                    >
                      View All Alerts <ExternalLink className="w-3 h-3" />
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold leading-tight text-slate-100">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {user?.designation || user?.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 text-slate-800 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-2">
                      <StatusBadge role={user?.role} type="role" />
                    </div>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      Account & Preferences
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Secure Government Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-slate-200/90 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 pt-14 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Active Clearance
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{user?.role}</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Session Active" />
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navigationLinks.map((item) => {
                if (item.adminOnly && !hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN')) {
                  return null;
                }

                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Sidebar Footer with Logout & Version */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Sign Out</span>
              </button>
              <div className="mt-2 text-[10px] text-slate-400 text-center">
                InfraTrack v1.0.0 | NIC Gov Standard
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-10 lg:hidden backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
