import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { workOrderService } from '../services/workOrderService';
import { contractorService } from '../services/contractorService';
import { assetService } from '../services/assetService';
import { issueService } from '../services/issueService';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Camera,
  Layers,
  Wrench,
  ExternalLink,
} from 'lucide-react';

const WORKFLOW_STEPS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED'];

const WorkOrders = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contractorsList, setContractorsList] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Create Form State
  const [createData, setCreateData] = useState({
    asset: searchParams.get('assetId') || '',
    issue: searchParams.get('issueId') || '',
    title: '',
    description: '',
    priority: 'HIGH',
    contractor: '',
    estimatedCost: '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  });

  useEffect(() => {
    const assetParam = searchParams.get('assetId');
    const issueParam = searchParams.get('issueId');
    if (assetParam || issueParam) {
      setCreateData((prev) => ({
        ...prev,
        asset: assetParam || prev.asset,
        issue: issueParam || prev.issue,
      }));
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  // Workflow Action Form State
  const [actionData, setActionData] = useState({
    contractor: '',
    actualCost: '',
    completionNotes: '',
    evidencePhoto: '',
  });

  // Fetch Work Orders
  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workOrderService.getWorkOrders({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        overdue: overdueOnly ? 'true' : undefined,
        limit: 50,
      });
      setWorkOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, overdueOnly]);

  // Load auxiliary lists on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [cRes, aRes, iRes] = await Promise.all([
          contractorService.getContractors(),
          assetService.getAssets({ limit: 100 }),
          issueService.getIssues({ limit: 100, status: 'REPORTED' }),
        ]);
        setContractorsList(cRes.data || []);
        setAssetsList(aRes.data || []);
        setIssuesList(iRes.data || []);
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  // Quick summary calculation
  const totalOrders = workOrders.length;
  const activeOrdersCount = workOrders.filter((w) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(w.status)).length;
  const overdueCount = workOrders.filter((w) => w.isOverdue).length;
  const totalCost = workOrders.reduce((sum, w) => sum + (w.actualCost || w.estimatedCost || 0), 0);

  const handleOpenManageModal = (order) => {
    setSelectedOrder(order);
    setActionData({
      contractor: order.contractor?._id || '',
      actualCost: order.actualCost || order.estimatedCost || '',
      completionNotes: order.completionNotes || '',
      evidencePhoto: '',
    });
    setErrorMessage('');
    setManageModalOpen(true);
  };

  // Submit Create Work Order
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!createData.asset || !createData.title) {
      setErrorMessage('Please select a target asset and enter a scope title.');
      return;
    }

    setSubmitting(true);
    try {
      await workOrderService.createWorkOrder({
        ...createData,
        estimatedCost: Number(createData.estimatedCost) || 0,
      });
      setCreateModalOpen(false);
      setCreateData({
        asset: '',
        issue: '',
        title: '',
        description: '',
        priority: 'HIGH',
        contractor: '',
        estimatedCost: '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
      });
      fetchWorkOrders();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create work order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Transition Workflow Status
  const handleTransitionStatus = async (nextStatus) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        status: nextStatus,
        contractor: actionData.contractor || undefined,
        actualCost: actionData.actualCost ? Number(actionData.actualCost) : undefined,
        completionNotes: actionData.completionNotes || undefined,
      };

      if (actionData.evidencePhoto) {
        payload.evidencePhotos = actionData.evidencePhoto;
      }

      await workOrderService.updateWorkOrder(selectedOrder._id, payload);
      setManageModalOpen(false);
      fetchWorkOrders();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update work order lifecycle status.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Order ID',
      key: 'workOrderId',
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {r.workOrderId || r.orderNumber}
          </span>
          {r.isOverdue && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              OVERDUE
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Scope Title & Asset',
      key: 'title',
      render: (r) => (
        <div>
          <div className="font-bold text-xs text-slate-800 line-clamp-1">{r.title}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1 rounded">
              {r.asset?.assetId || 'ASSET'}
            </span>
            <Link
              to={`/assets/${r.asset?._id || r.asset}`}
              className="hover:text-blue-900 hover:underline truncate max-w-xs flex items-center gap-1"
            >
              {r.asset?.name || 'Infrastructure Asset'}
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </Link>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Contractor',
      key: 'contractor',
      render: (r) => (
        <span className="text-xs text-slate-700 font-medium">
          {r.contractor?.companyName || r.contractor?.company || (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      render: (r) => <StatusBadge priority={r.priority} type="priority" />,
    },
    {
      header: 'Workflow Status',
      key: 'status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Cost (Est / Act)',
      key: 'cost',
      render: (r) => (
        <div className="text-xs font-mono">
          <div className="font-bold text-slate-900">
            {r.actualCost > 0 ? formatCurrency(r.actualCost) : formatCurrency(r.estimatedCost)}
          </div>
          {r.actualCost > 0 && r.actualCost !== r.estimatedCost && (
            <div className="text-[10px] text-slate-400">Est: {formatCurrency(r.estimatedCost)}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Target Date',
      key: 'dueDate',
      render: (r) => {
        const d = r.dueDate || r.targetCompletionDate;
        return (
          <span className={`text-xs font-mono ${r.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
            {d ? formatDate(d) : 'TBD'}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenManageModal(r)}>
          Manage Lifecycle
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Work Orders & Field Execution"
          subtitle="Manage contractor allocations, repair directives, milestones, and quality verification"
          breadcrumbs={[{ label: 'Work Orders' }]}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchWorkOrders} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            Create Work Order
          </Button>
        </div>
      </div>

      {/* KPI Command Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Work Orders</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalOrders}</div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-800 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Active Execution</span>
              <div className="text-2xl font-black text-amber-700 mt-1 font-mono">{activeOrdersCount}</div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Overdue Directives</span>
              <div className="text-2xl font-black text-rose-700 mt-1 font-mono">{overdueCount}</div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Contract Value</span>
              <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">{formatCurrency(totalCost)}</div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
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
                placeholder="Search order ID, title, description..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>

              <button
                type="button"
                onClick={() => setOverdueOnly(!overdueOnly)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                  overdueOnly
                    ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {overdueOnly ? '✓ Overdue Filter Active' : 'Overdue Only'}
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Work Orders Table */}
      <Table columns={columns} data={workOrders} loading={loading} emptyMessage="No work orders found matching criteria." />

      {/* CREATE WORK ORDER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Capital Work Order"
        subtitle="Issue formal engineering directive linked to asset or reported defect"
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
              value={createData.asset}
              onChange={(e) => setCreateData({ ...createData, asset: e.target.value })}
              required
            >
              <option value="">-- Select Asset from Registry --</option>
              {assetsList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.assetId} &mdash; {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          {issuesList.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Linked Defect / Issue (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={createData.issue}
                onChange={(e) => setCreateData({ ...createData, issue: e.target.value })}
              >
                <option value="">-- Independent Work Order (No Issue Linked) --</option>
                {issuesList.map((i) => (
                  <option key={i._id} value={i._id}>
                    [{i.severity}] {i.issueId || i.issueCode} &mdash; {i.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Scope of Work Title *</label>
            <input
              type="text"
              placeholder="e.g. Expansion Joint Elastomeric Replacement & Bridge Deck Sealing"
              className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
              value={createData.title}
              onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Detailed Technical Scope</label>
            <textarea
              rows={3}
              placeholder="Specific engineering scope, safety specifications, material tolerances, and execution requirements..."
              className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
              value={createData.description}
              onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Priority Directive *</label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={createData.priority}
                onChange={(e) => setCreateData({ ...createData, priority: e.target.value })}
              >
                <option value="LOW">LOW Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="CRITICAL">CRITICAL Priority</option>
                <option value="URGENT">URGENT Priority</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Assign Contractor</label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={createData.contractor}
                onChange={(e) => setCreateData({ ...createData, contractor: e.target.value })}
              >
                <option value="">-- Assign Later --</option>
                {contractorsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.company} ({c.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Estimated Cost (INR)</label>
              <input
                type="number"
                placeholder="₹ Cost outlay"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={createData.estimatedCost}
                onChange={(e) => setCreateData({ ...createData, estimatedCost: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Mandatory Due Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={createData.dueDate}
                onChange={(e) => setCreateData({ ...createData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Issue Directive
            </Button>
          </div>
        </form>
      </Modal>

      {/* MANAGE WORK ORDER OPERATIONAL LIFECYCLE MODAL */}
      <Modal
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title={selectedOrder?.workOrderId || selectedOrder?.orderNumber || 'Work Order Directive'}
        subtitle={selectedOrder?.title}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800">{errorMessage}</div>
            )}

            {/* Visual Step-by-Step Progress Tracker */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Operational Lifecycle Progress:
              </span>
              <div className="flex items-center justify-between relative">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const currentIdx = WORKFLOW_STEPS.indexOf(selectedOrder.status);
                  const isDone = currentIdx > idx || selectedOrder.status === step;
                  const isCurrent = selectedOrder.status === step;

                  return (
                    <div key={step} className="flex flex-col items-center flex-1 relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition ${
                          isCurrent
                            ? 'bg-blue-900 border-blue-900 text-white shadow-md'
                            : isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        {isDone && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-[9px] mt-1 font-bold ${
                          isCurrent ? 'text-blue-900' : isDone ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Asset and Scope Overview */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Facility</span>
                <span className="font-semibold text-slate-800">{selectedOrder.asset?.name || 'Asset'}</span>
                <div className="text-[10px] font-mono text-blue-900 mt-0.5">{selectedOrder.asset?.assetId}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Contractor Assigned</span>
                <span className="font-semibold text-slate-800">
                  {selectedOrder.contractor?.companyName || selectedOrder.contractor?.company || 'None Assigned'}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Priority: <strong>{selectedOrder.priority}</strong>
                </div>
              </div>
            </div>

            {/* Workflow Action Decision Engine */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-4">
              <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-900" />
                Workflow Lifecycle Transition Action
              </h4>

              {/* State 1: OPEN -> Assign Contractor */}
              {selectedOrder.status === 'OPEN' && (
                <div className="space-y-3">
                  <p className="text-slate-600">Select an approved contractor firm to assign this execution scope:</p>
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                    value={actionData.contractor}
                    onChange={(e) => setActionData({ ...actionData, contractor: e.target.value })}
                  >
                    <option value="">-- Choose Contractor --</option>
                    {contractorsList.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName || c.company} ({c.registrationNumber})
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    disabled={!actionData.contractor}
                    onClick={() => handleTransitionStatus('ASSIGNED')}
                  >
                    Assign Contractor & Transition to ASSIGNED
                  </Button>
                </div>
              )}

              {/* State 2: ASSIGNED -> Contractor starts work */}
              {selectedOrder.status === 'ASSIGNED' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Contractor <strong>{selectedOrder.contractor?.companyName}</strong> has been notified. Ready to mobilize on-site workforce?
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    onClick={() => handleTransitionStatus('IN_PROGRESS')}
                  >
                    Mobilize Contractor & Transition to IN_PROGRESS
                  </Button>
                </div>
              )}

              {/* State 3: IN_PROGRESS -> Contractor completes work */}
              {selectedOrder.status === 'IN_PROGRESS' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Field execution underway. Enter actual cost outlay, completion field notes, and photo evidence URL:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Actual Incurred Cost (INR)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded border border-slate-300 p-2 text-xs"
                        value={actionData.actualCost}
                        onChange={(e) => setActionData({ ...actionData, actualCost: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Evidence Photo URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/completion-photo.jpg"
                        className="w-full rounded border border-slate-300 p-2 text-xs"
                        value={actionData.evidencePhoto}
                        onChange={(e) => setActionData({ ...actionData, evidencePhoto: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Contractor Completion Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Summary of completed repairs, installed components, load tests passed..."
                      className="w-full rounded border border-slate-300 p-2 text-xs"
                      value={actionData.completionNotes}
                      onChange={(e) => setActionData({ ...actionData, completionNotes: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    onClick={() => handleTransitionStatus('COMPLETED')}
                  >
                    Mark Scope COMPLETED & Request QC Inspection
                  </Button>
                </div>
              )}

              {/* State 4: COMPLETED -> Engineer verifies */}
              {selectedOrder.status === 'COMPLETED' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
                    <strong>Contractor Marked Completed.</strong> Actual Cost: {formatCurrency(selectedOrder.actualCost)}.
                    {selectedOrder.completionNotes && <p className="mt-1 italic">"{selectedOrder.completionNotes}"</p>}
                  </div>
                  <p className="text-slate-600">
                    As State Executive QC Engineer, verify that the physical repairs satisfy structural safety requirements:
                  </p>
                  <Button
                    variant="gov"
                    size="sm"
                    loading={submitting}
                    icon={ShieldCheck}
                    onClick={() => handleTransitionStatus('VERIFIED')}
                  >
                    Engineer Verify & Quality Certify
                  </Button>
                </div>
              )}

              {/* State 5: VERIFIED -> Close & Settle into Ledger */}
              {selectedOrder.status === 'VERIFIED' && (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded text-teal-900">
                    <strong>Quality Verified by Engineer:</strong> {selectedOrder.verifiedBy?.name || user?.name || 'QC Authority'}.
                  </div>
                  <p className="text-slate-600">
                    Close the work order to liquidate payment, record the transaction in the State Financial Ledger, and restore asset operational metrics:
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    icon={CheckCircle2}
                    onClick={() => handleTransitionStatus('CLOSED')}
                  >
                    Close Work Order & Liquidate to Ledger
                  </Button>
                </div>
              )}

              {/* State 6: CLOSED */}
              {selectedOrder.status === 'CLOSED' && (
                <div className="p-3 bg-slate-100 rounded text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <strong className="block">Work Order Closed & Fully Liquidated.</strong>
                    <span>Permanent transaction registered in State Financial Ledger. Asset lifecycle updated.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkOrders;
