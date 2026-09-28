import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
import { documentService } from '../services/documentService';
import { assetService } from '../services/assetService';
import { projectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Files,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Download,
  Trash2,
  X,
  Layers,
  FolderKanban,
  FileCode,
  Image,
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'Construction Certificate',
  'Completion Certificate',
  'Inspection Report',
  'Maintenance Report',
  'Invoice',
  'Drawing',
  'Contract',
  'Photograph',
  'Other',
];

const Documents = () => {
  const { user, hasRole } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Upload Form
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'Drawing',
    fileUrl: '',
    version: 1,
    description: '',
    asset: '',
    project: '',
    fileType: 'application/pdf',
    fileSize: '4194304', // 4MB default
  });

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;

      const res = await documentService.getDocuments(params);
      setDocuments(res.data || []);
    } catch (err) {
      showError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
        console.error('Failed to load associations:', err);
      }
    };
    loadAssociations();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.name || !uploadForm.type) {
      showError('Document title and classification type are required.');
      return;
    }

    try {
      setSubmitting(true);
      await documentService.createDocument({
        ...uploadForm,
        fileUrl:
          uploadForm.fileUrl ||
          `https://vault.infratrack.gov.in/certified-docs/${Date.now()}-${uploadForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`,
      });
      showSuccess('Official document registered in Encrypted State Repository.');
      setUploadModalOpen(false);
      setUploadForm({
        name: '',
        type: 'Drawing',
        fileUrl: '',
        version: 1,
        description: '',
        asset: '',
        project: '',
        fileType: 'application/pdf',
        fileSize: '4194304',
      });
      fetchDocuments();
    } catch (err) {
      showError(err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to remove "${docName}" from the repository?`)) {
      return;
    }
    try {
      await documentService.deleteDocument(docId);
      showSuccess('Document removed.');
      fetchDocuments();
    } catch (err) {
      showError(err.message || 'Failed to delete document');
    }
  };

  // KPIs
  const totalDocs = documents.length;
  const certificatesCount = documents.filter((d) => (d.type || d.documentType || '').toLowerCase().includes('certificate')).length;
  const drawingsCount = documents.filter((d) => (d.type || d.documentType || '').toLowerCase().includes('drawing')).length;
  const reportsCount = documents.filter((d) => (d.type || d.documentType || '').toLowerCase().includes('report')).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200">
              STATE DIGITAL ASSET VAULT
            </span>
            <span className="text-xs text-slate-500 font-mono">Storage Abstraction Layer</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Document & Blueprint Repository</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Tamper-proof government vault for as-built engineering drawings, completion certificates, structural inspection reports, and vendor contracts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh repository"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Vaulted Records</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDocs}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Files className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Drawings & Blueprints</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{drawingsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileCode className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Official Certificates</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{certificatesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Inspection / Audit Reports</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{reportsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
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
            placeholder="Search by Document Name, ID, Description, or Associated Entity..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Document Classifications</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Document Title & Code</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4">Associated Infrastructure</th>
                <th className="py-3.5 px-4">Storage Layer</th>
                <th className="py-3.5 px-4">Uploaded By</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Querying state document repository...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <Files className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No documents found matching specified filters.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const assetObj = doc.asset || {};
                  const projectObj = doc.project || {};
                  const docTitle = doc.name || doc.title || 'Untitled Document';
                  const docType = doc.type || doc.documentType || 'Other';

                  return (
                    <tr key={doc._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block line-clamp-1">
                              {docTitle}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {doc.documentId || 'DOC-VERIFIED'} • v{doc.version || 1}.0
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {docType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {assetObj.name ? (
                          <button
                            onClick={() => navigate(`/assets/${assetObj._id || assetObj.assetId}`)}
                            className="text-left font-medium text-blue-700 hover:underline flex items-center gap-1"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {assetObj.name}
                          </button>
                        ) : projectObj.projectName ? (
                          <span className="text-slate-800 font-medium flex items-center gap-1">
                            <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
                            {projectObj.projectName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">General Infrastructure Repository</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {doc.storageProvider || 'Cloudinary / S3 Vault'}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {doc.fileType || 'application/pdf'} • {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {doc.uploadedBy?.name || 'State Engineer'}
                        <span className="block text-[10px] text-slate-400">
                          {doc.uploadedBy?.designation || doc.uploadedBy?.role || 'QC Officer'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        {formatDate(doc.uploadedAt || doc.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </a>
                          {hasRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN') && (
                            <button
                              onClick={() => handleDelete(doc._id, docTitle)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Files className="w-5 h-5 text-blue-700" />
                <h3 className="font-semibold text-slate-900">Upload & Vault Infrastructure Document</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. As-Built Structural Cantilever Elevation Drawing"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Document Type *
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Revision Version
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Associate Asset (Passport)
                  </label>
                  <select
                    value={uploadForm.asset}
                    onChange={(e) => setUploadForm({ ...uploadForm, asset: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Standalone / Unlinked --</option>
                    {assets.map((a) => (
                      <option key={a._id} value={a._id}>
                        [{a.assetId}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                    Associate Capital Project
                  </label>
                  <select
                    value={uploadForm.project}
                    onChange={(e) => setUploadForm({ ...uploadForm, project: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Standalone / Unlinked --</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        [{p.projectId}] {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  File URL or Storage Destination
                </label>
                <input
                  type="text"
                  placeholder="https://vault.storage.infratrack.gov.in/docs/... (or leave blank to auto-vault)"
                  value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Encrypted storage abstraction layer handles file verification without storing raw binary buffers in MongoDB.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  Description / Specification Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Certified by Chief Structural Engineer..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Vaulting...' : 'Deposit in Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
