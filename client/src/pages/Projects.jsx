import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { projectService } from '../services/projectService';
import { assetService } from '../services/assetService';
import { contractorService } from '../services/contractorService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Hammer,
  Sparkles,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react';

const PROJECT_STATUSES = [
  'PROPOSED',
  'APPROVED',
  'UNDER_CONSTRUCTION',
  'COMPLETED',
  'COMMISSIONED',
  'CANCELLED',
];

const MILESTONE_STEPS = [
  'Planning',
  'Approval',
  'Construction',
  'Inspection',
  'Completion',
  'Commissioning',
];

const Projects = () => {
  const { user, hasRole } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [contractors, setContractors] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Project Form
  const [createForm, setCreateForm] = useState({
    projectName: '',
    description: '',
    department: '',
    contractor: '',
    estimatedCost: '',
    approvedBudget: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedCompletion: '',
    status: 'PROPOSED',
    city: 'Surat',
    district: 'Surat',
    address: '',
  });

  // Commission Asset Form
  const [assetForm, setAssetForm] = useState({
    category: 'TRANSPORT',
    assetType: 'Bridge',
    expectedLifeYears: 50,
    latitude: '21.1702',
    longitude: '72.8311',
    description: '',
  });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.departmentId = deptFilter;
      if (search) params.search = search;

      const res = await projectService.getProjects(params);
      setProjects(res.data || []);
    } catch (err) {
      showError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [dRes, cRes] = await Promise.all([
          assetService.getDepartments().catch(() => ({ data: [] })),
          contractorService.getContractors().catch(() => ({ data: [] })),
        ]);
        setDepartments(dRes.data || []);
        setContractors(cRes.data || []);
      } catch (err) {
        console.error('Metadata load error:', err);
      }
    };
    loadMetadata();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.projectName || !createForm.department) {
      showError('Project name and department are required.');
      return;
    }

    try {
      setSubmitting(true);
      await projectService.createProject({
        ...createForm,
        location: {
          address: createForm.address,
          city: createForm.city,
          district: createForm.district,
          state: 'Gujarat',
        },
      });
      showSuccess('Capital project proposed and added to state infrastructure pipeline.');
      setCreateModalOpen(false);
      setCreateForm({
        projectName: '',
        description: '',
        department: '',
        contractor: '',
        estimatedCost: '',
        approvedBudget: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedCompletion: '',
        status: 'PROPOSED',
        city: 'Surat',
        district: 'Surat',
        address: '',
      });
      fetchProjects();
    } catch (err) {
      showError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = (proj) => {
    setSelectedProject(proj);
    setDetailModalOpen(true);
  };

  const handleOpenCommission = (proj) => {
    setSelectedProject(proj);
    setAssetForm({
      category: 'TRANSPORT',
      assetType: 'Bridge',
      expectedLifeYears: 50,
      latitude: '21.1702',
      longitude: '72.8311',
      description: `Inaugurated public asset from project ${proj.projectId} ("${proj.projectName}")`,
    });
    setCommissionModalOpen(true);
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setSubmitting(true);
      const res = await projectService.createAssetFromProject(selectedProject._id, assetForm);
      showSuccess(`Digital Asset ${res.data?.asset?.assetId} successfully commissioned!`);
      setCommissionModalOpen(false);
      setDetailModalOpen(false);
      fetchProjects();
      if (res.data?.asset?._id) {
        navigate(`/assets/${res.data.asset._id}`);
      }
    } catch (err) {
      showError(err.message || 'Asset commissioning failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceMilestone = async (proj, milestoneName) => {
    try {
      setSubmitting(true);
      await projectService.updateProject(proj._id, {
        milestoneUpdate: {
          milestoneName,
          status: 'COMPLETED',
          notes: `Certified completed by ${user?.name || 'Superintending Engineer'}`,
        },
      });
      showSuccess(`Milestone "${milestoneName}" marked completed.`);
      fetchProjects();
      if (selectedProject && selectedProject._id === proj._id) {
        const refreshed = await projectService.getProjectById(proj._id);
        setSelectedProject(refreshed.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to update milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (proj, newStatus) => {
    try {
      setSubmitting(true);
      await projectService.updateProject(proj._id, { status: newStatus });
      showSuccess(`Project status transitioned to ${newStatus}.`);
      fetchProjects();
      if (selectedProject && selectedProject._id === proj._id) {
        setSelectedProject({ ...selectedProject, status: newStatus });
      }
    } catch (err) {
      showError(err.message || 'Failed to transition status');
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalCount = projects.length;
  const underConstruction = projects.filter((p) => p.status === 'UNDER_CONSTRUCTION').length;
  const completedOrCommissioned = projects.filter((p) => ['COMPLETED', 'COMMISSIONED'].includes(p.status)).length;
  const totalOutlay = projects.reduce((sum, p) => sum + (p.approvedBudget || p.budget || p.estimatedCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200">
              CAPITAL WORKS & INFRASTRUCTURE PIPELINE
            </span>
            <span className="text-xs text-slate-500 font-mono">Vision 2030 Capital Plan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Capital Project Management</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Oversee infrastructure projects from initial sanction through EPC execution, completion verification, and formal asset commissioning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjects}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh projects"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'ENGINEER') && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Propose New Project
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Sanctioned</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Under Construction</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{underConstruction}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Hammer className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Completed & Commissioned</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedOrCommissioned}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Capital Outlay (Approved)</p>
            <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalOutlay)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
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
            placeholder="Search by Project ID, Name, Description..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Project Statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Project ID</th>
                <th className="py-3.5 px-4">Project Details & Department</th>
                <th className="py-3.5 px-4">Sanctioned Budget</th>
                <th className="py-3.5 px-4">Contractor / EPC Firm</th>
                <th className="py-3.5 px-4">Lifecycle Milestone</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading capital projects pipeline...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <FolderKanban className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No capital projects registered matching criteria.
                  </td>
                </tr>
              ) : (
                projects.map((proj) => {
                  const completedMilestones = (proj.milestones || []).filter((m) => m.status === 'COMPLETED').length;
                  const isCommissionReady = ['COMPLETED', 'COMMISSIONED', 'UNDER_CONSTRUCTION'].includes(proj.status);
                  const hasAsset = Boolean(proj.createdAsset);

                  return (
                    <tr key={proj._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-900">
                        {proj.projectId || proj.projectCode}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <button
                          onClick={() => handleOpenDetail(proj)}
                          className="font-semibold text-slate-900 hover:text-blue-700 text-left line-clamp-1 block"
                        >
                          {proj.projectName || proj.name}
                        </button>
                        <span className="text-xs text-slate-500 block font-mono">
                          {proj.department?.name || 'State Infrastructure Board'} ({proj.department?.code || 'PWD'})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-slate-900 text-xs">
                          {formatCurrency(proj.approvedBudget || proj.budget || proj.estimatedCost)}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          Est: {formatCurrency(proj.estimatedCost)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-800 font-medium block">
                          {proj.contractor?.company || proj.contractor?.companyName || 'In-House PWD Team'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {proj.contractor?.registrationNumber || 'Class A Empanelled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {completedMilestones}/6 Done
                          </span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${(completedMilestones / 6) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Next: {proj.milestones?.find((m) => m.status !== 'COMPLETED')?.name || 'Fully Executed'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            proj.status === 'COMMISSIONED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : proj.status === 'COMPLETED'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : proj.status === 'UNDER_CONSTRUCTION'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : proj.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {proj.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasAsset ? (
                            <button
                              onClick={() => navigate(`/assets/${proj.createdAsset._id || proj.createdAsset}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                              title="View Commissioned Asset Passport"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              View Passport
                            </button>
                          ) : isCommissionReady && hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'ENGINEER') ? (
                            <button
                              onClick={() => handleOpenCommission(proj)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
                              title="Commission Asset from this Project"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Create Asset
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleOpenDetail(proj)}
                            className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                          >
                            Manage
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

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-700" />
                <h3 className="font-semibold text-slate-900">Propose New Capital Infrastructure Project</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Project Title / Scope *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ring Road Phase-2 Flyover and Junction Remodeling"
                  value={createForm.projectName}
                  onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Jurisdictional Department *
                  </label>
                  <select
                    required
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    EPC Contractor
                  </label>
                  <select
                    value={createForm.contractor}
                    onChange={(e) => setCreateForm({ ...createForm, contractor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Assign Later --</option>
                    {contractors.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.company || c.companyName} ({c.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000000"
                    value={createForm.estimatedCost}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Approved Sanctioned Budget (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 48000000"
                    value={createForm.approvedBudget}
                    onChange={(e) => setCreateForm({ ...createForm, approvedBudget: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Commencement Date
                  </label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={createForm.expectedCompletion}
                    onChange={(e) => setCreateForm({ ...createForm, expectedCompletion: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Location Site Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Katargam - Amroli Tapi River Cross-Corridor"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Detailed Scope & Justification
                </label>
                <textarea
                  rows="3"
                  placeholder="Engineering justification, DPR references, traffic impact assessment..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
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
                  {submitting ? 'Sanctioning...' : 'Sanction Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail & Milestone Management Modal */}
      {detailModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-blue-400 font-bold">
                    {selectedProject.projectId || selectedProject.projectCode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900 text-blue-200 border border-blue-700">
                    {selectedProject.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedProject.projectName || selectedProject.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Financial & General Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Department</span>
                  <span className="font-bold text-slate-800">
                    {selectedProject.department?.name || 'PWD'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Approved Outlay</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {formatCurrency(selectedProject.approvedBudget || selectedProject.budget)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Commencement</span>
                  <span className="font-semibold text-slate-800">
                    {selectedProject.startDate ? formatDate(selectedProject.startDate) : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Contractor</span>
                  <span className="font-semibold text-slate-800">
                    {selectedProject.contractor?.company || selectedProject.contractor?.companyName || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Six Standard Milestones Progression */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Capital Execution Milestones (6 Stages)</span>
                  <span className="text-xs font-normal text-slate-500 font-mono">
                    ISO 55000 / PWD Compliance
                  </span>
                </h4>
                <div className="space-y-2">
                  {MILESTONE_STEPS.map((stepName, i) => {
                    const milestone = (selectedProject.milestones || []).find((m) => m.name === stepName);
                    const isDone = milestone?.status === 'COMPLETED';

                    return (
                      <div
                        key={stepName}
                        className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                          isDone
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isDone ? '✓' : i + 1}
                          </span>
                          <div>
                            <span className="font-bold block text-sm">{stepName}</span>
                            <span className="text-[11px] text-slate-500">
                              {isDone
                                ? `Completed on ${formatDate(milestone.completedAt || new Date())}`
                                : 'Pending certification'}
                            </span>
                          </div>
                        </div>

                        {!isDone && hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'ENGINEER') && (
                          <button
                            onClick={() => handleAdvanceMilestone(selectedProject, stepName)}
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs"
                          >
                            Certify Complete
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Transition & Asset Commissioning Action Bar */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <span className="font-bold text-blue-900 uppercase tracking-wider block">
                  Project Lifecycle Governance Actions
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedProject.status === 'PROPOSED' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject, 'APPROVED')}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-xs shadow-sm"
                    >
                      Grant Official Approval
                    </button>
                  )}

                  {selectedProject.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject, 'UNDER_CONSTRUCTION')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs shadow-sm"
                    >
                      Commence Construction
                    </button>
                  )}

                  {selectedProject.status === 'UNDER_CONSTRUCTION' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject, 'COMPLETED')}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-xs shadow-sm"
                    >
                      Certify Construction Completed
                    </button>
                  )}

                  {!selectedProject.createdAsset &&
                    ['COMPLETED', 'COMMISSIONED', 'UNDER_CONSTRUCTION'].includes(selectedProject.status) && (
                      <button
                        onClick={() => handleOpenCommission(selectedProject)}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-xs shadow-sm flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Commission Digital Asset (Create Asset)
                      </button>
                    )}

                  {selectedProject.createdAsset && (
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        navigate(`/assets/${selectedProject.createdAsset._id || selectedProject.createdAsset}`);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium rounded-lg text-xs shadow-2xs flex items-center gap-1.5 ml-auto"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-700" />
                      Open Asset Digital Passport
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Asset ("Create Asset") Modal */}
      {commissionModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-semibold text-white">Commission Digital Infrastructure Asset</h3>
                  <span className="text-xs text-emerald-200 font-mono">
                    Project: {selectedProject.projectId} - {selectedProject.projectName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCommissionModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCommissionSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-900">
                This action creates an authoritative digital asset record linked to Project{' '}
                <strong>{selectedProject.projectId}</strong>, initializes health score at 100%, and records both{' '}
                <code>ASSET_CREATED</code> and <code>ASSET_COMMISSIONED</code> in the permanent state lifecycle ledger.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Asset Category *
                  </label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="BUILDINGS">BUILDINGS</option>
                    <option value="WATER">WATER</option>
                    <option value="ENERGY">ENERGY</option>
                    <option value="LAND">LAND</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Asset Type *
                  </label>
                  <select
                    value={assetForm.assetType}
                    onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Bridge">Bridge</option>
                    <option value="Road">Road</option>
                    <option value="Culvert">Culvert</option>
                    <option value="Treatment Plant">Treatment Plant</option>
                    <option value="Pipeline">Pipeline</option>
                    <option value="Solar Plant">Solar Plant</option>
                    <option value="Government Office">Government Office</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Design Service Life
                  </label>
                  <input
                    type="number"
                    value={assetForm.expectedLifeYears}
                    onChange={(e) => setAssetForm({ ...assetForm, expectedLifeYears: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Site Latitude
                  </label>
                  <input
                    type="text"
                    value={assetForm.latitude}
                    onChange={(e) => setAssetForm({ ...assetForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Site Longitude
                  </label>
                  <input
                    type="text"
                    value={assetForm.longitude}
                    onChange={(e) => setAssetForm({ ...assetForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Commissioning Inscription / Description
                </label>
                <textarea
                  rows="2"
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCommissionModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Commissioning...' : 'Confirm & Commission Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
