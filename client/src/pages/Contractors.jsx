import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { contractorService } from '../services/contractorService';
import {
  HardHat,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ExternalLink,
  Layers,
} from 'lucide-react';

const Contractors = () => {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [contractorDetail, setContractorDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    registrationNumber: '',
    email: '',
    phone: '',
    address: '',
    status: 'ACTIVE',
    specializations: '',
  });

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contractorService.getContractors({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setContractors(res.data || []);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const handleOpenDetail = async (contractor) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const res = await contractorService.getContractorById(contractor._id);
      setContractorDetail(res.data);
    } catch (err) {
      console.error('Failed to load contractor detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!formData.companyName || !formData.registrationNumber || !formData.email || !formData.phone) {
      setErrorMessage('Please fill in company name, registration number, email, and phone.');
      return;
    }

    setSubmitting(true);
    try {
      await contractorService.createContractor({
        ...formData,
        name: formData.contactPerson,
        company: formData.companyName,
        specializations: formData.specializations
          ? formData.specializations.split(',').map((s) => s.trim())
          : [],
      });
      setCreateModalOpen(false);
      setFormData({
        companyName: '',
        contactPerson: '',
        registrationNumber: '',
        email: '',
        phone: '',
        address: '',
        status: 'ACTIVE',
        specializations: '',
      });
      fetchContractors();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to register contractor firm.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Company / Registration',
      key: 'companyName',
      render: (r) => (
        <div>
          <div className="font-bold text-xs text-slate-800">{r.companyName || r.company}</div>
          <div className="text-[11px] font-mono text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-blue-200">
            {r.registrationNumber}
          </div>
        </div>
      ),
    },
    {
      header: 'Representative (Name)',
      key: 'contactPerson',
      render: (r) => (
        <div>
          <div className="text-xs text-slate-800 font-semibold">{r.contactPerson || r.name}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-2.5 h-2.5 text-slate-400" />
            <span>{r.phone}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact Email',
      key: 'email',
      render: (r) => (
        <span className="text-xs text-slate-600 font-mono flex items-center gap-1">
          <Mail className="w-3 h-3 text-slate-400" />
          {r.email}
        </span>
      ),
    },
    {
      header: 'Address / Base',
      key: 'address',
      render: (r) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-xs">{r.address || 'Gujarat, India'}</span>
      ),
    },
    {
      header: 'Active Orders',
      key: 'activeOrders',
      render: (r) => (
        <span className="text-xs font-mono font-bold text-blue-900">
          {r.activeWorkOrdersCount || 0} active
        </span>
      ),
    },
    {
      header: 'Completed Orders',
      key: 'completedOrders',
      render: (r) => (
        <span className="text-xs font-mono font-bold text-emerald-800">
          {r.completedWorkOrdersCount || 0} completed
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            r.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {r.status || 'ACTIVE'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenDetail(r)}>
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Contractor & Vendor Registry"
          subtitle="Empaneled infrastructure engineering contractors, civil construction firms, and maintenance partners"
          breadcrumbs={[{ label: 'Contractors' }]}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchContractors} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            Empanel Contractor
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search contractor company, representative, registration number..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Table columns={columns} data={contractors} loading={loading} emptyMessage="No contractors found." />

      {/* EMPANEL CONTRACTOR MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Empanel Infrastructure Contractor"
        subtitle="Register licensed vendor for public work orders and maintenance tenders"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800">{errorMessage}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company / Firm Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Infrastructure & Civil Engineering Ltd"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Registration / License Number *
              </label>
              <input
                type="text"
                placeholder="e.g. GJ-PWD-CL1-2024-0091"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Authorized Name *
              </label>
              <input
                type="text"
                placeholder="Key Representative Name"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Official Email *</label>
              <input
                type="email"
                placeholder="contact@company.gov.in"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number *</label>
              <input
                type="tel"
                placeholder="+91 98250 XXXXX"
                className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Office Address</label>
            <input
              type="text"
              placeholder="Corporate headquarters or regional branch office address"
              className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Engineering Specializations (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Prestressed Concrete, Cable Stayed Bridges, Solar Grids"
              className="w-full rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800"
              value={formData.specializations}
              onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Empanel Firm
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONTRACTOR DETAIL PROFILE MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={contractorDetail?.contractor?.companyName || contractorDetail?.contractor?.company || 'Contractor Profile'}
        subtitle={`Registration: ${contractorDetail?.contractor?.registrationNumber || 'N/A'}`}
        maxWidth="max-w-3xl"
      >
        {loadingDetail || !contractorDetail ? (
          <div className="py-12 text-center text-slate-500">Loading contractor telemetry...</div>
        ) : (
          <div className="space-y-5 text-xs">
            {/* Contact Particulars Bar */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Representative (Name)</span>
                <span className="font-semibold text-slate-800">
                  {contractorDetail.contractor.contactPerson || contractorDetail.contractor.name}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">{contractorDetail.contractor.phone}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact Email</span>
                <span className="font-semibold text-slate-800 font-mono">{contractorDetail.contractor.email}</span>
                <div className="text-[10px] text-slate-500 mt-0.5">Status: <strong className="text-emerald-700">{contractorDetail.contractor.status}</strong></div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Registered Address</span>
                <span className="text-slate-700 leading-snug">{contractorDetail.contractor.address || 'Gujarat, India'}</span>
              </div>
            </div>

            {/* Live Operational Metrics (Strictly Real Data, No Arbitrary Ranking) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-700 uppercase font-bold block">Active Orders</span>
                <span className="font-mono text-base font-black text-blue-900 mt-0.5">
                  {contractorDetail.metrics.activeWorkOrdersCount}
                </span>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Completed</span>
                <span className="font-mono text-base font-black text-emerald-800 mt-0.5">
                  {contractorDetail.metrics.completedWorkOrdersCount}
                </span>
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-[10px] text-rose-700 uppercase font-bold block">Overdue</span>
                <span className="font-mono text-base font-black text-rose-800 mt-0.5">
                  {contractorDetail.metrics.overdueWorkOrdersCount}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-700 uppercase font-bold block">Total Contract Value</span>
                <span className="font-mono text-xs font-black text-slate-900 mt-0.5">
                  {formatCurrency(contractorDetail.metrics.totalContractValue)}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-700 uppercase font-bold block">Assigned Assets</span>
                <span className="font-mono text-base font-black text-slate-900 mt-0.5">
                  {contractorDetail.metrics.assignedAssetsCount}
                </span>
              </div>
            </div>

            {/* Active Work Orders Table */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-900" />
                Active Work Orders ({contractorDetail.activeWorkOrders.length})
              </h4>
              {contractorDetail.activeWorkOrders.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-slate-400">
                  No currently active work orders allocated to this firm.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  {contractorDetail.activeWorkOrders.map((wo) => (
                    <div key={wo._id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded font-bold">
                            {wo.workOrderId || wo.orderNumber}
                          </span>
                          <span className="font-semibold text-slate-800">{wo.title}</span>
                          <StatusBadge status={wo.status} />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Asset: {wo.asset?.name || 'Asset'} &bull; Due: {wo.dueDate ? formatDate(wo.dueDate) : 'N/A'}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {formatCurrency(wo.actualCost || wo.estimatedCost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Assets Directory */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-900" />
                Assigned Assets Portfolio ({contractorDetail.assignedAssets.length})
              </h4>
              {contractorDetail.assignedAssets.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-slate-400">
                  No assets currently linked.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contractorDetail.assignedAssets.map((asset) => (
                    <div key={asset._id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-blue-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {asset.assetId}
                        </span>
                        <div className="font-semibold text-slate-800 mt-1">{asset.name}</div>
                        <div className="text-[10px] text-slate-500">{asset.category} &bull; Health: {asset.healthScore}%</div>
                      </div>
                      <Link to={`/assets/${asset._id}`} className="text-blue-900 hover:text-blue-950 p-1">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contractors;
