import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import assetService from '../services/assetService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import { Card, CardBody } from '../components/Card';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ASSET_CATEGORIES,
  ASSET_STATUS,
  ASSET_CONDITION,
} from '../utils/constants';
import { governanceService } from '../services/governanceService';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  GitMerge,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  Scale,
  Split,
  Copy,
  Sliders,
} from 'lucide-react';

const ASSET_TYPE_OPTIONS = [
  'Road',
  'Bridge',
  'Culvert',
  'Streetlight',
  'Traffic Signal',
  'School',
  'Hospital',
  'Government Office',
  'Police Station',
  'Community Center',
  'Pipeline',
  'Water Tank',
  'Pump',
  'Drain',
  'Treatment Plant',
  'Transformer',
  'Solar Plant',
  'Generator',
  'Government Land',
  'Park',
  'Playground',
];

const HEALTH_SCORE_RANGES = [
  { value: '', label: 'All Health Scores' },
  { value: '81-100', label: '81% - 100% (Optimal)' },
  { value: '61-80', label: '61% - 80% (Moderate)' },
  { value: '41-60', label: '41% - 60% (Fair / Warning)' },
  { value: '0-40', label: '0% - 40% (Critical Alarm)' },
];

const initialFormState = {
  assetId: '',
  name: '',
  category: 'TRANSPORT',
  assetType: 'Bridge',
  description: '',
  department: '',
  custodian: '',
  address: '',
  city: 'Surat',
  district: 'Surat',
  state: 'Gujarat',
  pincode: '395001',
  latitude: 21.1824,
  longitude: 72.8225,
  status: 'OPERATIONAL',
  condition: 'GOOD',
  healthScore: 85,
  installationDate: '',
  commissioningDate: '',
  expectedLifeYears: 50,
  acquisitionCost: 10000000,
  parentAsset: '',
};

const Assets = () => {
  const { hasRole, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Assets list & metadata state
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Departments & Officers for form dropdowns
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('assetType') || '');
  const [selectedDept, setSelectedDept] = useState(searchParams.get('department') || '');
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get('district') || '');
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get('condition') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedHealthRange, setSelectedHealthRange] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter drawer toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssetForAction, setSelectedAssetForAction] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  // Governance: Data Quality & Duplicate Detection state
  const [qualitySummary, setQualitySummary] = useState(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [selectedAssetQuality, setSelectedAssetQuality] = useState(null);
  const [qualityDetailModalOpen, setQualityDetailModalOpen] = useState(false);

  const [duplicates, setDuplicates] = useState([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [duplicateCompareModal, setDuplicateCompareModal] = useState(false);
  const [activeDuplicatePair, setActiveDuplicatePair] = useState(null);
  const [dismissedPairKeys, setDismissedPairKeys] = useState(new Set());
  const [mergingDuplicate, setMergingDuplicate] = useState(false);
  const [confirmMergeOpen, setConfirmMergeOpen] = useState(false);

  // Fetch governance data (Data Quality & Duplicate scan)
  const fetchGovernanceData = useCallback(async () => {
    try {
      setLoadingQuality(true);
      setLoadingDuplicates(true);
      const [qualRes, dupRes] = await Promise.all([
        governanceService.getDataQualitySummary().catch(() => null),
        governanceService.getDuplicates().catch(() => null),
      ]);
      if (qualRes?.success) {
        setQualitySummary(qualRes.data);
      }
      if (dupRes?.success) {
        setDuplicates(dupRes.data?.duplicates || []);
      }
    } catch (err) {
      console.error('Governance fetch error:', err);
    } finally {
      setLoadingQuality(false);
      setLoadingDuplicates(false);
    }
  }, []);

  useEffect(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  // Handler for single asset quality modal
  const handleOpenQualityDetail = async (asset) => {
    try {
      const res = await governanceService.getAssetDataQuality(asset._id);
      if (res.success) {
        setSelectedAssetQuality(res.data);
        setQualityDetailModalOpen(true);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Data Quality Error',
        message: 'Could not fetch data completeness breakdown.',
      });
    }
  };

  // Active duplicate pairs excluding dismissed
  const activeDuplicatePairs = duplicates.filter((pair) => {
    const key = `${pair.primaryAsset?._id}_${pair.candidateDuplicate?._id}`;
    return !dismissedPairKeys.has(key);
  });

  const handleKeepSeparate = (pair) => {
    const key = `${pair.primaryAsset?._id}_${pair.candidateDuplicate?._id}`;
    setDismissedPairKeys((prev) => new Set([...prev, key]));
    setDuplicateCompareModal(false);
    addToast({
      type: 'info',
      title: 'Candidate Kept Separate',
      message: 'The asset records will remain independent as verified separate infrastructure items.',
    });
  };

  const handleExecuteMerge = async () => {
    if (!activeDuplicatePair) return;
    setMergingDuplicate(true);
    try {
      const res = await governanceService.mergeDuplicates(
        activeDuplicatePair.primaryAsset._id,
        activeDuplicatePair.candidateDuplicate._id
      );
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Duplicate Merged Successfully',
          message: `Asset ${activeDuplicatePair.candidateDuplicate?.assetId} consolidated into ${activeDuplicatePair.primaryAsset?.assetId}. All child inspections, financials, and work orders migrated.`,
        });
        setConfirmMergeOpen(false);
        setDuplicateCompareModal(false);
        setActiveDuplicatePair(null);
        fetchAssets();
        fetchGovernanceData();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Merge Failed',
        message: err.response?.data?.message || 'Could not merge duplicate asset records.',
      });
    } finally {
      setMergingDuplicate(false);
    }
  };

  // Fetch departments and officers once on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptRes, officerRes] = await Promise.all([
          assetService.getDepartments(),
          assetService.getOfficers(),
        ]);
        if (deptRes.success) setDepartments(deptRes.data || []);
        if (officerRes.success) setOfficers(officerRes.data || []);
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch assets list from backend
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationMeta.page,
        limit: paginationMeta.limit,
        sortBy,
        sortOrder,
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedType) params.assetType = selectedType;
      if (selectedDept) params.department = selectedDept;
      if (selectedDistrict) params.district = selectedDistrict;
      if (selectedCondition) params.condition = selectedCondition;
      if (selectedStatus) params.status = selectedStatus;

      if (selectedHealthRange) {
        const [min, max] = selectedHealthRange.split('-');
        params.minHealthScore = min;
        params.maxHealthScore = max;
      }

      const res = await assetService.getAssets(params);
      if (res.success) {
        setAssets(res.data || []);
        if (res.meta) {
          setPaginationMeta((prev) => ({
            ...prev,
            page: res.meta.page,
            limit: res.meta.limit,
            total: res.meta.total,
            totalPages: res.meta.totalPages,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
      addToast({
        type: 'error',
        title: 'Error Fetching Assets',
        message: 'Could not fetch asset records from the database.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    paginationMeta.page,
    paginationMeta.limit,
    sortBy,
    sortOrder,
    searchTerm,
    selectedCategory,
    selectedType,
    selectedDept,
    selectedDistrict,
    selectedCondition,
    selectedStatus,
    selectedHealthRange,
  ]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedDept('');
    setSelectedDistrict('');
    setSelectedCondition('');
    setSelectedStatus('');
    setSelectedHealthRange('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPaginationMeta((prev) => ({ ...prev, page: 1 }));
    setSearchParams({});
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      ...initialFormState,
      department: departments[0]?._id || '',
      custodian: officers[0]?._id || '',
    });
    setFormErrors({});
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (asset) => {
    setSelectedAssetForAction(asset);
    setFormData({
      assetId: asset.assetId,
      name: asset.name,
      category: asset.category,
      assetType: asset.assetType,
      description: asset.description || '',
      department: asset.department?._id || asset.department || '',
      custodian: asset.custodian?._id || asset.custodian || '',
      address: asset.location?.address || '',
      city: asset.location?.city || 'Surat',
      district: asset.location?.district || 'Surat',
      state: asset.location?.state || 'Gujarat',
      pincode: asset.location?.pincode || '395001',
      latitude: asset.location?.latitude || 21.1824,
      longitude: asset.location?.longitude || 72.8225,
      status: asset.status,
      condition: asset.condition,
      healthScore: asset.healthScore,
      installationDate: asset.installationDate ? asset.installationDate.split('T')[0] : '',
      commissioningDate: asset.commissioningDate ? asset.commissioningDate.split('T')[0] : '',
      expectedLifeYears: asset.expectedLifeYears || 25,
      acquisitionCost: asset.acquisitionCost || 0,
      parentAsset: asset.parentAsset?._id || asset.parentAsset || '',
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.assetId.trim()) errors.assetId = 'Unique Asset ID is required';
    if (!formData.name.trim()) errors.name = 'Asset Name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.assetType) errors.assetType = 'Asset Type is required';
    if (!formData.department) errors.department = 'Department is required';
    if (formData.latitude === '' || isNaN(formData.latitude)) errors.latitude = 'Valid latitude is required';
    if (formData.longitude === '' || isNaN(formData.longitude)) errors.longitude = 'Valid longitude is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create Asset
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmittingForm(true);
    try {
      const payload = {
        ...formData,
        healthScore: Number(formData.healthScore),
        expectedLifeYears: Number(formData.expectedLifeYears),
        acquisitionCost: Number(formData.acquisitionCost),
        location: {
          address: formData.address,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
        },
      };

      const res = await assetService.createAsset(payload);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Asset Registered Successfully',
          message: `Asset ${res.data?.assetId} added. ASSET_CREATED lifecycle event and AuditLog recorded.`,
        });
        setCreateModalOpen(false);
        fetchAssets();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.response?.data?.message || 'Failed to create asset.',
      });
    } finally {
      setSubmittingForm(false);
    }
  };

  // Submit Edit Asset
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmittingForm(true);
    try {
      const payload = {
        ...formData,
        healthScore: Number(formData.healthScore),
        expectedLifeYears: Number(formData.expectedLifeYears),
        acquisitionCost: Number(formData.acquisitionCost),
        location: {
          address: formData.address,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
        },
      };

      const res = await assetService.updateAsset(selectedAssetForAction._id, payload);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Asset Updated',
          message: `Asset ${res.data?.assetId} records updated successfully.`,
        });
        setEditModalOpen(false);
        fetchAssets();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Error',
        message: err.response?.data?.message || 'Failed to update asset.',
      });
    } finally {
      setSubmittingForm(false);
    }
  };

  // Delete Asset
  const handleDeleteConfirm = async () => {
    if (!selectedAssetForAction) return;
    setSubmittingForm(true);
    try {
      const res = await assetService.deleteAsset(selectedAssetForAction._id);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Asset Deleted',
          message: res.message || 'Asset removed from State Registry.',
        });
        setDeleteDialogOpen(false);
        fetchAssets();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Deletion Error',
        message: err.response?.data?.message || 'Failed to delete asset.',
      });
    } finally {
      setSubmittingForm(false);
    }
  };

  // Table Columns (Exactly 12 as requested)
  const columns = [
    {
      header: (
        <button
          onClick={() => handleSort('assetId')}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors"
        >
          <span>Asset ID</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      key: 'assetId',
      render: (r) => (
        <span
          onClick={() => navigate(`/assets/${r._id}`)}
          className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-100 hover:text-blue-950 transition-colors"
          title="Open Digital Asset Passport"
        >
          {r.assetId}
        </span>
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort('name')}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors"
        >
          <span>Asset Name</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      key: 'name',
      render: (r) => (
        <div
          onClick={() => navigate(`/assets/${r._id}`)}
          className="cursor-pointer group"
        >
          <div className="font-semibold text-slate-900 text-xs group-hover:text-blue-700 transition-colors">
            {r.name}
          </div>
          <div className="text-[11px] text-slate-500 truncate max-w-xs">
            {r.description || 'Government public infrastructure asset'}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      render: (r) => (
        <span className="text-[11px] font-semibold text-slate-700 uppercase">
          {r.category}
        </span>
      ),
    },
    {
      header: 'Type',
      key: 'assetType',
      render: (r) => <span className="text-xs text-slate-700">{r.assetType}</span>,
    },
    {
      header: 'Location',
      key: 'location',
      render: (r) => (
        <div className="text-xs text-slate-600">
          <div className="font-medium text-slate-800">{r.location?.city || 'Surat'}</div>
          <div className="text-[11px] text-slate-400">{r.location?.district || 'Surat'}</div>
        </div>
      ),
    },
    {
      header: 'Department',
      key: 'department',
      render: (r) => (
        <span className="text-xs font-semibold text-slate-800">
          {r.department?.code || 'PWD'}
        </span>
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort('condition')}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors"
        >
          <span>Condition</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      key: 'condition',
      render: (r) => <StatusBadge condition={r.condition} type="condition" />,
    },
    {
      header: (
        <button
          onClick={() => handleSort('healthScore')}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors"
        >
          <span>Health Score</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      key: 'healthScore',
      render: (r) => {
        const score = r.healthScore || 0;
        const color =
          score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-amber-500' : 'bg-rose-500';
        return (
          <div className="flex items-center gap-2">
            <div className="w-14 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-700">{score}%</span>
          </div>
        );
      },
    },
    {
      header: (
        <button
          onClick={() => handleSort('status')}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors"
        >
          <span>Status</span>
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        </button>
      ),
      key: 'status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Last Inspection',
      key: 'lastInspectionDate',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {r.lastInspectionDate ? formatDate(r.lastInspectionDate) : 'Not Inspected'}
        </span>
      ),
    },
    {
      header: 'Next Inspection',
      key: 'nextInspectionDate',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {r.nextInspectionDate ? formatDate(r.nextInspectionDate) : 'Scheduled Soon'}
        </span>
      ),
    },
    {
      header: 'Completeness',
      key: 'completeness',
      render: (r) => {
        const score = r.dataQuality?.completenessScore ?? 85;
        const isComplete = score >= 85;
        const isWarning = score >= 50 && score < 85;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenQualityDetail(r);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
              isComplete
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : isWarning
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="Inspect 15-point criteria completeness audit and missing documents"
          >
            <span>{score}%</span>
            {isComplete ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
          </button>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/assets/${r._id}`)}
            icon={Eye}
            title="Open Digital Asset Passport"
          >
            Passport
          </Button>

          {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'ENGINEER') && (
            <button
              onClick={() => handleOpenEditModal(r)}
              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              title="Edit Asset"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN') && (
            <button
              onClick={() => {
                setSelectedAssetForAction(r);
                setDeleteDialogOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="Delete Asset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Central Infrastructure Asset Inventory"
        subtitle="State-wide centralized digital registry tracking physical status, health telemetry, and lifecycle history"
        breadcrumbs={[{ label: 'Assets' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={ShieldCheck}
              onClick={() => setQualityModalOpen(true)}
              className="text-xs"
            >
              Data Quality ({qualitySummary?.summary?.averageScore ?? 88}%)
            </Button>

            {activeDuplicatePairs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={Split}
                onClick={() => {
                  setActiveDuplicatePair(activeDuplicatePairs[0]);
                  setDuplicateCompareModal(true);
                }}
                className="text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
              >
                Duplicates ({activeDuplicatePairs.length})
              </Button>
            )}

            {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'ENGINEER') && (
              <Button
                variant="gov"
                size="sm"
                icon={Plus}
                onClick={handleOpenCreateModal}
              >
                Register Digital Asset
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="mb-6">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="lg:col-span-4">
              <Input
                placeholder="Search Asset ID, Name, City, or District..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-2">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...ASSET_CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            {/* Condition Filter */}
            <div className="lg:col-span-2">
              <Select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                options={[
                  { value: '', label: 'All Conditions' },
                  ...Object.keys(ASSET_CONDITION).map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...Object.keys(ASSET_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') })),
                ]}
              />
            </div>

            {/* Advanced Filters Button & Reset */}
            <div className="lg:col-span-2 flex items-center gap-2">
              <Button
                variant={showAdvancedFilters ? 'primary' : 'outline'}
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                icon={Filter}
              >
                Filters
              </Button>
              <button
                onClick={handleResetFilters}
                className="p-2 border border-slate-300 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                title="Reset All Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 p-3 rounded-lg">
              <div>
                <Select
                  label="Asset Type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  options={[
                    { value: '', label: 'All Types' },
                    ...ASSET_TYPE_OPTIONS.map((t) => ({ value: t, label: t })),
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  options={[
                    { value: '', label: 'All Departments' },
                    ...departments.map((d) => ({ value: d._id, label: `${d.code} - ${d.name}` })),
                  ]}
                />
              </div>

              <div>
                <Input
                  label="District"
                  placeholder="e.g. Surat / Ahmedabad"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Health Score Range"
                  value={selectedHealthRange}
                  onChange={(e) => setSelectedHealthRange(e.target.value)}
                  options={HEALTH_SCORE_RANGES}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Possible Duplicate Alert Banner */}
      {activeDuplicatePairs.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold tracking-wider uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono">
                    POSSIBLE DUPLICATE DETECTED
                  </span>
                  <span className="text-xs font-bold text-amber-950">
                    {activeDuplicatePairs.length} candidate duplicate asset pair{activeDuplicatePairs.length > 1 ? 's' : ''} flagged for review
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  InfraTrack automated duplicate engine detected assets with high name similarity, identical managing department, or colocated GPS coordinates.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-400 text-amber-900 bg-white hover:bg-amber-100 text-xs font-medium"
                onClick={() => {
                  setActiveDuplicatePair(activeDuplicatePairs[0]);
                  setDuplicateCompareModal(true);
                }}
              >
                Review Candidates ({activeDuplicatePairs.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Table */}
      <Table
        columns={columns}
        data={assets}
        isLoading={loading}
        emptyTitle="No Assets Match Your Criteria"
        emptyMessage="Try adjusting your search query, clearing filters, or register a new infrastructure asset."
      />

      {/* Pagination */}
      <Pagination
        currentPage={paginationMeta.page}
        totalPages={paginationMeta.totalPages}
        totalItems={paginationMeta.total}
        pageSize={paginationMeta.limit}
        onPageChange={(newPage) => setPaginationMeta((prev) => ({ ...prev, page: newPage }))}
      />

      {/* Asset Registration / Edit Modal Form */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalOpen(false);
        }}
        title={editModalOpen ? `Edit Asset: ${selectedAssetForAction?.assetId}` : 'Register Infrastructure Asset'}
        subtitle="Every asset receives an immutable digital identity code and complete lifecycle records"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={editModalOpen ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
          {/* Identity & Basic Info */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              1. Digital Identity & Classification
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                label="Asset ID"
                required
                disabled={editModalOpen}
                placeholder="e.g. BR-GJ-SRT-000124"
                value={formData.assetId}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value.toUpperCase() })}
                error={formErrors.assetId}
              />

              <Input
                label="Asset Name"
                required
                placeholder="e.g. Sardar Vallabhbhai Patel Bridge"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />

              <Select
                label="Category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={ASSET_CATEGORIES.map((c) => ({ value: c, label: c }))}
                error={formErrors.category}
              />

              <Select
                label="Asset Type"
                required
                value={formData.assetType}
                onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                options={ASSET_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                error={formErrors.assetType}
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Description & Structural Specifications
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Technical specifications, design capacity, structural details..."
                className="w-full text-xs rounded-md border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>
          </div>

          {/* Department & Jurisdiction */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              2. Administrative Custody & Department
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Department"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={departments.map((d) => ({ value: d._id, label: `${d.code} - ${d.name}` }))}
                error={formErrors.department}
              />

              <Select
                label="Designated Custodian (Officer)"
                value={formData.custodian}
                onChange={(e) => setFormData({ ...formData, custodian: e.target.value })}
                options={[
                  { value: '', label: 'Select Custodian' },
                  ...officers.map((o) => ({ value: o._id, label: `${o.name} (${o.designation})` })),
                ]}
              />

              <Select
                label="Parent Asset (Optional)"
                value={formData.parentAsset}
                onChange={(e) => setFormData({ ...formData, parentAsset: e.target.value })}
                options={[
                  { value: '', label: 'No Parent Asset (Standalone)' },
                  ...assets.map((a) => ({ value: a._id, label: `${a.assetId} - ${a.name}` })),
                ]}
              />
            </div>
          </div>

          {/* Physical Location & GIS Coordinates */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              3. Spatial Location & GPS Coordinates
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
              <div className="sm:col-span-2">
                <Input
                  label="Address / Street Location"
                  placeholder="e.g. Athwalines Expressway Link"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <Input
                label="City / Urban Body"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />

              <Input
                label="District"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />

              <Input
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />

              <Input
                label="Latitude (GPS)"
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                error={formErrors.latitude}
              />

              <Input
                label="Longitude (GPS)"
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                error={formErrors.longitude}
              />
            </div>
          </div>

          {/* Condition, Health & Lifecycle Parameters */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              4. Lifecycle Condition & Valuation
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Select
                label="Operational Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={Object.keys(ASSET_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') }))}
              />

              <Select
                label="Physical Condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                options={Object.keys(ASSET_CONDITION).map((c) => ({ value: c, label: c }))}
              />

              <Input
                label="Health Score (0-100)"
                type="number"
                min="0"
                max="100"
                value={formData.healthScore}
                onChange={(e) => setFormData({ ...formData, healthScore: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input
                label="Installation Date"
                type="date"
                value={formData.installationDate}
                onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
              />

              <Input
                label="Commissioning Date"
                type="date"
                value={formData.commissioningDate}
                onChange={(e) => setFormData({ ...formData, commissioningDate: e.target.value })}
              />

              <Input
                label="Expected Life (Years)"
                type="number"
                value={formData.expectedLifeYears}
                onChange={(e) => setFormData({ ...formData, expectedLifeYears: e.target.value })}
              />

              <Input
                label="Acquisition Cost (₹)"
                type="number"
                value={formData.acquisitionCost}
                onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gov"
              size="sm"
              isLoading={submittingForm}
            >
              {editModalOpen ? 'Save Changes' : 'Register Digital Asset'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Asset Deletion"
        message={`Are you sure you want to remove asset ${selectedAssetForAction?.assetId} (${selectedAssetForAction?.name}) from the State Registry? This action is audited and cannot be undone.`}
        confirmText="Delete Asset"
        isLoading={submittingForm}
      />

      {/* 1. Data Quality & Completeness Engine Dashboard Modal */}
      <Modal
        isOpen={qualityModalOpen}
        onClose={() => setQualityModalOpen(false)}
        title="Data Quality & Statutory Completeness Audit"
        subtitle="Evaluating 15 mandatory lifecycle fields across the State Asset Registry"
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Average Quality</span>
              <div className="text-2xl font-bold text-blue-950 mt-1">
                {qualitySummary?.summary?.averageScore ?? 88}%
              </div>
              <span className="text-[11px] text-blue-700">State Registry Average</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Complete Assets</span>
              <div className="text-2xl font-bold text-emerald-950 mt-1">
                {qualitySummary?.summary?.completeAssetsCount ?? 0}
              </div>
              <span className="text-[11px] text-emerald-700">Score &ge; 85% compliant</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Incomplete Assets</span>
              <div className="text-2xl font-bold text-amber-950 mt-1">
                {qualitySummary?.summary?.incompleteAssetsCount ?? 0}
              </div>
              <span className="text-[11px] text-amber-700">Score 50% - 84%</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Critical Deficient</span>
              <div className="text-2xl font-bold text-rose-950 mt-1">
                {qualitySummary?.summary?.criticalIncompleteAssetsCount ?? 0}
              </div>
              <span className="text-[11px] text-rose-700">Score &lt; 50% missing data</span>
            </div>
          </div>

          {/* Asset Records Completeness Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Asset Records Completeness Breakdown ({qualitySummary?.assets?.length || 0})
              </span>
              <span className="text-[11px] text-slate-500">Sorted by lowest score first</span>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {qualitySummary?.assets?.map((item) => (
                <div key={item._id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.assetId}
                      </span>
                      <span className="font-semibold text-xs text-slate-900">{item.name}</span>
                      <span className="text-[11px] text-slate-500">({item.assetType} • {item.department?.code || 'PWD'})</span>
                    </div>

                    {item.missingFields && item.missingFields.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[11px] font-bold text-rose-800">Missing:</span>
                        {item.missingFields.map((field, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-medium"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        All 15 statutory lifecycle criteria verified and fulfilled
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">{item.completenessScore}%</div>
                      <div className="text-[10px] text-slate-500">{item.passedCount}/{item.totalCriteria} fields</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setQualityModalOpen(false);
                        navigate(`/assets/${item._id}`);
                      }}
                    >
                      Passport
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQualityModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Single Asset Quality Detail Modal */}
      <Modal
        isOpen={qualityDetailModalOpen}
        onClose={() => setQualityDetailModalOpen(false)}
        title={`Data Completeness: ${selectedAssetQuality?.assetId}`}
        subtitle={selectedAssetQuality?.name}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Completeness Score</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {selectedAssetQuality?.completenessScore}%
              </div>
              <span className="text-xs text-slate-600">
                {selectedAssetQuality?.passedCount} of {selectedAssetQuality?.totalCriteria} criteria satisfied
              </span>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  selectedAssetQuality?.qualityRating === 'COMPLETE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : selectedAssetQuality?.qualityRating === 'INCOMPLETE'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {selectedAssetQuality?.qualityRating?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Missing Statutory Data Fields
            </h4>
            {selectedAssetQuality?.missingFields && selectedAssetQuality.missingFields.length > 0 ? (
              <ul className="space-y-1.5">
                {selectedAssetQuality.missingFields.map((field, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-rose-50/60 border border-rose-200 text-xs text-rose-800 font-medium"
                  >
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All 15 statutory criteria are fully populated.</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQualityDetailModalOpen(false);
                navigate(`/assets/${selectedAssetQuality?._id || selectedAssetQuality?.assetId}`);
              }}
            >
              Open Digital Passport
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQualityDetailModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Duplicate Comparison & Merge Modal */}
      <Modal
        isOpen={duplicateCompareModal}
        onClose={() => setDuplicateCompareModal(false)}
        title="Duplicate Asset Resolution: Side-by-Side Comparison"
        subtitle="Compare detected duplicate candidates to merge records or confirm distinct physical entities"
        maxWidth="max-w-4xl"
      >
        {activeDuplicatePair ? (
          <div className="space-y-5">
            {/* Match Header Banner */}
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono">
                    Match Confidence: {activeDuplicatePair.matchScore}%
                  </span>
                  <span className="text-xs text-amber-900 font-medium">
                    Distance: {activeDuplicatePair.distanceMeters ?? 0}m apart
                  </span>
                </div>
                <div className="text-xs text-amber-800">
                  Candidate Pair 1 of {activeDuplicatePairs.length}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-amber-900">Detection Triggers:</span>
                {activeDuplicatePair.matchReasons?.map((r, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-white/80 border border-amber-300 px-2 py-0.5 rounded text-amber-900 font-medium"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Asset */}
              <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                    Primary Asset (Target)
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    {activeDuplicatePair.primaryAsset?.assetId}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Asset Name</span>
                    <span className="font-bold text-slate-900">{activeDuplicatePair.primaryAsset?.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Type</span>
                      <span className="text-slate-800">{activeDuplicatePair.primaryAsset?.assetType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                      <span className="text-slate-800">{activeDuplicatePair.primaryAsset?.category}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                    <span className="text-slate-800">{activeDuplicatePair.primaryAsset?.department?.name || activeDuplicatePair.primaryAsset?.department?.code || 'PWD'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                    <span className="text-slate-800">
                      {activeDuplicatePair.primaryAsset?.location?.address}, {activeDuplicatePair.primaryAsset?.location?.city}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Coordinates</span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {activeDuplicatePair.primaryAsset?.location?.latitude}, {activeDuplicatePair.primaryAsset?.location?.longitude}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <StatusBadge status={activeDuplicatePair.primaryAsset?.status} />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Condition</span>
                      <StatusBadge condition={activeDuplicatePair.primaryAsset?.condition} type="condition" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidate Duplicate */}
              <div className="border border-amber-300 bg-amber-50/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                    Candidate Duplicate (Source)
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {activeDuplicatePair.candidateDuplicate?.assetId}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Asset Name</span>
                    <span className="font-bold text-slate-900">{activeDuplicatePair.candidateDuplicate?.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Type</span>
                      <span className="text-slate-800">{activeDuplicatePair.candidateDuplicate?.assetType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                      <span className="text-slate-800">{activeDuplicatePair.candidateDuplicate?.category}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                    <span className="text-slate-800">{activeDuplicatePair.candidateDuplicate?.department?.name || activeDuplicatePair.candidateDuplicate?.department?.code || 'PWD'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                    <span className="text-slate-800">
                      {activeDuplicatePair.candidateDuplicate?.location?.address}, {activeDuplicatePair.candidateDuplicate?.location?.city}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Coordinates</span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {activeDuplicatePair.candidateDuplicate?.location?.latitude}, {activeDuplicatePair.candidateDuplicate?.location?.longitude}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <StatusBadge status={activeDuplicatePair.candidateDuplicate?.status} />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Condition</span>
                      <StatusBadge condition={activeDuplicatePair.candidateDuplicate?.condition} type="condition" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Merge Warning Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800">Merge Governance Rule:</span>
              <p>
                Merging will re-link all inspections, issues, maintenance events, documents, and financials from{' '}
                <span className="font-mono font-bold text-amber-900">{activeDuplicatePair.candidateDuplicate?.assetId}</span> into{' '}
                <span className="font-mono font-bold text-blue-900">{activeDuplicatePair.primaryAsset?.assetId}</span>. The candidate duplicate is retired with an immutable MERGE audit log.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleKeepSeparate(activeDuplicatePair)}
              >
                Keep Separate (Distinct Assets)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDuplicateCompareModal(false)}
                >
                  Cancel
                </Button>

                {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN') && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={GitMerge}
                    onClick={() => setConfirmMergeOpen(true)}
                  >
                    Merge into Primary
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active duplicate candidate pairs selected.
          </div>
        )}
      </Modal>

      {/* 4. Confirm Merge Dialog */}
      <ConfirmDialog
        isOpen={confirmMergeOpen}
        onClose={() => setConfirmMergeOpen(false)}
        onConfirm={handleExecuteMerge}
        title="Confirm Duplicate Consolidation & Merge"
        message={`Are you sure you want to merge candidate duplicate ${activeDuplicatePair?.candidateDuplicate?.assetId} ("${activeDuplicatePair?.candidateDuplicate?.name}") into primary record ${activeDuplicatePair?.primaryAsset?.assetId}? This action cannot be reversed.`}
        confirmText="Confirm & Merge Records"
        confirmVariant="danger"
        isLoading={mergingDuplicate}
      />
    </div>
  );
};

export default Assets;
