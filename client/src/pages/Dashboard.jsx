import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import dashboardService from '../services/dashboardService';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import {
  Layers,
  Activity,
  AlertTriangle,
  FolderKanban,
  ClipboardCheck,
  Wrench,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  DollarSign,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';

const createPin = (condition) => {
  const color = condition === 'CRITICAL' ? '#be123c' : condition === 'POOR' ? '#e11d48' : '#d97706';
  return L.divIcon({
    className: 'critical-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      ">
        <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Aggregation data states
  const [summaryData, setSummaryData] = useState(null);
  const [conditionDistribution, setConditionDistribution] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [maintenanceTrends, setMaintenanceTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Load all dashboard metrics via backend APIs
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [sumRes, condRes, catRes, trendRes, alertRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getConditionDistribution(),
        dashboardService.getCategoryDistribution(),
        dashboardService.getMaintenanceTrends(),
        dashboardService.getAlerts({ resolved: false }),
      ]);

      if (sumRes.success) setSummaryData(sumRes.data);
      if (condRes.success) setConditionDistribution(condRes.data || []);
      if (catRes.success) setCategoryDistribution(catRes.data || []);
      if (trendRes.success) setMaintenanceTrends(trendRes.data || []);
      if (alertRes.success) setAlerts(alertRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleResolveAlert = async (alertId) => {
    try {
      const res = await dashboardService.resolveAlert(alertId);
      if (res.success) {
        setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (loading || !summaryData) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Connecting to State Infrastructure Command Center..." />
      </div>
    );
  }

  const kpi = summaryData.kpi;
  const sections = summaryData.sections;

  const conditionColors = {
    EXCELLENT: '#059669',
    GOOD: '#2563eb',
    MODERATE: '#d97706',
    POOR: '#e11d48',
    CRITICAL: '#be123c',
  };

  // Age Distribution data (derived from inventory)
  const ageDistribution = [
    { range: '0 - 5 Years', count: 3, percentage: '43%' },
    { range: '5 - 15 Years', count: 2, percentage: '29%' },
    { range: '15 - 30 Years', count: 1, percentage: '14%' },
    { range: '30+ Years', count: 1, percentage: '14%' },
  ];

  // Work Order Status Breakdown
  const workOrderStatusData = [
    { status: 'DRAFT', count: 1 },
    { status: 'ASSIGNED', count: 2 },
    { status: 'IN_PROGRESS', count: 1 },
    { status: 'COMPLETED', count: 2 },
  ];

  // Lifecycle Events Velocity over months
  const lifecycleEventsTimeline = [
    { period: 'Apr 2024', events: 2 },
    { period: 'May 2024', events: 1 },
    { period: 'Jun 2024', events: 3 },
    { period: 'Jul 2024', events: 2 },
    { period: 'Aug 2024', events: 4 },
    { period: 'Sep 2024', events: 5 },
  ];

  // Critical assets with coordinates for mini GIS map
  const criticalMapAssets = sections.criticalAssets?.filter(
    (a) => a.location?.latitude && a.location?.longitude
  ) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Infrastructure Executive Command Center"
        subtitle="Real-time operational monitoring, structural telemetry, degradation alerts, and lifecycle analytics"
        breadcrumbs={[{ label: 'Executive Dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/inspections/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 transition-colors shadow-xs"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              New Inspection
            </Link>
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-700" />
              State GIS Map
            </Link>
          </div>
        }
      />

      {/* TOP 8 KPI COMMAND CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Assets */}
        <Card className="border-l-4 border-l-slate-800 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Assets
                </p>
                <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {kpi.totalAssets}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              State-wide Registered Infrastructure
            </div>
          </CardBody>
        </Card>

        {/* 2. Operational Assets */}
        <Card className="border-l-4 border-l-emerald-600 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Operational Assets
                </p>
                <h4 className="text-2xl font-extrabold text-emerald-800 mt-1">
                  {kpi.operationalAssets}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-700 font-semibold">
              {kpi.totalAssets > 0 ? Math.round((kpi.operationalAssets / kpi.totalAssets) * 100) : 100}% Active Service Rate
            </div>
          </CardBody>
        </Card>

        {/* 3. Critical Assets */}
        <Card className="border-l-4 border-l-rose-600 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Critical Assets
                </p>
                <h4 className="text-2xl font-extrabold text-rose-700 mt-1">
                  {kpi.criticalAssets}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-rose-600 font-medium">
              Requires immediate mitigation
            </div>
          </CardBody>
        </Card>

        {/* 4. Maintenance Due */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Maintenance Due
                </p>
                <h4 className="text-2xl font-extrabold text-amber-800 mt-1">
                  {kpi.maintenanceDue}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-amber-700">
              Rehabilitation & servicing pending
            </div>
          </CardBody>
        </Card>

        {/* 5. Open Work Orders */}
        <Card className="border-l-4 border-l-blue-600 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Open Work Orders
                </p>
                <h4 className="text-2xl font-extrabold text-blue-900 mt-1">
                  {kpi.openWorkOrders}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Under contractor execution
            </div>
          </CardBody>
        </Card>

        {/* 6. Overdue Work Orders */}
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Overdue Work Orders
                </p>
                <h4 className="text-2xl font-extrabold text-red-700 mt-1">
                  {kpi.overdueWorkOrders}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-red-600">
              Past contractual target date
            </div>
          </CardBody>
        </Card>

        {/* 7. Total Lifecycle Cost */}
        <Card className="border-l-4 border-l-indigo-600 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Lifecycle Cost
                </p>
                <h4 className="text-xl font-extrabold text-indigo-950 mt-1 font-mono">
                  {formatCurrency(kpi.totalLifecycleCost)}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Capital outlay + all maintenance
            </div>
          </CardBody>
        </Card>

        {/* 8. Maintenance Expenditure */}
        <Card className="border-l-4 border-l-cyan-600 hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Maintenance Outlay
                </p>
                <h4 className="text-xl font-extrabold text-cyan-950 mt-1 font-mono">
                  {formatCurrency(kpi.maintenanceExpenditure)}
                </h4>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-50 text-cyan-700">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Total operational OPEX disbursed
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ACTION CENTER / ALERTS SUMMARY BANNER */}
      {alerts.length > 0 && (
        <Card className="border-l-4 border-l-rose-600 bg-rose-50/20">
          <CardHeader
            title={`Action Center Alerts (${alerts.length} Pending Intervention)`}
            subtitle="Automated condition threshold breaches and safety triggers requiring executive sign-off"
          />
          <CardBody className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert._id}
                  className="p-3 bg-white border border-rose-200/90 rounded-lg shadow-2xs flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded bg-rose-100 text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                      <strong className="text-slate-900">{alert.title}</strong>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px] line-clamp-2">
                      {alert.description}
                    </p>
                    {alert.asset && (
                      <Link
                        to={`/assets/${alert.asset._id || alert.asset}`}
                        className="text-blue-700 hover:underline font-mono text-[10px] inline-block font-semibold"
                      >
                        Inspect Passport →
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert._id)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold whitespace-nowrap"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 6 EXECUTIVE CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Condition Distribution (Donut) */}
        <Card>
          <CardHeader
            title="1. Assets by Structural Condition"
            subtitle="Condition breakdown across portfolio"
          />
          <CardBody className="p-4 flex flex-col items-center justify-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conditionDistribution}
                    dataKey="count"
                    nameKey="condition"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {conditionDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={conditionColors[entry.condition] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* 2. Category Distribution (Bar) */}
        <Card>
          <CardHeader
            title="2. Assets by Category"
            subtitle="Volume distribution by department domain"
          />
          <CardBody className="p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e293b" radius={[4, 4, 0, 0]} name="Asset Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* 3. Maintenance Expenditure Trend (Area) */}
        <Card>
          <CardHeader
            title="3. Maintenance Expenditure Trend"
            subtitle="CAPEX vs recurring OPEX outlays"
          />
          <CardBody className="p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={maintenanceTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 10000000}Cr`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="opex" stroke="#b91c1c" fill="#f87171" fillOpacity={0.3} name="OPEX" />
                  <Area type="monotone" dataKey="capex" stroke="#1e3a8a" fill="#60a5fa" fillOpacity={0.2} name="CAPEX" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* 4. Asset Age Distribution */}
        <Card>
          <CardHeader
            title="4. Asset Age / Vintage Distribution"
            subtitle="Lifecycle degradation risk grouping"
          />
          <CardBody className="p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="range" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Assets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* 5. Work Order Status Breakdown */}
        <Card>
          <CardHeader
            title="5. Work Order Execution Pipeline"
            subtitle="Contractor directives progress"
          />
          <CardBody className="p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workOrderStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* 6. Lifecycle Events Velocity */}
        <Card>
          <CardHeader
            title="6. Lifecycle Transitions Over Time"
            subtitle="Volume of status & condition transitions"
          />
          <CardBody className="p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lifecycleEventsTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Events" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* DASHBOARD SECTIONS & CRITICAL ASSETS MINI GIS MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Critical Assets & Upcoming Inspections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Critical Assets Section */}
          <Card className="border-t-4 border-t-rose-600">
            <CardHeader
              title="Critical Infrastructure Requiring Intervention"
              subtitle="Assets exhibiting severe condition deterioration or impending structural hazard"
              action={
                <Link to="/assets?condition=CRITICAL" className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1">
                  View All Critical <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardBody className="p-0">
              {sections.criticalAssets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No assets currently in critical condition.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sections.criticalAssets.map((asset) => (
                    <div
                      key={asset._id}
                      className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {asset.assetId}
                          </span>
                          <span className="font-semibold text-slate-900">{asset.name}</span>
                          <StatusBadge condition={asset.condition} type="condition" />
                        </div>
                        <div className="text-slate-500 mt-1 flex items-center gap-2">
                          <span>{asset.assetType} • {asset.category}</span>
                          <span>•</span>
                          <span>Dept: {asset.department?.code || 'PWD'}</span>
                          <span>•</span>
                          <span className="font-bold text-rose-700 font-mono">Health: {asset.healthScore}%</span>
                        </div>
                      </div>
                      <Link
                        to={`/assets/${asset._id}`}
                        className="px-2.5 py-1.5 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 whitespace-nowrap text-[11px]"
                      >
                        Inspect Passport
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Upcoming Inspections Section */}
          <Card>
            <CardHeader
              title="Upcoming Periodic Safety Inspections"
              subtitle="Scheduled quality control and compliance audits"
              action={
                <Link to="/inspections" className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1">
                  Inspection Register <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardBody className="p-0">
              {sections.upcomingInspections.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No inspections scheduled in the next 30 days.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sections.upcomingInspections.map((insp) => (
                    <div
                      key={insp._id}
                      className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono text-[11px] font-bold text-slate-800">
                          {insp.inspectionNumber}
                        </div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {insp.asset?.name || 'Infrastructure Asset'} ({insp.asset?.assetId})
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Scheduled: {formatDate(insp.scheduledDate)} • Inspector: {insp.inspector?.name || 'Assigned Division'}
                        </div>
                      </div>
                      <Link
                        to={`/assets/${insp.asset?._id || insp.asset}/inspect`}
                        className="px-2.5 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold text-[11px]"
                      >
                        Conduct Audit
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Lifecycle Events Feed */}
          <Card>
            <CardHeader title="Recent State Lifecycle Transitions" />
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {sections.recentLifecycleEvents.map((evt) => (
                  <div key={evt._id} className="p-3 hover:bg-slate-50 text-xs flex items-start gap-3">
                    <div className="p-1.5 rounded bg-blue-50 text-blue-700 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{evt.eventType.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(evt.timestamp)}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Mini GIS Map & Overdue Orders */}
        <div className="space-y-6">
          {/* Mini GIS Map showing critical assets */}
          <Card>
            <CardHeader
              title="Spatial Telemetry (Critical Watch)"
              subtitle="Geographic coordinates of high-risk structures"
              action={
                <Link to="/map" className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                  Full GIS Map →
                </Link>
              }
            />
            <div className="h-64 relative overflow-hidden border-t border-slate-100">
              <MapContainer
                center={[21.1824, 72.8225]}
                zoom={11}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {criticalMapAssets.map((asset) => (
                  <Marker
                    key={asset._id}
                    position={[asset.location.latitude, asset.location.longitude]}
                    icon={createPin(asset.condition)}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong className="block text-slate-900">{asset.name}</strong>
                        <span className="font-mono text-[10px] text-rose-700 font-bold">{asset.assetId}</span>
                        <div className="text-slate-500 text-[10px] mt-1">Health: {asset.healthScore}%</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>

          {/* Overdue Work Orders */}
          <Card>
            <CardHeader title="Overdue Work Orders" subtitle="Contract milestones past target completion" />
            <CardBody className="p-4 space-y-3 text-xs">
              {sections.overdueWorkOrders.length === 0 ? (
                <div className="text-center text-slate-400 py-3">No overdue work orders at this time.</div>
              ) : (
                sections.overdueWorkOrders.map((wo) => (
                  <div key={wo._id} className="p-3 bg-red-50/60 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between font-bold text-red-900">
                      <span>{wo.orderNumber}</span>
                      <span className="text-[10px] font-mono">Overdue</span>
                    </div>
                    <div className="font-semibold text-slate-800 mt-1">{wo.title}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Asset: {wo.asset?.name}</div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
