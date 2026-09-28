import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { assetService } from '../services/assetService';
import { inspectionService } from '../services/inspectionService';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  Sparkles,
  Camera,
  Plus,
  Trash2,
  Info,
  ArrowLeft,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';

const CONDITION_VALUES = {
  EXCELLENT: 100,
  GOOD: 80,
  MODERATE: 60,
  POOR: 40,
  CRITICAL: 15,
};

const RATING_WEIGHTS = {
  structural: { label: 'Structural Integrity', weight: 0.30, desc: 'Foundation, load-bearing piers, structural steel/concrete' },
  surface: { label: 'Surface Condition', weight: 0.20, desc: 'Pavement wear, waterproofing, spalling, weathering' },
  safety: { label: 'Safety & Regulatory', weight: 0.20, desc: 'Guardrails, emergency systems, signage, hazard barriers' },
  operational: { label: 'Operational Performance', weight: 0.15, desc: 'Throughput capacity, mechanical actuators, serviceability' },
  ageRisk: { label: 'Age & Life-Cycle Factor', weight: 0.15, desc: 'Asset age relative to expected design life' },
};

const InspectionForm = () => {
  const { id: paramAssetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assetsList, setAssetsList] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: user?.name || 'Authorized Structural QC Engineer',
    structuralCondition: 'GOOD',
    surfaceCondition: 'GOOD',
    safetyCondition: 'GOOD',
    operationalCondition: 'GOOD',
    observations: '',
    recommendations: '',
    nextInspectionDate: '',
    photoInput: '',
    photos: [],
    defectText: '',
    defectSeverity: 'MEDIUM',
    defects: [],
  });

  // Fetch asset list for dropdown (if not opened with specific ID)
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await assetService.getAssets({ limit: 100 });
        const list = res.data || [];
        setAssetsList(list);

        if (paramAssetId) {
          const matched = list.find(
            (a) => a._id === paramAssetId || a.assetId?.toUpperCase() === paramAssetId.toUpperCase()
          );
          if (matched) {
            setSelectedAsset(matched);
            setFormData((prev) => ({ ...prev, assetId: matched._id }));
          } else {
            // Fetch directly by ID
            setLoadingAsset(true);
            const single = await assetService.getAssetById(paramAssetId);
            if (single?.data) {
              setSelectedAsset(single.data);
              setFormData((prev) => ({ ...prev, assetId: single.data._id }));
            }
            setLoadingAsset(false);
          }
        }
      } catch (err) {
        console.error('Error fetching assets for inspection:', err);
      }
    };
    fetchAssets();
  }, [paramAssetId]);

  // When asset selection changes in dropdown
  const handleAssetSelect = (e) => {
    const aid = e.target.value;
    const found = assetsList.find((a) => a._id === aid);
    setSelectedAsset(found || null);
    setFormData((prev) => ({ ...prev, assetId: aid }));
  };

  // Compute live Age Factor (15% weight)
  const computeAgeFactor = () => {
    if (!selectedAsset) return 85;
    const installDate = selectedAsset.installationDate ? new Date(selectedAsset.installationDate) : null;
    const expectedLife = selectedAsset.expectedLifeYears || 25;
    if (!installDate) return 85;

    const ageYears = (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const lifeConsumedRatio = Math.max(0, ageYears / expectedLife);

    if (lifeConsumedRatio <= 0.2) return 100;
    if (lifeConsumedRatio <= 0.5) return 85;
    if (lifeConsumedRatio <= 0.75) return 70;
    if (lifeConsumedRatio <= 1.0) return 50;
    return 25;
  };

  // Real-time Composite Health Score calculation preview
  const liveAgeFactor = computeAgeFactor();
  const liveStructScore = CONDITION_VALUES[formData.structuralCondition] || 80;
  const liveSurfScore = CONDITION_VALUES[formData.surfaceCondition] || 80;
  const liveSafeScore = CONDITION_VALUES[formData.safetyCondition] || 80;
  const liveOpsScore = CONDITION_VALUES[formData.operationalCondition] || 80;

  const liveCompositeScore = Math.round(
    liveStructScore * 0.30 +
    liveSurfScore * 0.20 +
    liveSafeScore * 0.20 +
    liveOpsScore * 0.15 +
    liveAgeFactor * 0.15
  );

  const getConditionLabel = (score) => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'MODERATE';
    if (score >= 25) return 'POOR';
    return 'CRITICAL';
  };

  const liveCondition = getConditionLabel(liveCompositeScore);

  // Auto-suggest next inspection date whenever live condition updates
  useEffect(() => {
    if (!formData.nextInspectionDate) {
      const next = new Date();
      const months =
        liveCondition === 'CRITICAL' ? 1 :
        liveCondition === 'POOR' ? 3 :
        liveCondition === 'MODERATE' ? 6 : 12;
      next.setMonth(next.getMonth() + months);
      setFormData((prev) => ({ ...prev, nextInspectionDate: next.toISOString().split('T')[0] }));
    }
  }, [liveCondition]);

  const handleAddDefect = () => {
    if (!formData.defectText.trim()) return;
    const newDefect = {
      description: formData.defectText.trim(),
      severity: formData.defectSeverity,
    };
    setFormData((prev) => ({
      ...prev,
      defects: [...prev.defects, newDefect],
      defectText: '',
    }));
  };

  const handleRemoveDefect = (index) => {
    setFormData((prev) => ({
      ...prev,
      defects: prev.defects.filter((_, idx) => idx !== index),
    }));
  };

  const handleAddPhoto = () => {
    if (!formData.photoInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, formData.photoInput.trim()],
      photoInput: '',
    }));
  };

  const handleRemovePhoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.assetId) {
      setErrorMsg('Please select a target infrastructure asset to conduct inspection.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        asset: formData.assetId,
        inspectionDate: formData.inspectionDate,
        inspector: user?._id,
        structuralCondition: formData.structuralCondition,
        surfaceCondition: formData.surfaceCondition,
        safetyCondition: formData.safetyCondition,
        operationalCondition: formData.operationalCondition,
        observations: formData.observations,
        defects: formData.defects,
        recommendations: formData.recommendations,
        photos: formData.photos,
        nextInspectionDate: formData.nextInspectionDate,
      };

      const res = await inspectionService.createInspection(payload);
      setSuccessResult(res.data);
    } catch (err) {
      console.error('Inspection submit error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit inspection record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    const { inspection, scoring, alertGenerated } = successResult;
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Card className="border-emerald-200 bg-white shadow-xl">
          <div className="bg-emerald-700 text-white p-6 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-200" />
              <div>
                <h2 className="text-xl font-bold font-heading">Inspection Certified & Recorded</h2>
                <p className="text-emerald-100 text-xs mt-0.5">
                  Reference: <span className="font-mono font-semibold">{inspection.inspectionNumber}</span>
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-800/80 text-emerald-100 rounded text-xs font-mono">
              State Audit Registry Logged
            </span>
          </div>

          <CardBody className="p-6 space-y-6">
            {/* Condition & Score Result Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-center p-3 border-b md:border-b-0 md:border-r border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Assessed Condition</span>
                <div className="mt-1 flex justify-center">
                  <StatusBadge condition={scoring.overallCondition} type="condition" />
                </div>
              </div>
              <div className="text-center p-3 border-b md:border-b-0 md:border-r border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Composite Health Index</span>
                <div className="text-3xl font-black text-slate-900 mt-1 font-mono">
                  {scoring.healthScore}<span className="text-sm font-normal text-slate-500">/100</span>
                </div>
              </div>
              <div className="text-center p-3">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Next Mandated Inspection</span>
                <div className="text-sm font-semibold text-slate-800 mt-2 flex items-center justify-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-900" />
                  {new Date(inspection.nextInspectionDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* Score Breakdown Display */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Multi-Factor Health Breakdown (30 / 20 / 20 / 15 / 15 Weighting Model)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-[10px] text-blue-700 font-semibold uppercase">Structural (30%)</div>
                  <div className="text-sm font-mono font-bold text-blue-900 mt-0.5">{scoring.breakdown?.structuralScore}%</div>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-[10px] text-blue-700 font-semibold uppercase">Surface (20%)</div>
                  <div className="text-sm font-mono font-bold text-blue-900 mt-0.5">{scoring.breakdown?.surfaceScore}%</div>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-[10px] text-blue-700 font-semibold uppercase">Safety (20%)</div>
                  <div className="text-sm font-mono font-bold text-blue-900 mt-0.5">{scoring.breakdown?.safetyScore}%</div>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-[10px] text-blue-700 font-semibold uppercase">Operational (15%)</div>
                  <div className="text-sm font-mono font-bold text-blue-900 mt-0.5">{scoring.breakdown?.operationalScore}%</div>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-[10px] text-blue-700 font-semibold uppercase">Age Factor (15%)</div>
                  <div className="text-sm font-mono font-bold text-blue-900 mt-0.5">{scoring.breakdown?.ageFactorScore}%</div>
                </div>
              </div>
            </div>

            {/* Alert Notification if Generated */}
            {alertGenerated && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-amber-900">Critical / Poor Condition Alert Dispatched</div>
                  <p className="text-amber-800 mt-0.5">
                    Because this asset received a degraded rating, an executive notification has been posted to the Executive Command Center Action Center and flagged for maintenance prioritization.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => navigate('/inspections')}
              >
                View All Inspections
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSuccessResult(null);
                    setFormData((prev) => ({
                      ...prev,
                      observations: '',
                      recommendations: '',
                      defects: [],
                      photos: [],
                    }));
                  }}
                >
                  Conduct Another
                </Button>
                <Link to={`/assets/${selectedAsset?._id || inspection.asset?._id || inspection.asset}`}>
                  <Button variant="primary">
                    Open Digital Asset Passport
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Conduct Infrastructure Inspection"
          subtitle="Record certified engineering audit, assess component conditions, and calculate digital health score"
          breadcrumbs={[
            { label: 'Inspections', path: '/inspections' },
            { label: 'New Inspection' },
          ]}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Asset & Inspector Identification */}
        <Card>
          <CardHeader
            title="1. Asset & Inspector Particulars"
            subtitle="Select the target public infrastructure facility and certifying authority"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Infrastructure Asset *
                </label>
                {paramAssetId && selectedAsset ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedAsset.assetId}
                      </span>
                      <StatusBadge condition={selectedAsset.condition} type="condition" />
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-1.5">{selectedAsset.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{selectedAsset.category}</span> &bull;
                      <span>{selectedAsset.location?.city}, {selectedAsset.location?.district}</span>
                    </div>
                  </div>
                ) : (
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    value={formData.assetId}
                    onChange={handleAssetSelect}
                    required
                  >
                    <option value="">-- Choose Asset from State Registry --</option>
                    {assetsList.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.assetId} &mdash; {a.name} ({a.category} &bull; {a.location?.city || 'Gujarat'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Inspection Date *
                  </label>
                  <input
                    type="date"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    value={formData.inspectionDate}
                    onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Inspector Name / Title
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    value={formData.inspectorName}
                    onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                    placeholder="Inspector Name"
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 2: Sub-Component Condition Scoring (30/20/20/15/15) */}
        <Card className="border-blue-200">
          <CardHeader
            title="2. Engineering Component Assessment & Health Score Algorithm"
            subtitle="Multi-factor evaluation model weighting structural, surface, safety, operational, and age metrics"
          />
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Structural Integrity (30%) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Structural Condition</span>
                    <span className="ml-2 text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                      Weight: 30%
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {liveStructScore} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Foundations, load-bearing piers, structural steel beams, concrete deck slab integrity.
                </p>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, structuralCondition: val })}
                      className={`py-1.5 text-[10px] font-bold rounded transition-all ${
                        formData.structuralCondition === val
                          ? val === 'EXCELLENT' ? 'bg-emerald-600 text-white shadow'
                          : val === 'GOOD' ? 'bg-teal-600 text-white shadow'
                          : val === 'MODERATE' ? 'bg-amber-600 text-white shadow'
                          : val === 'POOR' ? 'bg-orange-600 text-white shadow'
                          : 'bg-rose-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Surface Condition (20%) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Surface Condition</span>
                    <span className="ml-2 text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                      Weight: 20%
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {liveSurfScore} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Bitumen wearing course, concrete spalling, waterproofing, expansion joint seals.
                </p>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, surfaceCondition: val })}
                      className={`py-1.5 text-[10px] font-bold rounded transition-all ${
                        formData.surfaceCondition === val
                          ? val === 'EXCELLENT' ? 'bg-emerald-600 text-white shadow'
                          : val === 'GOOD' ? 'bg-teal-600 text-white shadow'
                          : val === 'MODERATE' ? 'bg-amber-600 text-white shadow'
                          : val === 'POOR' ? 'bg-orange-600 text-white shadow'
                          : 'bg-rose-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Condition (20%) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Safety & Regulatory</span>
                    <span className="ml-2 text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                      Weight: 20%
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {liveSafeScore} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Crash barriers, pedestrian railings, emergency shutoffs, navigation/warning lights.
                </p>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, safetyCondition: val })}
                      className={`py-1.5 text-[10px] font-bold rounded transition-all ${
                        formData.safetyCondition === val
                          ? val === 'EXCELLENT' ? 'bg-emerald-600 text-white shadow'
                          : val === 'GOOD' ? 'bg-teal-600 text-white shadow'
                          : val === 'MODERATE' ? 'bg-amber-600 text-white shadow'
                          : val === 'POOR' ? 'bg-orange-600 text-white shadow'
                          : 'bg-rose-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operational Condition (15%) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Operational Condition</span>
                    <span className="ml-2 text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                      Weight: 15%
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {liveOpsScore} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Service level, mechanical actuators, flow capacity, electrical substations, tolling.
                </p>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {['EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'CRITICAL'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, operationalCondition: val })}
                      className={`py-1.5 text-[10px] font-bold rounded transition-all ${
                        formData.operationalCondition === val
                          ? val === 'EXCELLENT' ? 'bg-emerald-600 text-white shadow'
                          : val === 'GOOD' ? 'bg-teal-600 text-white shadow'
                          : val === 'MODERATE' ? 'bg-amber-600 text-white shadow'
                          : val === 'POOR' ? 'bg-orange-600 text-white shadow'
                          : 'bg-rose-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Health Score Preview Card */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-mono text-2xl font-black text-amber-300">
                    {liveCompositeScore}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
                        Projected Health Index:
                      </span>
                      <StatusBadge condition={liveCondition} type="condition" />
                    </div>
                    <div className="text-[11px] text-blue-200 mt-1">
                      Score formula: Structural (30%) + Surface (20%) + Safety (20%) + Operational (15%) + Age Factor ({liveAgeFactor}pts &bull; 15%)
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-blue-200 block text-[10px] uppercase font-bold">Recommended Cycle</span>
                  <span className="font-semibold text-amber-300">
                    {liveCondition === 'CRITICAL' ? 'Immediate (1 Month)'
                      : liveCondition === 'POOR' ? 'Quarterly (3 Months)'
                      : liveCondition === 'MODERATE' ? 'Biannual (6 Months)'
                      : 'Annual (12 Months)'}
                  </span>
                </div>
              </div>

              {/* Mandatory Prompt Disclaimer */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-blue-200 italic">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-blue-300" />
                <span>
                  Notice: These condition scores are configurable application/demo thresholds for predictive infrastructure simulation. They do not represent official government engineering standards.
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 3: Detailed Observations, Defects & Photos */}
        <Card>
          <CardHeader
            title="3. Engineering Observations & Defect Registry"
            subtitle="Record visual anomalies, structural spalls, crack gauges, and photographic evidence"
          />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Technical Observations & Field Notes
              </label>
              <textarea
                rows={3}
                className="w-full text-xs rounded-lg border border-slate-300 p-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Enter detailed field observations, visual signs of distress, vibration or deflection findings..."
              />
            </div>

            {/* Defects Checklist Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Identified Defects & Severity
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. 15mm diagonal shear crack on Pier #3, seal delamination..."
                  className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  value={formData.defectText}
                  onChange={(e) => setFormData({ ...formData, defectText: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDefect();
                    }
                  }}
                />
                <select
                  className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                  value={formData.defectSeverity}
                  onChange={(e) => setFormData({ ...formData, defectSeverity: e.target.value })}
                >
                  <option value="LOW">Low Severity</option>
                  <option value="MEDIUM">Medium Severity</option>
                  <option value="HIGH">High Severity</option>
                  <option value="CRITICAL">Critical Severity</option>
                </select>
                <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={handleAddDefect}>
                  Add Defect
                </Button>
              </div>

              {formData.defects.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {formData.defects.map((def, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          def.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800'
                          : def.severity === 'HIGH' ? 'bg-orange-100 text-orange-800'
                          : def.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {def.severity}
                        </span>
                        <span className="text-slate-800 font-medium">{def.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDefect(idx)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Engineering Recommendations & Corrective Actions
              </label>
              <textarea
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-300 p-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                placeholder="Specific remediation, immediate speed restrictions, resurfacing order, or replacement schedule..."
              />
            </div>

            {/* Photos & Next Inspection Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Inspection Photo Evidence (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/site-photo.jpg"
                    className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    value={formData.photoInput}
                    onChange={(e) => setFormData({ ...formData, photoInput: e.target.value })}
                  />
                  <Button type="button" size="sm" variant="outline" icon={Camera} onClick={handleAddPhoto}>
                    Add
                  </Button>
                </div>
                {formData.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.photos.map((p, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-mono">
                        Photo #{idx + 1}
                        <button type="button" onClick={() => handleRemovePhoto(idx)} className="text-slate-400 hover:text-rose-600">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mandatory Next Inspection Date *
                </label>
                <input
                  type="date"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  value={formData.nextInspectionDate}
                  onChange={(e) => setFormData({ ...formData, nextInspectionDate: e.target.value })}
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Automatically set to +{liveCondition === 'CRITICAL' ? '1 mo' : liveCondition === 'POOR' ? '3 mos' : liveCondition === 'MODERATE' ? '6 mos' : '12 mos'} based on condition score.
                </span>
              </div>
            </div>
          </CardBody>

          <CardFooter className="flex items-center justify-between bg-slate-50 p-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              icon={ClipboardCheck}
              loading={submitting}
            >
              Submit & Certify Inspection
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default InspectionForm;
