import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
import { financialService } from '../services/financialService';
import { assetService } from '../services/assetService';
import { projectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Receipt,
  Layers,
  FolderKanban,
  FileText,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  PieChart,
} from 'lucide-react';

const FINANCIAL_TYPES = [
  'ACQUISITION',
  'CONSTRUCTION',
  'MAINTENANCE',
  'REPAIR',
  'OPERATION',
  'DISPOSAL',
];

const Financials = () => {
  const { user, hasRole } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    type: 'MAINTENANCE',
    amount: '',
    asset: '',
    project: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    description: '',
    status: 'APPROVED',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const [recordsRes, summaryRes] = await Promise.all([
        financialService.getFinancialRecords(params),
        financialService.getFinancialSummary(),
      ]);

      setRecords(recordsRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (err) {
      showError(err.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadAssociations = async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          assetService.getAssets({ limit: 100 }).catch(() => ({ data: [] })),
          projectService.getProjects({ limit: 100 }).catch(() => ({ data: [] })),
        ]);
        setAssets(aRes.data || []);
        setProjects(pRes.data || []);
      } catch (err) {
        console.error('Metadata load error:', err);
      }
    };
    loadAssociations();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      showError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      await financialService.createFinancialRecord(form);
      showSuccess('Financial transaction successfully posted to State Ledger.');
      setCreateModalOpen(false);
      setForm({
        type: 'MAINTENANCE',
        amount: '',
        asset: '',
        project: '',
        date: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        description: '',
        status: 'APPROVED',
      });
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to post transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const b = summary?.breakdown || {};
  const totalLifecycleCost = summary?.totalLifecycleCost || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
              STATE FISCAL AUDIT & LEDGER
            </span>
            <span className="text-xs text-slate-500 font-mono">Gujarat Infrastructure Finance Protocol</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Lifecycle Financial Management</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Audit capital expenditures, rehabilitation contracts, and operational outlays with immutable double-entry transaction integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'FINANCE_OFFICER') && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Post Transaction
            </button>
          )}
        </div>
      </div>

      {/* Financial Breakdown KPIs (Acquisition, Construction, Maintenance, Repair, Operation, Total Lifecycle) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Acquisition Cost</span>
          <div className="text-base font-extrabold text-slate-900 mt-1 font-mono">
            {formatCurrency(b.acquisitionCost || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Capital Baseline</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Construction Cost</span>
          <div className="text-base font-extrabold text-blue-900 mt-1 font-mono">
            {formatCurrency(b.constructionCost || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Civil EPC Contracts</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Maintenance Cost</span>
          <div className="text-base font-extrabold text-amber-700 mt-1 font-mono">
            {formatCurrency(b.maintenanceCost || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Scheduled Upkeep</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Repair Cost</span>
          <div className="text-base font-extrabold text-rose-700 mt-1 font-mono">
            {formatCurrency(b.repairCost || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Corrective & Defect</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Operation Cost</span>
          <div className="text-base font-extrabold text-purple-700 mt-1 font-mono">
            {formatCurrency(b.operationCost || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Running & Utilities</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/20 shadow-sm">
          <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Total Lifecycle (LCC)</span>
          <div className="text-base font-extrabold text-emerald-900 mt-1 font-mono">
            {formatCurrency(totalLifecycleCost)}
          </div>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Cumulative Fiscal Outlay</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Voucher / Reference No, Record ID, Description..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Cost Dimensions</option>
            {FINANCIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Disbursal Statuses</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DISBURSED">DISBURSED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Record & Voucher</th>
                <th className="py-3.5 px-4">Cost Dimension</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Description & Scope</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Transaction Date</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Querying state treasury ledger...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No financial transaction vouchers match criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const assetObj = r.asset || {};
                  const projectObj = r.project || {};
                  const typeColors = {
                    ACQUISITION: 'bg-slate-100 text-slate-800 border-slate-200',
                    CONSTRUCTION: 'bg-blue-100 text-blue-800 border-blue-200',
                    MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
                    REPAIR: 'bg-rose-100 text-rose-800 border-rose-200',
                    OPERATION: 'bg-purple-100 text-purple-800 border-purple-200',
                    DISPOSAL: 'bg-orange-100 text-orange-800 border-orange-200',
                  };

                  return (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-900 block text-xs">
                          {r.recordId}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Ref: {r.referenceNumber || r.invoiceNumber || 'VCH-AUTO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                            typeColors[r.type] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {assetObj.name ? (
                          <button
                            onClick={() => navigate(`/assets/${assetObj._id || assetObj.assetId}`)}
                            className="text-left font-medium text-blue-700 hover:underline flex items-center gap-1 text-xs"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {assetObj.name}
                          </button>
                        ) : projectObj.projectName ? (
                          <span className="text-slate-800 font-medium flex items-center gap-1 text-xs">
                            <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
                            {projectObj.projectName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">General Infrastructure Outlay</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-1">
                          {r.description || 'Infrastructure capital / maintenance allocation'}
                        </p>
                        {r.approvedBy && (
                          <span className="text-[10px] text-slate-400 block">
                            Sanctioned by: {r.approvedBy.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(r.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        {formatDate(r.date || r.transactionDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.status === 'APPROVED' || r.status === 'DISBURSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Transaction Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Post Financial Transaction to State Ledger</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Cost Dimension *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {FINANCIAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Transaction Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Associate Asset
                  </label>
                  <select
                    value={form.asset}
                    onChange={(e) => setForm({ ...form, asset: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- General Outlay --</option>
                    {assets.map((a) => (
                      <option key={a._id} value={a._id}>
                        [{a.assetId}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Associate Project
                  </label>
                  <select
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Standalone Outlay --</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        [{p.projectId}] {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Reference / Voucher / Invoice No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VCH-PWD-2026-891"
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Description / Justification
                </label>
                <textarea
                  rows="2"
                  placeholder="Voucher justification, work order linkage, payment certifier..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financials;
