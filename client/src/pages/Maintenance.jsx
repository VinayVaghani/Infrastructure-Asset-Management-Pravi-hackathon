import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { maintenanceService } from '../services/maintenanceService';
import { assetService } from '../services/assetService';
import { issueService } from '../services/issueService';
import { contractorService } from '../services/contractorService';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  DollarSign,
  FileText,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react';

const Maintenance = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetsList, setAssetsList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [contractorsList, setContractorsList] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    asset: searchParams.get('assetId') || '',
    issue: searchParams.get('issueId') || '',
    type: 'CORRECTIVE',
    description: '',
    estimatedCost: '',
    contractor: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'PLANNED',
    notes: '',
  });

  useEffect(() => {
    const assetParam = searchParams.get('assetId');
    const issueParam = searchParams.get('issueId');
    if (assetParam || issueParam) {
      setFormData((prev) => ({
        ...prev,
        asset: assetParam || prev.asset,
        issue: issueParam || prev.issue,
        type: 'CORRECTIVE',
      }));
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceService.getMaintenanceRecords({
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        limit: 50,
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to fetch maintenance records:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [aRes, iRes, cRes] = await Promise.all([
          assetService.getAssets({ limit: 100 }),
          issueService.getIssues({ limit: 100 }),
          contractorService.getContractors(),
        ]);
        setAssetsList(aRes.data || []);
        setIssuesList(iRes.data || []);
        setContractorsList(cRes.data || []);
      } catch (err) {
        console.error('Metadata error:', err);
      }
    };
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Aggregate stats
  const totalCount = records.length;
  const inProgressCount = records.filter((r) => r.status === 'IN_PROGRESS').length;
  const totalCost = records.reduce((sum, r) => sum + (r.actualCost || r.cost || r.estimatedCost || 0), 0);

  const handleOpenDetail = (rec) => {
    setSelectedRecord(rec);
    setDetailModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!formData.asset || !formData.description) {
      setErrorMessage('Please select an asset and enter maintenance description.');
      return;
    }

    setSubmitting(true);
    try {
      await maintenanceService.createMaintenanceRecord({
        ...formData,
        estimatedCost: Number(formData.estimatedCost) || 0,
      });
      setCreateModalOpen(false);
      setFormData({
        asset: '',
        issue: '',
        type: 'ROUTINE',
        description: '',
        estimatedCost: '',
        contractor: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'PLANNED',
        notes: '',
      });
      fetchRecords();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to log maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (nextStatus) => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      await maintenanceService.updateMaintenanceRecord(selectedRecord._id, {
        status: nextStatus,
        actualCost: selectedRecord.actualCost || selectedRecord.estimatedCost,
      });
      setDetailModalOpen(false);
      fetchRecords();
    } catch (err) {
      console.error('Update status error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Maintenance ID',
      key: 'maintenanceId',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {r.maintenanceId}
        </span>
      ),
    },
    {
      header: 'Facility & Issue',
      key: 'asset',
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-blue-900 bg-blue-50 px-1 rounded font-bold">
              {r.asset?.assetId || 'ASSET'}
            </span>
            <Link
              to={`/assets/${r.asset?._id || r.asset}`}
              className="font-bold text-xs text-slate-800 hover:text-blue-900 hover:underline flex items-center gap-1"
            >
              {r.asset?.name || 'Asset Facility'}
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </Link>
          </div>
          {r.issue && (
            <div className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Linked to Issue: {r.issue.issueId || r.issue.title}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            r.type === 'EMERGENCY'
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : r.type === 'CORRECTIVE'
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : r.type === 'PREVENTIVE'
              ? 'bg-teal-100 text-teal-800 border border-teal-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          {r.type}
        </span>
      ),
    },
    {
      header: 'Scope Description',
      key: 'description',
      render: (r) => (
        <p className="text-xs text-slate-600 line-clamp-1 max-w-xs">{r.description}</p>
      ),
    },
    {
      header: 'Contractor',
      key: 'contractor',
      render: (r) => (
        <span className="text-xs text-slate-700 font-medium">
          {r.contractor?.companyName || r.contractor?.company || 'In-House Municipal'}
        </span>
      ),
    },
    {
      header: 'Cost (Est / Act)',
      key: 'cost',
      render: (r) => (
        <div className="text-xs font-mono font-bold text-slate-900">
          {formatCurrency(r.actualCost || r.cost || r.estimatedCost || 0)}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Start Date',
      key: 'startDate',
      render: (r) => <span className="text-xs font-mono text-slate-600">{formatDate(r.startDate)}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenDetail(r)}>
          View Record
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Maintenance & Rehabilitation Management"
          subtitle="Preventive repairs, component replacements, routine overhauls, and emergency actions"
          breadcrumbs={[{ label: 'Maintenance' }]}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchRecords} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            Log Maintenance Action
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-900">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Records Logged</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-600">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Active Operations</span>
          <div className="text-2xl font-black text-amber-700 mt-1 font-mono">{inProgressCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-600">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Maintenance Incurred</span>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">{formatCurrency(totalCost)}</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search maintenance ID, description, notes..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Maintenance Types</option>
                <option value="ROUTINE">ROUTINE</option>
                <option value="PREVENTIVE">PREVENTIVE</option>
                <option value="CORRECTIVE">CORRECTIVE</option>
                <option value="EMERGENCY">EMERGENCY</option>
              </select>

              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PLANNED">PLANNED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Table columns={columns} data={records} loading={loading} emptyMessage="No maintenance records found." />

      {/* CREATE MAINTENANCE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Log Maintenance Recommendation"
        subtitle="Initiate preventative overhaul or emergency corrective rehabilitation"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800">{errorMessage}</div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Target Asset *</label>
            <select
              className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
              value={formData.asset}
              onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
              required
            >
              <option value="">-- Choose Asset from Registry --</option>
              {assetsList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.assetId} &mdash; {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Maintenance Type *</label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="ROUTINE">ROUTINE Service</option>
                <option value="PREVENTIVE">PREVENTIVE Overhaul</option>
                <option value="CORRECTIVE">CORRECTIVE Repair</option>
                <option value="EMERGENCY">EMERGENCY Intervention</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Linked Defect / Issue</label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.issue}
                onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
              >
                <option value="">-- Standalone Maintenance (No Issue) --</option>
                {issuesList.map((i) => (
                  <option key={i._id} value={i._id}>
                    [{i.severity}] {i.issueId || i.issueCode} &mdash; {i.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description of Scope *</label>
            <textarea
              rows={3}
              placeholder="Describe the structural rehabilitation or maintenance routine required..."
              className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Estimated Cost (INR)</label>
              <input
                type="number"
                placeholder="₹ Amount"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Contractor Firm</label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.contractor}
                onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
              >
                <option value="">-- In-House Departmental Squad --</option>
                {contractorsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.company}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Register Recommendation
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedRecord?.maintenanceId || 'Maintenance Record'}
        subtitle={`Target Asset: ${selectedRecord?.asset?.name || 'State Asset'}`}
        maxWidth="max-w-2xl"
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Status & Type</span>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedRecord.status} />
                  <span className="font-bold text-slate-700">{selectedRecord.type}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Cost Assessment</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(selectedRecord.actualCost || selectedRecord.cost || selectedRecord.estimatedCost || 0)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-800 block mb-1">Scope of Maintenance:</span>
              <p className="text-slate-600 leading-relaxed">{selectedRecord.description}</p>
            </div>

            {selectedRecord.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-800 block mb-1">Field Notes:</span>
                <p className="text-slate-600 leading-relaxed italic">{selectedRecord.notes}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                {selectedRecord.status === 'PLANNED' && (
                  <Button size="sm" variant="secondary" onClick={() => handleStatusUpdate('APPROVED')} loading={submitting}>
                    Approve Scope
                  </Button>
                )}
                {selectedRecord.status === 'APPROVED' && (
                  <Button size="sm" variant="primary" onClick={() => handleStatusUpdate('IN_PROGRESS')} loading={submitting}>
                    Start Maintenance Work
                  </Button>
                )}
                {selectedRecord.status === 'IN_PROGRESS' && (
                  <Button size="sm" variant="gov" icon={CheckCircle2} onClick={() => handleStatusUpdate('COMPLETED')} loading={submitting}>
                    Mark Scope Completed & Settle
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                icon={FolderKanban}
                onClick={() => {
                  setDetailModalOpen(false);
                  navigate('/work-orders');
                }}
              >
                Go to Work Orders
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Maintenance;
