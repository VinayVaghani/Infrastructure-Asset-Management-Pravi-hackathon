import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wrench,
  FileText,
  X,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { issueService } from '../services/issueService';
import { assetService } from '../services/assetService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';

const ISSUE_STATUSES = [
  'REPORTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const ISSUE_TYPES = [
  'STRUCTURAL',
  'SURFACE',
  'ELECTRICAL',
  'PLUMBING',
  'SAFETY',
  'DRAINAGE',
  'OTHER',
];

const Issues = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    asset: '',
    title: '',
    description: '',
    issueType: 'STRUCTURAL',
    severity: 'MEDIUM',
    photos: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Update Status Form State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: '',
    resolution: '',
  });

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.issueType = typeFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await issueService.getIssues(params);
      const data = res.data || [];
      setIssues(data);
      setTotal(res.pagination?.total || data.length);
    } catch (err) {
      showError(err.message || 'Failed to load issues registry');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await assetService.getAssets({ limit: 100 });
      setAssets(res.data || []);
    } catch (err) {
      console.error('Error fetching assets for issue form:', err);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!createForm.asset || !createForm.title) {
      showError('Please select an asset and specify the issue title.');
      return;
    }

    try {
      setSubmitting(true);
      const photoArray = createForm.photos
        ? createForm.photos.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      await issueService.createIssue({
        ...createForm,
        photos: photoArray,
      });

      showSuccess('Defect issue logged and dispatched into operational queue.');
      setCreateModalOpen(false);
      setCreateForm({
        asset: '',
        title: '',
        description: '',
        issueType: 'STRUCTURAL',
        severity: 'MEDIUM',
        photos: '',
      });
      fetchIssues();
    } catch (err) {
      showError(err.message || 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = (issue) => {
    setSelectedIssue(issue);
    setStatusUpdateForm({
      status: issue.status,
      resolution: issue.resolution || '',
    });
    setDetailModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;

    try {
      setUpdatingStatus(true);
      const payload = {
        status: statusUpdateForm.status,
        resolution: statusUpdateForm.resolution,
      };

      const updated = await issueService.updateIssue(selectedIssue._id, payload);
      showSuccess(`Issue status updated to ${statusUpdateForm.status}`);
      setSelectedIssue(updated.data || { ...selectedIssue, ...payload });
      fetchIssues();
    } catch (err) {
      showError(err.message || 'Failed to update issue');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // KPI calculations
  const totalReported = issues.filter((i) => i.status === 'REPORTED').length;
  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED').length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
              OPERATIONAL INCIDENT TRACKER
            </span>
            <span className="text-xs text-slate-500 font-mono">ISO 55000 / PWD Standard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Defect & Issue Registry</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Monitor, prioritize, and initiate corrective work orders for asset structural and functional distress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIssues}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh registry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Report New Issue
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending Review</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalReported}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">High / Critical</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{criticalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Under Execution</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Resolved & Closed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Issue ID, Title, Description, or Asset..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Issue ID</th>
                <th className="py-3.5 px-4">Asset Details</th>
                <th className="py-3.5 px-4">Title & Classification</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Reported</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading issues telemetry...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No issues matching specified criteria.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => {
                  const assetObj = issue.asset || {};
                  return (
                    <tr key={issue._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                        {issue.issueId}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => navigate(`/assets/${assetObj._id || assetObj.assetId}`)}
                          className="font-medium text-slate-900 hover:text-blue-700 text-left flex items-center gap-1.5"
                        >
                          {assetObj.name || 'Unknown Asset'}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                        <span className="text-xs text-slate-400 block font-mono">
                          {assetObj.assetId || 'N/A'} • {assetObj.category || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-900 line-clamp-1">{issue.title}</p>
                        <span className="text-xs text-slate-500 font-mono">
                          {issue.issueType || 'DEFECT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            issue.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : issue.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : issue.severity === 'MEDIUM'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={issue.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {issue.reportedDate ? new Date(issue.reportedDate).toLocaleDateString() : 'N/A'}
                        <span className="block text-[11px] text-slate-400">
                          by {issue.reportedBy?.name || 'Engineer'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetail(issue)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                          >
                            Inspect & Act
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Issue Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-slate-900">Report Infrastructure Defect</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Target Infrastructure Asset *
                </label>
                <select
                  required
                  value={createForm.asset}
                  onChange={(e) => setCreateForm({ ...createForm, asset: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Asset from State Registry...</option>
                  {assets.map((a) => (
                    <option key={a._id} value={a._id}>
                      [{a.assetId}] {a.name} ({a.category} - {a.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Issue Title / Defect Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Expansion joint separation and bearing displacement"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Defect Classification
                  </label>
                  <select
                    value={createForm.issueType}
                    onChange={(e) => setCreateForm({ ...createForm, issueType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Severity Grade
                  </label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Detailed Engineering Observation
                </label>
                <textarea
                  rows="3"
                  placeholder="Record structural observations, micro-cracks, displacement measurements..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Photo URLs (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                  value={createForm.photos}
                  onChange={(e) => setCreateForm({ ...createForm, photos: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Dispatch Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Detail & Action Modal */}
      {detailModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-blue-400 font-bold">
                    {selectedIssue.issueId}
                  </span>
                  <StatusBadge status={selectedIssue.status} />
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Asset & Severity metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Asset</span>
                  <span className="font-semibold text-slate-800">
                    {selectedIssue.asset?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Severity</span>
                  <span className="font-bold text-rose-600">{selectedIssue.severity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Classification</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.issueType || 'DEFECT'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Reported Date</span>
                  <span className="font-semibold text-slate-800">
                    {selectedIssue.reportedDate
                      ? new Date(selectedIssue.reportedDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Defect Description
                </h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedIssue.description || 'No detailed observation provided.'}
                </p>
              </div>

              {/* Photos */}
              {selectedIssue.photos && selectedIssue.photos.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Visual Evidence Photos ({selectedIssue.photos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedIssue.photos.map((photo, i) => (
                      <a
                        key={i}
                        href={photo}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100 flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={photo}
                          alt={`Defect ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                          View Photo
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Info if any */}
              {selectedIssue.resolution && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Resolution Record
                  </h4>
                  <p className="text-sm text-emerald-900">{selectedIssue.resolution}</p>
                  {selectedIssue.resolvedDate && (
                    <span className="text-xs text-emerald-700 mt-1 block">
                      Resolved on: {new Date(selectedIssue.resolvedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons to initiate Work Order or Maintenance */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                  Operational Remediation Flow
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      navigate(`/work-orders?issueId=${selectedIssue._id}&assetId=${selectedIssue.asset?._id || selectedIssue.asset}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Issue Work Order
                  </button>

                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      navigate(`/maintenance?issueId=${selectedIssue._id}&assetId=${selectedIssue.asset?._id || selectedIssue.asset}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-medium rounded-lg shadow-sm transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-600" />
                    Recommend Maintenance
                  </button>

                  {selectedIssue.asset && (
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        navigate(`/assets/${selectedIssue.asset._id || selectedIssue.asset}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-medium rounded-lg shadow-sm transition-colors ml-auto"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      View Asset Passport
                    </button>
                  )}
                </div>
              </div>

              {/* Update Status Form */}
              <form onSubmit={handleUpdateStatus} className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Update Issue State & Resolution
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Status</label>
                    <select
                      value={statusUpdateForm.status}
                      onChange={(e) =>
                        setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {ISSUE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Resolution Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Jacking and bearing pad replacement executed under WO-2026-0002"
                      value={statusUpdateForm.resolution}
                      onChange={(e) =>
                        setStatusUpdateForm({ ...statusUpdateForm, resolution: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {updatingStatus ? 'Updating...' : 'Save Issue Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Issues;
