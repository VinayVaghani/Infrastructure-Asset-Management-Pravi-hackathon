import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import assetService from '../services/assetService';
import contractorService from '../services/contractorService';
import { governanceService } from '../services/governanceService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Activity,
  ClipboardCheck,
  Wrench,
  FileText,
  DollarSign,
  Files,
  AlertTriangle,
  History,
  ShieldCheck,
  Edit2,
  Share2,
  Download,
  CheckCircle2,
  Clock,
  User,
  Plus,
  ArrowRight,
  ExternalLink,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const createPinIcon = (condition) => {
  const colorMap = {
    EXCELLENT: '#059669',
    GOOD: '#2563eb',
    MODERATE: '#d97706',
    POOR: '#e11d48',
    CRITICAL: '#be123c',
  };
  const bg = colorMap[condition] || '#1e293b';

  return L.divIcon({
    className: 'passport-pin',
    html: `
      <div style="
        background-color: ${bg};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      ">
        <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const AssetPassport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-resource states
  const [lifecycleEvents, setLifecycleEvents] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [issues, setIssues] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [financials, setFinancials] = useState([]);

  // Action Modals State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Departments and officers for transfer/assignments
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [contractors, setContractors] = useState([]);

  const [dataQuality, setDataQuality] = useState(null);

  // Action Form States
  const [transferData, setTransferData] = useState({
    targetDepartmentId: '',
    targetCustodianId: '',
    transferDate: new Date().toISOString().split('T')[0],
    reason: '',
    supportingDocument: '',
  });
  const [issueData, setIssueData] = useState({ title: '', severity: 'HIGH', issueType: 'STRUCTURAL', description: '', locationDetails: '' });
  const [workOrderData, setWorkOrderData] = useState({ title: '', priority: 'HIGH', estimatedCost: '', targetCompletionDate: '', contractor: '', issueId: '' });
  const [inspectionData, setInspectionData] = useState({ overallCondition: 'GOOD', score: 85, remarks: '' });
  const [docData, setDocData] = useState({ title: '', documentType: 'DRAWING', fileUrl: '' });

  // Load complete asset passport data
  const loadAssetPassport = async () => {
    setLoading(true);
    try {
      const [
        assetRes,
        lifecycleRes,
        inspectionsRes,
        maintenanceRes,
        workOrdersRes,
        docsRes,
        issuesRes,
        auditRes,
        financialsRes,
        deptsRes,
        officersRes,
        contractorsRes,
      ] = await Promise.all([
        assetService.getAssetById(id),
        assetService.getLifecycle(id).catch(() => ({ data: [] })),
        assetService.getInspections(id).catch(() => ({ data: [] })),
        assetService.getMaintenance(id).catch(() => ({ data: [] })),
        assetService.getWorkOrders(id).catch(() => ({ data: [] })),
        assetService.getDocuments(id).catch(() => ({ data: [] })),
        assetService.getIssues(id).catch(() => ({ data: [] })),
        assetService.getAudit(id).catch(() => ({ data: [] })),
        assetService.getFinancials(id).catch(() => ({ data: [] })),
        assetService.getDepartments().catch(() => ({ data: [] })),
        assetService.getOfficers().catch(() => ({ data: [] })),
        contractorService.getContractors().catch(() => ({ data: [] })),
        governanceService.getAssetDataQuality(id).catch(() => ({ data: null })),
      ]);

      if (assetRes.success) {
        setAsset(assetRes.data);
      } else {
        addToast({ type: 'error', title: 'Asset Not Found', message: assetRes.message });
        navigate('/assets');
      }

      setLifecycleEvents(lifecycleRes.data || []);
      setInspections(inspectionsRes.data || []);
      setMaintenanceRecords(maintenanceRes.data || []);
      setWorkOrders(workOrdersRes.data || []);
      setDocuments(docsRes.data || []);
      setIssues(issuesRes.data || []);
      setAuditLogs(auditRes.data || []);
      setFinancials(financialsRes.data || []);
      setDepartments(deptsRes.data || []);
      setOfficers(officersRes.data || []);
      setContractors(contractorsRes.data || []);
      setDataQuality(qualityRes?.data || null);
    } catch (err) {
      console.error('Failed to load asset passport:', err);
      addToast({ type: 'error', title: 'Failed to load passport', message: 'Network or database error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetPassport();
  }, [id]);

  // Handle Transfer Submit
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await assetService.transferAsset(asset._id, transferData);
      if (res.success) {
        addToast({ type: 'success', title: 'Asset Transferred', message: res.message });
        setTransferModalOpen(false);
        loadAssetPassport();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Transfer Failed', message: err.response?.data?.message || 'Error transferring' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Issue Submit
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await assetService.createIssue(asset._id, issueData);
      if (res.success) {
        addToast({ type: 'success', title: 'Issue Flagged', message: 'Issue ticket registered & lifecycle event logged.' });
        setIssueModalOpen(false);
        loadAssetPassport();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to report issue', message: err.response?.data?.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Work Order Submit
  const handleWorkOrderSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await assetService.createWorkOrder(asset._id, workOrderData);
      if (res.success) {
        addToast({ type: 'success', title: 'Work Order Issued', message: `Order ${res.data?.orderNumber} issued.` });
        setWorkOrderModalOpen(false);
        loadAssetPassport();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to issue work order', message: err.response?.data?.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Inspection Submit
  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await assetService.createInspection(asset._id, inspectionData);
      if (res.success) {
        addToast({ type: 'success', title: 'Inspection Recorded', message: 'Structural audit completed and condition updated.' });
        setInspectionModalOpen(false);
        loadAssetPassport();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to record inspection', message: err.response?.data?.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Document Upload Submit
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await assetService.createDocument(asset._id, docData);
      if (res.success) {
        addToast({ type: 'success', title: 'Document Vault Updated', message: 'New blueprint / document attached.' });
        setDocModalOpen(false);
        loadAssetPassport();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to upload document', message: err.response?.data?.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading || !asset) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Retrieving Official Digital Asset Passport..." />
      </div>
    );
  }

  const lat = asset.location?.latitude || 21.1824;
  const lng = asset.location?.longitude || 72.8225;

  // Chronological inspections and multi-year health score deterioration trajectory
  const sortedChronologicalInspections = React.useMemo(() => {
    return [...inspections].sort(
      (a, b) => new Date(a.conductedDate || a.createdAt) - new Date(b.conductedDate || b.createdAt)
    );
  }, [inspections]);

  const healthHistoryData = React.useMemo(() => {
    if (sortedChronologicalInspections.length > 0) {
      return sortedChronologicalInspections.map((insp) => {
        const d = new Date(insp.conductedDate || insp.createdAt);
        return {
          year: d.getFullYear().toString(),
          displayDate: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          score: insp.score || 85,
          condition: insp.overallCondition || 'GOOD',
          inspector: insp.inspector?.name || 'Authorized Inspector',
          number: insp.inspectionNumber,
        };
      });
    }

    // Default multi-year deterioration curve baseline based on current asset healthScore
    const currentYear = new Date().getFullYear();
    const currentScore = asset.healthScore || 85;
    return [
      { year: `${currentYear - 3}`, displayDate: `${currentYear - 3}`, score: Math.min(100, currentScore + 18), condition: 'EXCELLENT' },
      { year: `${currentYear - 2}`, displayDate: `${currentYear - 2}`, score: Math.min(100, currentScore + 12), condition: 'GOOD' },
      { year: `${currentYear - 1}`, displayDate: `${currentYear - 1}`, score: Math.min(100, currentScore + 6), condition: 'GOOD' },
      { year: `${currentYear}`, displayDate: `${currentYear}`, score: currentScore, condition: asset.condition || 'GOOD' },
    ];
  }, [sortedChronologicalInspections, asset]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'location', label: 'Location & GIS', icon: MapPin },
    { id: 'lifecycle', label: `Lifecycle (${lifecycleEvents.length})`, icon: Activity },
    { id: 'condition', label: 'Condition & Health', icon: CheckCircle2 },
    { id: 'inspections', label: `Inspections (${inspections.length})`, icon: ClipboardCheck },
    { id: 'maintenance', label: `Maintenance (${maintenanceRecords.length})`, icon: Wrench },
    { id: 'work-orders', label: `Work Orders (${workOrders.length})`, icon: FileText },
    { id: 'financial', label: 'Financial Ledger', icon: DollarSign },
    { id: 'documents', label: `Documents (${documents.length})`, icon: Files },
    { id: 'issues', label: `Issues (${issues.length})`, icon: AlertTriangle },
    { id: 'custody', label: 'Ownership History', icon: History },
    { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/assets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Asset Inventory</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">
          Last Verified: {formatDateTime(asset.updatedAt)}
        </span>
      </div>

      {/* Flagship Digital Passport Hero Header */}
      <Card className="border-t-4 border-t-blue-700 bg-white shadow-sm overflow-hidden">
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Asset Identity & Classification */}
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-300">
                  {asset.assetId}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {asset.category}
                </span>
                <span className="text-xs font-medium text-slate-600 px-2 py-0.5 bg-slate-50 rounded border border-slate-200">
                  {asset.assetType}
                </span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {asset.department?.code || 'PWD'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {asset.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {asset.description || 'Public government capital asset registered in Gujarat Infrastructure Registry.'}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  {asset.location?.city}, {asset.location?.district}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Custodian: {asset.custodian?.name || 'Assigned Division'}
                </span>
              </div>
            </div>

            {/* Health & Status Dashboard Hero Widget */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex-shrink-0">
              {/* Radial/Circular Health Indicator */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="5" fill="none" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke={asset.healthScore > 80 ? '#059669' : asset.healthScore > 60 ? '#d97706' : '#be123c'}
                      strokeWidth="5"
                      strokeDasharray="175"
                      strokeDashoffset={175 - (175 * asset.healthScore) / 100}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute font-extrabold text-sm text-slate-900 font-mono">
                    {asset.healthScore}%
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                  Health Index
                </span>
              </div>

              {/* Data Completeness Gauge */}
              <div className="flex flex-col items-center border-l border-slate-200 pl-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="5" fill="none" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke={
                        (dataQuality?.completenessScore || 85) >= 85
                          ? '#059669'
                          : (dataQuality?.completenessScore || 85) >= 50
                          ? '#d97706'
                          : '#be123c'
                      }
                      strokeWidth="5"
                      strokeDasharray="175"
                      strokeDashoffset={175 - (175 * (dataQuality?.completenessScore || 85)) / 100}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute font-extrabold text-sm text-slate-900 font-mono">
                    {dataQuality?.completenessScore || 85}%
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                  Completeness
                </span>
              </div>

              {/* Status and Condition Pills */}
              <div className="space-y-2 border-l border-slate-200 pl-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Operational Status</span>
                  <StatusBadge status={asset.status} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Structural Condition</span>
                  <StatusBadge condition={asset.condition} type="condition" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Directive Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gov"
                size="sm"
                icon={ClipboardCheck}
                onClick={() => navigate(`/assets/${asset._id}/inspect`)}
              >
                Conduct Inspection
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={AlertTriangle}
                onClick={() => setIssueModalOpen(true)}
              >
                Create Issue
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                onClick={() => setWorkOrderModalOpen(true)}
              >
                Create Work Order
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={Files}
                onClick={() => setDocModalOpen(true)}
              >
                Upload Document
              </Button>

              {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN') && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Share2}
                  onClick={() => setTransferModalOpen(true)}
                >
                  Transfer Asset
                </Button>
              )}
            </div>

            <div className="text-xs font-mono font-bold text-slate-800">
              Total Lifecycle Cost: {formatCurrency(asset.totalLifecycleCost)}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-t-lg shadow-2xs overflow-x-auto">
        <nav className="flex space-x-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panels */}
      <div className="space-y-6">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Administrative & Structural Overview" />
              <CardBody className="space-y-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Asset Purpose & Scope
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {asset.description || 'No extended description recorded.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-semibold">Department</span>
                    <span className="font-bold text-slate-800">{asset.department?.name} ({asset.department?.code})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Assigned Custodian</span>
                    <span className="font-bold text-slate-800">{asset.custodian?.name || 'Unassigned'}</span>
                    <span className="text-[10px] text-slate-400 block">{asset.custodian?.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Parent Asset</span>
                    <span className="font-bold text-slate-800">
                      {asset.parentAsset ? `${asset.parentAsset.assetId} - ${asset.parentAsset.name}` : 'Standalone Root Asset'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-semibold">Installation Date</span>
                    <span className="font-medium text-slate-800">{formatDate(asset.installationDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Commissioning Date</span>
                    <span className="font-medium text-slate-800">{formatDate(asset.commissioningDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Design Service Life</span>
                    <span className="font-medium text-slate-800">{asset.expectedLifeYears} Years</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Elapsed Age</span>
                    <span className="font-medium text-blue-700">
                      {asset.installationDate ? `${new Date().getFullYear() - new Date(asset.installationDate).getFullYear()} Years` : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Custodian & Registry Contact" />
              <CardBody className="p-4 space-y-3 text-xs">
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                  <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block">
                    Chief Custodian
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {asset.custodian?.name || 'Superintending Engineer'}
                  </div>
                  <div className="text-slate-600 text-[11px]">{asset.custodian?.designation}</div>
                  <div className="text-slate-500 text-[11px] font-mono mt-1">{asset.custodian?.email}</div>
                  <div className="text-slate-500 text-[11px] font-mono">{asset.custodian?.phone || '+91 261 2451000'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
                    Registered Department Head
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5">{asset.department?.name}</div>
                  <div className="text-[11px] text-slate-500">State Gateway: Gujarat Urban & Rural Works</div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* 2. LOCATION & GIS TAB */}
        {activeTab === 'location' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader title="Physical Address & GPS Bounds" />
              <CardBody className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Physical Street Address</span>
                  <p className="font-medium text-slate-800 mt-0.5">{asset.location?.address || 'Civil Lines Expressway Link'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">City</span>
                    <span className="font-medium text-slate-800">{asset.location?.city || 'Surat'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">District</span>
                    <span className="font-medium text-slate-800">{asset.location?.district || 'Surat'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">State</span>
                    <span className="font-medium text-slate-800">{asset.location?.state || 'Gujarat'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Pincode</span>
                    <span className="font-mono font-medium text-slate-800">{asset.location?.pincode || '395001'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">Coordinates (WGS84)</span>
                  <div className="font-mono font-bold text-blue-900 text-xs mt-1">
                    Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2 h-[450px] relative overflow-hidden border border-slate-300">
              <MapContainer center={[lat, lng]} zoom={14} className="w-full h-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={createPinIcon(asset.condition)}>
                  <Popup>
                    <div className="p-1">
                      <span className="font-mono font-bold text-xs text-blue-900">{asset.assetId}</span>
                      <div className="font-bold text-slate-900 text-xs">{asset.name}</div>
                      <div className="text-[11px] text-slate-500">{asset.location?.address}</div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </Card>
          </div>
        )}

        {/* 3. LIFECYCLE TIMELINE TAB */}
        {activeTab === 'lifecycle' && (
          <Card>
            <CardHeader
              title="Official Chronological Lifecycle History"
              subtitle="End-to-end digital lifecycle progression from planning to construction, commissioning, and maintenance"
            />
            <CardBody className="p-6">
              {lifecycleEvents.length === 0 ? (
                <EmptyState title="No Lifecycle Events" message="No lifecycle history has been recorded yet." />
              ) : (
                <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {lifecycleEvents.map((evt, idx) => {
                    const type = evt.eventType || '';
                    let dotColor = 'bg-blue-600';
                    let badgeStyle = 'bg-blue-50 text-blue-900 border-blue-200';

                    if (type.includes('CONSTRUCTION') || type.includes('COMMISSIONED') || type.includes('ASSET_CREATED')) {
                      dotColor = 'bg-emerald-600';
                      badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    } else if (type.includes('INSPECTION')) {
                      dotColor = 'bg-teal-600';
                      badgeStyle = 'bg-teal-50 text-teal-900 border-teal-200';
                    } else if (type.includes('ISSUE')) {
                      dotColor = 'bg-rose-600';
                      badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
                    } else if (type.includes('MAINTENANCE')) {
                      dotColor = 'bg-amber-600';
                      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                    } else if (type.includes('WORK_ORDER')) {
                      dotColor = 'bg-indigo-600';
                      badgeStyle = 'bg-indigo-50 text-indigo-900 border-indigo-200';
                    } else if (type.includes('TRANSFERRED') || type.includes('RETIRED')) {
                      dotColor = 'bg-purple-600';
                      badgeStyle = 'bg-purple-50 text-purple-900 border-purple-200';
                    }

                    return (
                      <div key={evt._id || idx} className="relative group">
                        <span className={`absolute -left-8 top-1 w-3.5 h-3.5 rounded-full ${dotColor} ring-4 ring-white shadow-xs`} />
                        <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-tight ${badgeStyle}`}>
                              {evt.eventType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {formatDateTime(evt.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-xs">{evt.description}</p>

                          {/* Metadata Tags */}
                          {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {Object.entries(evt.metadata)
                                .filter(([k, v]) => typeof v === 'string' || typeof v === 'number')
                                .slice(0, 5)
                                .map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                                    <strong className="text-slate-800">{k}:</strong> {String(v)}
                                  </span>
                                ))}
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Authorized Authority: <strong className="text-slate-800">{evt.performedBy?.name || 'System Engine'}</strong> ({evt.performedBy?.designation || evt.performedBy?.role || 'Authority'})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* 4. CONDITION & HEALTH TAB */}
        {activeTab === 'condition' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader title="Current Structural Rating" />
              <CardBody className="p-6 text-center space-y-4">
                <div className="inline-block p-4 rounded-full bg-slate-100 border border-slate-200">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono block">
                    {asset.healthScore}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Health Score
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-500">Condition Assessment:</div>
                  <StatusBadge condition={asset.condition} type="condition" className="text-sm px-3 py-1" />
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Inspection Benchmarks & Safety Cycles" />
              <CardBody className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block font-semibold">Last Completed Inspection</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {asset.lastInspectionDate ? formatDate(asset.lastInspectionDate) : 'Not Inspected Recently'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block font-semibold">Next Scheduled Audit</span>
                    <span className="font-bold text-blue-900 text-sm mt-0.5 block">
                      {asset.nextInspectionDate ? formatDate(asset.nextInspectionDate) : 'Pending Schedule'}
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed text-xs">
                  Under Gujarat State Infrastructure Maintenance Protocol, category <strong>{asset.category}</strong> assets undergo biannual quality testing. Any health score dropping below 60% automatically triggers emergency maintenance alerts.
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* 5. INSPECTIONS TAB & HEALTH DETERIORATION TRAJECTORY */}
        {activeTab === 'inspections' && (
          <div className="space-y-6">
            {/* Health-Score History Deterioration Visualization Card */}
            <Card className="border-blue-200 shadow-sm overflow-hidden">
              <CardHeader
                title="Asset Health Score Deterioration Trajectory"
                subtitle="Chronological multi-year health score monitoring to detect degradation patterns"
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Evaluation Model:</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[10px] font-bold font-mono">
                      30/20/20/15/15 Algorithm
                    </span>
                  </div>
                }
              />
              <CardBody className="p-4 sm:p-6 space-y-4">
                {/* Deterioration Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Initial Score</span>
                    <span className="font-mono text-base font-black text-slate-800">
                      {healthHistoryData[0]?.score || 100}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Current Score</span>
                    <span className={`font-mono text-base font-black ${
                      (asset.healthScore || 85) >= 75 ? 'text-teal-700' :
                      (asset.healthScore || 85) >= 50 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {asset.healthScore || 85}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Net Degradation</span>
                    <span className="font-mono text-base font-black text-rose-700 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      {Math.max(0, (healthHistoryData[0]?.score || 100) - (asset.healthScore || 85))} pts
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Cycles Logged</span>
                    <span className="font-mono text-base font-black text-blue-900">
                      {sortedChronologicalInspections.length || healthHistoryData.length} Audits
                    </span>
                  </div>
                </div>

                {/* Deterioration Area/Line Chart */}
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={healthHistoryData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="passportDeteriorationGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="year"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                        formatter={(val) => [`${val}%`, 'Health Score']}
                        labelFormatter={(label) => `Cycle Year: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#1e3a8a"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#passportDeteriorationGrad)"
                        dot={{ r: 4, fill: '#1e3a8a', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#f59e0b' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Deterioration Step Progression Strip */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-2">
                    Deterioration Timeline Progression:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {healthHistoryData.map((pt, idx) => (
                      <React.Fragment key={idx}>
                        <div className="p-2 px-3 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-2">
                          <span className="font-bold text-slate-700">{pt.year}</span>
                          <span className="text-slate-400 font-bold">&rarr;</span>
                          <span className={`font-mono font-bold ${
                            pt.score >= 90 ? 'text-emerald-700' :
                            pt.score >= 75 ? 'text-teal-700' :
                            pt.score >= 50 ? 'text-amber-700' :
                            pt.score >= 25 ? 'text-orange-700' : 'text-rose-700'
                          }`}>
                            {pt.score}%
                          </span>
                          <StatusBadge condition={pt.condition} type="condition" />
                        </div>
                        {idx < healthHistoryData.length - 1 && (
                          <span className="text-slate-300 font-bold hidden sm:inline">&bull;</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Prompt Disclaimer */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic pt-2 border-t border-slate-100">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span>
                    Notice: Condition scores are application/demo thresholds for predictive infrastructure simulation. They do not represent official government engineering standards.
                  </span>
                </div>
              </CardBody>
            </Card>

            {/* Chronological Quality Inspections Table */}
            <Card>
              <CardHeader
                title={`Chronological Inspection Records (${sortedChronologicalInspections.length})`}
                subtitle="Complete audit history showing dates, certifiers, defects, and recommendations"
                action={
                  <Button
                    size="sm"
                    variant="gov"
                    icon={ClipboardCheck}
                    onClick={() => navigate(`/assets/${asset._id}/inspect`)}
                  >
                    Conduct Inspection
                  </Button>
                }
              />
              <CardBody className="p-0">
                {sortedChronologicalInspections.length === 0 ? (
                  <EmptyState
                    title="No Inspections Certified Yet"
                    message="Conduct the baseline structural inspection for this facility to begin health tracking."
                    action={
                      <Button
                        size="sm"
                        variant="gov"
                        icon={ClipboardCheck}
                        onClick={() => navigate(`/assets/${asset._id}/inspect`)}
                      >
                        Conduct Baseline Inspection
                      </Button>
                    }
                  />
                ) : (
                  <Table
                    columns={[
                      {
                        header: 'Date Conducted',
                        key: 'conductedDate',
                        render: (r) => (
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {formatDate(r.conductedDate || r.scheduledDate || r.createdAt)}
                          </span>
                        ),
                      },
                      {
                        header: 'Inspector',
                        key: 'inspector',
                        render: (r) => (
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {r.inspector?.name || r.inspectorName || 'Senior QC Engineer'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {r.inspector?.designation || 'Gujarat State PWD'}
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: 'Condition',
                        key: 'overallCondition',
                        render: (r) => <StatusBadge condition={r.overallCondition} type="condition" />,
                      },
                      {
                        header: 'Health Score',
                        key: 'score',
                        render: (r) => (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono text-xs font-bold ${
                                r.score >= 90 ? 'text-emerald-700' :
                                r.score >= 75 ? 'text-teal-700' :
                                r.score >= 50 ? 'text-amber-700' :
                                r.score >= 25 ? 'text-orange-700' : 'text-rose-700'
                              }`}
                            >
                              {r.score}%
                            </span>
                            <div className="w-10 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.score >= 75 ? 'bg-teal-500' : r.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, r.score))}%` }}
                              />
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: 'Defects Logged',
                        key: 'defects',
                        render: (r) => {
                          const defs = r.defects || [];
                          if (defs.length === 0) {
                            return <span className="text-[11px] text-slate-400 italic">None reported</span>;
                          }
                          return (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {defs.map((d, i) => {
                                const text = typeof d === 'string' ? d : d.description;
                                const sev = typeof d === 'object' && d.severity ? d.severity : 'LOW';
                                return (
                                  <span
                                    key={i}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      sev === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                                      sev === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                      sev === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                                      'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {text}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        },
                      },
                      {
                        header: 'Recommendations',
                        key: 'recommendations',
                        render: (r) => (
                          <p className="text-xs text-slate-600 leading-snug max-w-xs line-clamp-2">
                            {r.recommendations || r.observations || r.remarks || 'Standard preventive maintenance approved.'}
                          </p>
                        ),
                      },
                    ]}
                    data={sortedChronologicalInspections}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* 6. MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <Card>
            <CardHeader
              title="Maintenance & Rehabilitation History"
              subtitle="Preventive repairs, component replacements, and cost outlays"
            />
            <CardBody className="p-0">
              {maintenanceRecords.length === 0 ? (
                <EmptyState title="No Maintenance Records" message="No rehabilitation records logged for this asset." />
              ) : (
                <Table
                  columns={[
                    { header: 'Maintenance ID', key: 'maintenanceId', render: (r) => <span className="font-mono font-bold text-xs">{r.maintenanceId}</span> },
                    { header: 'Type', key: 'type', render: (r) => <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100">{r.type}</span> },
                    { header: 'Contractor', key: 'contractor', render: (r) => <span className="text-xs">{r.contractor?.companyName || 'In-House'}</span> },
                    { header: 'Date', key: 'startDate', render: (r) => <span className="text-xs">{formatDate(r.startDate)}</span> },
                    { header: 'Cost Incurred', key: 'cost', render: (r) => <span className="font-mono font-bold text-xs text-slate-900">{formatCurrency(r.cost)}</span> },
                    { header: 'Status', key: 'status', render: (r) => <span className="text-xs font-semibold">{r.status}</span> },
                  ]}
                  data={maintenanceRecords}
                />
              )}
            </CardBody>
          </Card>
        )}

        {/* 7. WORK ORDERS TAB */}
        {activeTab === 'work-orders' && (
          <Card>
            <CardHeader
              title="Related Work Orders"
              subtitle="Formal contracts and repair scope directives"
              action={
                <Button size="sm" variant="gov" icon={Plus} onClick={() => setWorkOrderModalOpen(true)}>
                  Create Work Order
                </Button>
              }
            />
            <CardBody className="p-0">
              {workOrders.length === 0 ? (
                <EmptyState title="No Work Orders" message="No active or past work orders issued for this asset." />
              ) : (
                <Table
                  columns={[
                    { header: 'Order Number', key: 'orderNumber', render: (r) => <span className="font-mono font-bold text-xs">{r.orderNumber}</span> },
                    { header: 'Scope Title', key: 'title', render: (r) => <span className="font-semibold text-xs text-slate-800">{r.title}</span> },
                    { header: 'Contractor', key: 'contractor', render: (r) => <span className="text-xs">{r.contractor?.companyName || 'Unassigned'}</span> },
                    { header: 'Priority', key: 'priority', render: (r) => <StatusBadge priority={r.priority} type="priority" /> },
                    { header: 'Estimated Cost', key: 'estimatedCost', render: (r) => <span className="font-mono text-xs">{formatCurrency(r.estimatedCost)}</span> },
                    { header: 'Status', key: 'status', render: (r) => <span className="text-xs font-semibold">{r.status}</span> },
                  ]}
                  data={workOrders}
                />
              )}
            </CardBody>
          </Card>
        )}

        {/* 8. FINANCIAL LEDGER TAB */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-slate-800">
                <CardBody className="p-4">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Acquisition / Capital Cost</span>
                  <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{formatCurrency(asset.acquisitionCost)}</div>
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-amber-600">
                <CardBody className="p-4">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Cumulative Maintenance</span>
                  <div className="text-xl font-extrabold text-amber-900 mt-1 font-mono">{formatCurrency(asset.totalMaintenanceCost)}</div>
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-blue-700">
                <CardBody className="p-4">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total Lifetime Cost (LCC)</span>
                  <div className="text-xl font-extrabold text-blue-900 mt-1 font-mono">{formatCurrency(asset.totalLifecycleCost)}</div>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader title="Financial Ledger & Fiscal Allocations" />
              <CardBody className="p-0">
                {financials.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No individual invoice transactions recorded. Baseline capitalized from acquisition outlay.
                  </div>
                ) : (
                  <Table
                    columns={[
                      { header: 'Record ID', key: 'recordId', render: (r) => <span className="font-mono font-bold text-xs">{r.recordId}</span> },
                      { header: 'Type', key: 'type', render: (r) => <span className="font-semibold text-xs">{r.type}</span> },
                      { header: 'Amount', key: 'amount', render: (r) => <span className="font-mono font-bold text-xs">{formatCurrency(r.amount)}</span> },
                      { header: 'Date', key: 'transactionDate', render: (r) => <span className="text-xs">{formatDate(r.transactionDate)}</span> },
                      { header: 'Invoice No.', key: 'invoiceNumber', render: (r) => <span className="font-mono text-xs">{r.invoiceNumber || 'N/A'}</span> },
                      { header: 'Status', key: 'status', render: (r) => <span className="text-xs font-semibold text-emerald-700">{r.status}</span> },
                    ]}
                    data={financials}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* 9. DOCUMENTS VAULT TAB */}
        {activeTab === 'documents' && (
          <Card>
            <CardHeader
              title="Asset Digital Blueprints & Documents Vault"
              subtitle="Secure as-built engineering drawings, contracts, and operating manuals"
              action={
                <Button size="sm" variant="gov" icon={Plus} onClick={() => setDocModalOpen(true)}>
                  Upload Document
                </Button>
              }
            />
            <CardBody className="p-0">
              {documents.length === 0 ? (
                <EmptyState title="No Documents Attached" message="No drawings or certificates have been attached yet." />
              ) : (
                <Table
                  columns={[
                    { header: 'Title', key: 'title', render: (r) => <span className="font-semibold text-xs text-slate-800">{r.title}</span> },
                    { header: 'Category', key: 'documentType', render: (r) => <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100">{r.documentType}</span> },
                    { header: 'Format & Size', key: 'fileSize', render: (r) => <span className="text-xs text-slate-500 font-mono">{r.fileType} • {(r.fileSize / 1024 / 1024).toFixed(1)} MB</span> },
                    { header: 'Uploaded By', key: 'uploadedBy', render: (r) => <span className="text-xs">{r.uploadedBy?.name || 'Officer'}</span> },
                    { header: 'Upload Date', key: 'createdAt', render: (r) => <span className="text-xs">{formatDate(r.createdAt)}</span> },
                  ]}
                  data={documents}
                />
              )}
            </CardBody>
          </Card>
        )}

        {/* 10. ISSUES TAB */}
        {activeTab === 'issues' && (
          <Card>
            <CardHeader
              title="Reported Structural Issues & Defects"
              subtitle="Defect tickets logged by inspectors, engineers, or citizen telemetry"
              action={
                <Button size="sm" variant="danger" icon={Plus} onClick={() => setIssueModalOpen(true)}>
                  Report Issue
                </Button>
              }
            />
            <CardBody className="p-0">
              {issues.length === 0 ? (
                <EmptyState title="No Issues Reported" message="This asset has no open defect tickets." />
              ) : (
                <Table
                  columns={[
                    { header: 'Issue ID', key: 'issueId', render: (r) => <span className="font-mono font-bold text-xs text-rose-700">{r.issueId || r.issueCode}</span> },
                    { header: 'Title', key: 'title', render: (r) => <span className="font-semibold text-xs text-slate-800">{r.title}</span> },
                    { header: 'Severity', key: 'severity', render: (r) => <StatusBadge condition={r.severity} type="condition" /> },
                    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} /> },
                    { header: 'Reported By', key: 'reportedBy', render: (r) => <span className="text-xs">{r.reportedBy?.name || 'Field Officer'}</span> },
                    { header: 'Logged On', key: 'createdAt', render: (r) => <span className="text-xs">{formatDate(r.createdAt || r.reportedDate)}</span> },
                    {
                      header: 'Actions',
                      key: 'actions',
                      render: (r) => (
                        <div className="flex items-center gap-1.5">
                          {r.status !== 'RESOLVED' && (
                            <>
                              <button
                                onClick={() => {
                                  setWorkOrderData({
                                    ...workOrderData,
                                    issueId: r._id,
                                    title: `Rectification for ${r.title}`,
                                  });
                                  setWorkOrderModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                              >
                                Issue Work Order
                              </button>
                              <button
                                onClick={() => navigate(`/maintenance?issueId=${r._id}&assetId=${asset._id}`)}
                                className="px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                              >
                                Recommend Maint.
                              </button>
                            </>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  data={issues}
                />
              )}
            </CardBody>
          </Card>
        )}

        {/* 11. OWNERSHIP & CUSTODY HISTORY TAB */}
        {activeTab === 'custody' && (
          <Card>
            <CardHeader
              title="Department Jurisdiction & Custodian Transition History"
              subtitle="Official record of jurisdictional transfers and custody delegations"
            />
            <CardBody className="p-5 text-xs space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Current Jurisdictional State
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block">Department</span>
                    <span className="font-semibold text-slate-800">{asset.department?.name} ({asset.department?.code})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Executive Custodian</span>
                    <span className="font-semibold text-slate-800">{asset.custodian?.name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Commissioning Body</span>
                    <span className="font-semibold text-slate-800">State Infrastructure Board</span>
                  </div>
                </div>
              </div>

              {/* Custody Transition History */}
              {asset.custodyHistory && asset.custodyHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-700" />
                      <span>Historical Chain of Custody & Jurisdiction Transitions</span>
                    </div>
                    <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {asset.custodyHistory.length} Transition{asset.custodyHistory.length > 1 ? 's' : ''} Logged
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                    {asset.custodyHistory.map((h, idx) => {
                      const year = new Date(h.transferDate || h.createdAt || new Date()).getFullYear();
                      return (
                        <div key={idx} className="relative group">
                          <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-700 ring-4 ring-white shadow-xs" />
                          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-blue-300 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-1">
                              <span className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-mono font-bold text-[11px]">
                                  {year}
                                </span>
                                <span>{h.fromDepartment?.name || 'Origin Department'}</span>
                                <span className="text-slate-400 font-bold">&rarr;</span>
                                <span className="text-blue-900">{h.toDepartment?.name || 'Department'}</span>
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                {formatDate(h.transferDate)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 mt-1">
                              <strong>Reason:</strong> {h.reason || 'Administrative Jurisdictional Realignment'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                              <span>
                                New Custodian: <strong className="text-slate-800">{h.toCustodian?.name || 'Unassigned'}</strong>
                              </span>
                              {h.supportingDocument && (
                                <span className="text-blue-700 font-mono font-medium">
                                  Order Ref: {h.supportingDocument}
                                </span>
                              )}
                              {h.transferredBy && (
                                <span className="ml-auto text-slate-400">
                                  Authorized by {h.transferredBy.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : lifecycleEvents.filter((e) => e.eventType === 'ASSET_TRANSFERRED').length > 0 ? (
                <div className="space-y-3">
                  {lifecycleEvents.filter((e) => e.eventType === 'ASSET_TRANSFERRED').map((evt, idx) => (
                    <div key={idx} className="p-3 border border-slate-200 rounded-md bg-white">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-blue-900">Transfer Record</span>
                        <span className="text-slate-400">{formatDate(evt.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{evt.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 italic">
                  Asset has remained under its original originating department ({asset.department?.name}) since digital registration.
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* 12. AUDIT TRAIL TAB */}
        {activeTab === 'audit' && (
          <Card>
            <CardHeader
              title="Cryptographic Asset Audit Ledger"
              subtitle="Immutable change history for this specific asset ID"
            />
            <CardBody className="p-0">
              {auditLogs.length === 0 ? (
                <EmptyState title="No Audit Records" message="No discrete audit entries recorded for this asset yet." />
              ) : (
                <Table
                  columns={[
                    { header: 'Timestamp', key: 'timestamp', render: (r) => <span className="font-mono text-xs text-slate-500">{formatDateTime(r.timestamp)}</span> },
                    { header: 'Action', key: 'action', render: (r) => <span className="font-mono font-bold text-xs">{r.action}</span> },
                    { header: 'Officer', key: 'performedBy', render: (r) => <span className="text-xs font-semibold">{r.performedBy?.name || 'Authorized Officer'}</span> },
                    { header: 'IP Address', key: 'ipAddress', render: (r) => <span className="font-mono text-xs text-slate-400">{r.ipAddress || '127.0.0.1'}</span> },
                  ]}
                  data={auditLogs}
                />
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Action Modals */}
      {/* 1. Transfer Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Asset Jurisdiction"
        subtitle={`Asset: ${asset.assetId} (${asset.name})`}
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            label="Target Department"
            required
            value={transferData.targetDepartmentId}
            onChange={(e) => setTransferData({ ...transferData, targetDepartmentId: e.target.value })}
            options={departments.map((d) => ({ value: d._id, label: `${d.code} - ${d.name}` }))}
          />
          <Select
            label="Target Executive Custodian"
            value={transferData.targetCustodianId}
            onChange={(e) => setTransferData({ ...transferData, targetCustodianId: e.target.value })}
            options={officers.map((o) => ({ value: o._id, label: `${o.name} (${o.designation})` }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Effective Transfer Date"
              type="date"
              required
              value={transferData.transferDate}
              onChange={(e) => setTransferData({ ...transferData, transferDate: e.target.value })}
            />
            <Input
              label="Supporting Document Ref."
              placeholder="e.g. GOW-PWD-TRANS-2026-09"
              value={transferData.supportingDocument}
              onChange={(e) => setTransferData({ ...transferData, supportingDocument: e.target.value })}
            />
          </div>
          <Input
            label="Administrative Transfer Justification / Cabinet Memo"
            required
            placeholder="Cabinet sanction order number or inter-department memo..."
            value={transferData.reason}
            onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="secondary" size="sm" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gov" size="sm" isLoading={submittingAction}>Execute Official Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* 2. Issue Modal */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Flag Structural Issue / Defect"
        subtitle={`Asset: ${asset.assetId} (${asset.name})`}
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <Input
            label="Issue Title"
            required
            placeholder="e.g. Scour formation near pier #3"
            value={issueData.title}
            onChange={(e) => setIssueData({ ...issueData, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Defect Severity"
              value={issueData.severity}
              onChange={(e) => setIssueData({ ...issueData, severity: e.target.value })}
              options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s }))}
            />
            <Select
              label="Issue Classification"
              value={issueData.issueType || 'STRUCTURAL'}
              onChange={(e) => setIssueData({ ...issueData, issueType: e.target.value })}
              options={['STRUCTURAL', 'SURFACE', 'SAFETY', 'OPERATIONAL', 'MECHANICAL', 'ELECTRICAL', 'GENERAL'].map((t) => ({ value: t, label: t }))}
            />
          </div>
          <Input
            label="Detailed Engineering Description"
            placeholder="Observations, crack gauge width, immediate hazards..."
            value={issueData.description}
            onChange={(e) => setIssueData({ ...issueData, description: e.target.value })}
          />
          <Input
            label="Specific Location Details"
            placeholder="e.g. Chainage 3+150km, North abutment"
            value={issueData.locationDetails}
            onChange={(e) => setIssueData({ ...issueData, locationDetails: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="secondary" size="sm" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" size="sm" isLoading={submittingAction}>Log Defect Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* 3. Work Order Modal */}
      <Modal
        isOpen={workOrderModalOpen}
        onClose={() => setWorkOrderModalOpen(false)}
        title="Issue Maintenance Work Order"
        subtitle={`Asset: ${asset.assetId} (${asset.name})`}
      >
        <form onSubmit={handleWorkOrderSubmit} className="space-y-4">
          <Input
            label="Work Order Scope Title"
            required
            placeholder="e.g. Bearing pad replacement & seismic retrofitting"
            value={workOrderData.title}
            onChange={(e) => setWorkOrderData({ ...workOrderData, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={workOrderData.priority}
              onChange={(e) => setWorkOrderData({ ...workOrderData, priority: e.target.value })}
              options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT'].map((p) => ({ value: p, label: p }))}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Contractor</label>
              <select
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-800"
                value={workOrderData.contractor}
                onChange={(e) => setWorkOrderData({ ...workOrderData, contractor: e.target.value })}
              >
                <option value="">-- Assign Later --</option>
                {contractors.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.company}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Estimated Cost (₹)"
              type="number"
              value={workOrderData.estimatedCost}
              onChange={(e) => setWorkOrderData({ ...workOrderData, estimatedCost: e.target.value })}
            />
            <Input
              label="Target Completion Date"
              type="date"
              value={workOrderData.targetCompletionDate}
              onChange={(e) => setWorkOrderData({ ...workOrderData, targetCompletionDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="secondary" size="sm" onClick={() => setWorkOrderModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gov" size="sm" isLoading={submittingAction}>Authorize Directive</Button>
          </div>
        </form>
      </Modal>

      {/* 4. Inspection Modal */}
      <Modal
        isOpen={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        title="Conduct / Schedule Structural Inspection"
        subtitle={`Asset: ${asset.assetId} (${asset.name})`}
      >
        <form onSubmit={handleInspectionSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assessed Condition"
              value={inspectionData.overallCondition}
              onChange={(e) => setInspectionData({ ...inspectionData, overallCondition: e.target.value })}
              options={Object.keys(ASSET_CONDITION).map((c) => ({ value: c, label: c }))}
            />
            <Input
              label="Health Score Rating (0-100)"
              type="number"
              min="0"
              max="100"
              value={inspectionData.score}
              onChange={(e) => setInspectionData({ ...inspectionData, score: e.target.value })}
            />
          </div>
          <Input
            label="Quality Inspector Observations / Notes"
            placeholder="Structural findings, crack measurements, load deflection test results..."
            value={inspectionData.remarks}
            onChange={(e) => setInspectionData({ ...inspectionData, remarks: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="secondary" size="sm" onClick={() => setInspectionModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gov" size="sm" isLoading={submittingAction}>Record Inspection Audit</Button>
          </div>
        </form>
      </Modal>

      {/* 5. Document Modal */}
      <Modal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Upload As-Built Drawing / Document"
        subtitle={`Asset: ${asset.assetId} (${asset.name})`}
      >
        <form onSubmit={handleDocumentSubmit} className="space-y-4">
          <Input
            label="Document Title"
            required
            placeholder="e.g. As-Built Structural Blueprint Section A-A"
            value={docData.title}
            onChange={(e) => setDocData({ ...docData, title: e.target.value })}
          />
          <Select
            label="Document Classification"
            value={docData.documentType}
            onChange={(e) => setDocData({ ...docData, documentType: e.target.value })}
            options={['DRAWING', 'CONTRACT', 'INSPECTION_REPORT', 'INVOICE', 'MANUAL', 'CERTIFICATE', 'OTHER'].map((d) => ({ value: d, label: d }))}
          />
          <Input
            label="Cloudinary / Storage File URL"
            placeholder="https://res.cloudinary.com/... or /uploads/blueprint.pdf"
            value={docData.fileUrl}
            onChange={(e) => setDocData({ ...docData, fileUrl: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="secondary" size="sm" onClick={() => setDocModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gov" size="sm" isLoading={submittingAction}>Attach to Asset Vault</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetPassport;
