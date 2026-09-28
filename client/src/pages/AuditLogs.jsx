import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import { formatDateTime } from '../utils/formatters';
import { auditService } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Lock,
  Search,
  Filter,
  RefreshCw,
  User,
  Activity,
  Layers,
  Calendar,
  X,
  Eye,
  FileText,
  AlertCircle,
} from 'lucide-react';

const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'APPROVE',
  'ASSIGN',
  'TRANSFER',
  'INSPECT',
  'MAINTAIN',
  'COMPLETE',
  'VERIFY',
  'RETIRE',
];

const ENTITY_TYPES = [
  'Asset',
  'Project',
  'WorkOrder',
  'Inspection',
  'Issue',
  'Maintenance',
  'FinancialRecord',
  'Document',
  'User',
];

const AuditLogs = () => {
  const { user, hasRole } = useAuth();
  const { showError } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log Diff Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (userFilter) params.user = userFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search) params.search = search;

      const res = await auditService.getAuditLogs(params);
      setLogs(res.data || []);
      setTotal(res.pagination?.total || (res.data || []).length);
    } catch (err) {
      showError(err.message || 'Failed to query audit trail');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, userFilter, startDate, endDate, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-900 text-white flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              STATUTORY AUDIT REPOSITORY
            </span>
            <span className="text-xs text-slate-500 font-mono">Immutable Hash-Chained Log</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">State Infrastructure Audit Trail</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Cryptographically sealed and legally immutable chronicle of all modifications, jurisdictional transfers, approvals, and inspections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh audit log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statutory Immutability Disclaimer */}
      <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Under Gujarat Public Records Act & IT Security Standard ISO 27001, audit entries are permanent, non-deletable, and retained indefinitely for judicial accountability.
          </span>
        </div>
        <span className="font-mono text-emerald-400 text-[11px] font-bold hidden sm:inline">
          READ_ONLY_ENFORCED
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Action, Entity, or IP Address..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entity Types</option>
              {ENTITY_TYPES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filter by Officer..."
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-slate-400">Date Range:</span>
          <div className="flex items-center gap-2">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          {(actionFilter || entityFilter || userFilter || startDate || endDate || search) && (
            <button
              onClick={() => {
                setActionFilter('');
                setEntityFilter('');
                setUserFilter('');
                setStartDate('');
                setEndDate('');
                setSearch('');
              }}
              className="text-blue-700 hover:underline font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity Type & ID</th>
                <th className="py-3.5 px-4">Executing Officer</th>
                <th className="py-3.5 px-4">Network IP / Agent</th>
                <th className="py-3.5 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Querying immutable audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 font-sans">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No audit records matching filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const officer = log.performedBy || log.user || {};
                  return (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : log.action === 'CREATE' || log.action === 'ASSET_CREATED_FROM_PROJECT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.action === 'TRANSFER'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : log.action === 'APPROVE' || log.action === 'VERIFY'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 font-sans block">
                          {log.entityType}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ID: {String(log.entityId).slice(0, 18)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {officer.name || 'System Execution Engine'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {officer.role || officer.designation || 'Authority'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect Diff
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-white">
                    Audit Verification Record: {selectedLog.action}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {formatDateTime(selectedLog.timestamp)} • {selectedLog.entityType} ({selectedLog.entityId})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold">Authorized Signatory</span>
                  <span className="font-bold text-slate-800">
                    {selectedLog.performedBy?.name || selectedLog.user?.name || 'Automated Pipeline'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {selectedLog.performedBy?.email || selectedLog.user?.email || 'system@infratrack.gov.in'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Origin IP & Terminal</span>
                  <span className="font-mono text-slate-700">
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono truncate">
                    {selectedLog.userAgent || 'GovNet Terminal'}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Before/After Diffs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    State Before Modification (Old Value)
                  </span>
                  <pre className="p-3 bg-slate-900 text-rose-300 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                    {JSON.stringify(selectedLog.changes?.before || selectedLog.oldValue || 'No previous state (Creation / Inception)', null, 2)}
                  </pre>
                </div>

                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    State After Modification (New Value)
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                    {JSON.stringify(selectedLog.changes?.after || selectedLog.newValue || selectedLog.changes || 'No changes recorded', null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
