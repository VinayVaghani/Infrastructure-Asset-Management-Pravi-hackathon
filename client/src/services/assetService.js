import api from './api';

export const assetService = {
  // Inventory query with search, filters, sorting, pagination
  getAssets: async (params = {}) => {
    const res = await api.get('/assets', { params });
    return res.data;
  },

  // Single asset passport
  getAssetById: async (id) => {
    const res = await api.get(`/assets/${id}`);
    return res.data;
  },

  // Asset CRUD
  createAsset: async (data) => {
    const res = await api.post('/assets', data);
    return res.data;
  },

  updateAsset: async (id, data) => {
    const res = await api.put(`/assets/${id}`, data);
    return res.data;
  },

  deleteAsset: async (id) => {
    const res = await api.delete(`/assets/${id}`);
    return res.data;
  },

  // Passport Sub-Resources
  getLifecycle: async (id) => {
    const res = await api.get(`/assets/${id}/lifecycle`);
    return res.data;
  },

  getInspections: async (id) => {
    const res = await api.get(`/assets/${id}/inspections`);
    return res.data;
  },

  getMaintenance: async (id) => {
    const res = await api.get(`/assets/${id}/maintenance`);
    return res.data;
  },

  getWorkOrders: async (id) => {
    const res = await api.get(`/assets/${id}/work-orders`);
    return res.data;
  },

  getDocuments: async (id) => {
    const res = await api.get(`/assets/${id}/documents`);
    return res.data;
  },

  getAudit: async (id) => {
    const res = await api.get(`/assets/${id}/audit`);
    return res.data;
  },

  getIssues: async (id) => {
    const res = await api.get(`/assets/${id}/issues`);
    return res.data;
  },

  getFinancials: async (id) => {
    const res = await api.get(`/assets/${id}/financials`);
    return res.data;
  },

  // Actions
  transferAsset: async (id, data) => {
    const res = await api.post(`/assets/${id}/transfer`, data);
    return res.data;
  },

  createIssue: async (id, data) => {
    const res = await api.post(`/assets/${id}/issues`, data);
    return res.data;
  },

  createWorkOrder: async (id, data) => {
    const res = await api.post(`/assets/${id}/work-orders`, data);
    return res.data;
  },

  createInspection: async (id, data) => {
    const res = await api.post(`/assets/${id}/inspections`, data);
    return res.data;
  },

  createDocument: async (id, data) => {
    const res = await api.post(`/assets/${id}/documents`, data);
    return res.data;
  },

  // Meta helpers
  getDepartments: async () => {
    const res = await api.get('/departments');
    return res.data;
  },

  getOfficers: async () => {
    const res = await api.get('/departments/officers');
    return res.data;
  },
};

export default assetService;
