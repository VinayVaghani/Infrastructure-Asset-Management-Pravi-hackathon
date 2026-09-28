import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { inspectionService } from '../services/inspectionService';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Calendar,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

const Inspections = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const res = await inspectionService.getInspections({
        page,
        limit: 15,
        search: search || undefined,
        condition: conditionFilter || undefined,
        status: statusFilter || undefined,
      });
      setInspections(res.data || []);
      setTotal(res.pagination?.total || (res.data ? res.data.length : 0));
    } catch (err) {
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [page, conditionFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInspections();
  };

  const handleViewChecklist = (insp) => {
    setSelectedInspection(insp);
    setModalOpen(true);
  };

  const columns = [
    {
      header: 'Inspection No.',
      key: 'inspectionNumber',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {r.inspectionNumber}
        </span>
      ),
    },
    {
      header: 'Asset Code & Facility',
      key: 'asset',
      render: (r) => {
        const assetObj = r.asset || {};
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded font-bold border border-blue-200">
                {assetObj.assetId || 'ASSET-ID'}
              </span>
              <Link
                to={`/assets/${assetObj._id || assetObj.assetId}`}
                className="text-xs font-bold text-slate-800 hover:text-blue-900 hover:underline flex items-center gap-1"
              >
                {assetObj.name || 'Infrastructure Asset'}
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </Link>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {assetObj.category} &bull; {assetObj.location?.district || assetObj.location?.city || 'Gujarat'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Inspector',
      key: 'inspector',
      render: (r) => (
        <span className="text-xs text-slate-700 font-medium">
          {r.inspector?.name || r.inspectorName || 'QC Certifier'}
        </span>
      ),
    },
    {
      header: 'Date Conducted',
      key: 'conductedDate',
      render: (r) => (
        <span className="text-xs text-slate-600 font-mono">
          {r.conductedDate ? formatDate(r.conductedDate) : 'Scheduled'}
        </span>
      ),
    },
    {
      header: 'Assessed Condition',
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
              r.score >= 90
                ? 'text-emerald-700'
                : r.score >= 75
                ? 'text-teal-700'
                : r.score >= 50
                ? 'text-amber-700'
                : r.score >= 25
                ? 'text-orange-700'
                : 'text-rose-700'
            }`}
          >
            {r.score}%
          </span>
          <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                r.score >= 90
                  ? 'bg-emerald-500'
                  : r.score >= 75
                  ? 'bg-teal-500'
                  : r.score >= 50
                  ? 'bg-amber-500'
                  : r.score >= 25
                  ? 'bg-orange-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, r.score))}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Audit Status',
      key: 'status',
      render: (r) => <StatusBadge status={r.status || 'COMPLETED'} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => handleViewChecklist(r)}>
            Audit Report
          </Button>
          <Link to={`/assets/${r.asset?._id || r.asset}/inspect`}>
            <Button size="sm" variant="ghost" title="Re-inspect asset">
              <ClipboardCheck className="w-3.5 h-3.5 text-blue-900" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Quality & Structural Inspections"
          subtitle="Mandatory periodic engineering audits, condition scoring, and health indices"
          breadcrumbs={[{ label: 'Inspections' }]}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchInspections}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/inspections/new')}
          >
            Conduct Inspection
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search inspection number, remarks, defect..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Assessed Conditions</option>
                <option value="EXCELLENT">EXCELLENT (90-100)</option>
                <option value="GOOD">GOOD (75-89)</option>
                <option value="MODERATE">MODERATE (50-74)</option>
                <option value="POOR">POOR (25-49)</option>
                <option value="CRITICAL">CRITICAL (0-24)</option>
              </select>

              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
              </select>

              <Button type="submit" size="sm" variant="secondary">
                Filter
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Table Container */}
      <Table
        columns={columns}
        data={inspections}
        loading={loading}
        emptyMessage="No inspection records found matching criteria."
      />

      {/* Inspection Detailed Audit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedInspection?.inspectionNumber || 'Certified Inspection Audit Record'}
        subtitle={`Target Asset: ${selectedInspection?.asset?.name || selectedInspection?.assetName || 'State Asset'}`}
        maxWidth="max-w-2xl"
      >
        {selectedInspection && (
          <div className="space-y-4 text-xs">
            {/* Condition Banner */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge condition={selectedInspection.overallCondition} type="condition" />
                <span className="text-slate-600 font-medium">
                  Health Index:{' '}
                  <strong className="text-slate-900 font-mono text-sm">{selectedInspection.score}%</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Audited: {selectedInspection.conductedDate ? formatDate(selectedInspection.conductedDate) : 'Pending'}
              </div>
            </div>

            {/* Sub-Score Breakdown */}
            {selectedInspection.conditionScores && (
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[10px]">
                  Component Scoring Breakdown (30 / 20 / 20 / 15 / 15 Weighting Model)
                </h4>
                <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Structural (30%)</span>
                    <strong className="font-mono text-slate-800">{selectedInspection.conditionScores.structuralScore || selectedInspection.score}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Surface (20%)</span>
                    <strong className="font-mono text-slate-800">{selectedInspection.conditionScores.surfaceScore || selectedInspection.score}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Safety (20%)</span>
                    <strong className="font-mono text-slate-800">{selectedInspection.conditionScores.safetyScore || selectedInspection.score}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Ops (15%)</span>
                    <strong className="font-mono text-slate-800">{selectedInspection.conditionScores.operationalScore || selectedInspection.score}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Age Risk (15%)</span>
                    <strong className="font-mono text-slate-800">{selectedInspection.conditionScores.ageFactorScore || 85}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Observations & Field Notes */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">Inspector Field Observations:</div>
              <p className="text-slate-600 leading-relaxed italic">
                {selectedInspection.observations || selectedInspection.remarks || 'No detailed remarks noted during routine audit.'}
              </p>
            </div>

            {/* Recommendations */}
            {selectedInspection.recommendations && (
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-900 mb-1">Engineering Recommendations:</div>
                <p className="text-slate-700 leading-relaxed">{selectedInspection.recommendations}</p>
              </div>
            )}

            {/* Defects List */}
            {selectedInspection.defects && selectedInspection.defects.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[10px]">
                  Logged Structural Defects ({selectedInspection.defects.length})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {selectedInspection.defects.map((def, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-medium">
                        {typeof def === 'string' ? def : def.description}
                      </span>
                      {def.severity && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            def.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : def.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {def.severity}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Inspection Date */}
            {selectedInspection.nextInspectionDate && (
              <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded text-slate-700">
                <span className="font-semibold text-[11px]">Mandatory Next Cycle Due:</span>
                <span className="font-mono font-bold text-xs text-blue-900">
                  {formatDate(selectedInspection.nextInspectionDate)}
                </span>
              </div>
            )}

            {/* Application Disclaimer Note */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic pt-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span>
                Note: Evaluated condition ratings are configurable application/demo thresholds for predictive infrastructure simulation.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inspections;
