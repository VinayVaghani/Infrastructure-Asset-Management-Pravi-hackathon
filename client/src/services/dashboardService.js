import api from './api';

export const dashboardService = {
  getSummary: async () => {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },

  getConditionDistribution: async () => {
    const res = await api.get('/dashboard/condition-distribution');
    return res.data;
  },

  getCategoryDistribution: async () => {
    const res = await api.get('/dashboard/category-distribution');
    return res.data;
  },

  getMaintenanceTrends: async () => {
    const res = await api.get('/dashboard/maintenance-trends');
    return res.data;
  },

  getAlerts: async (params = {}) => {
    const res = await api.get('/dashboard/alerts', { params });
    return res.data;
  },

  resolveAlert: async (id) => {
    const res = await api.patch(`/dashboard/alerts/${id}/resolve`);
    return res.data;
  },
};

export default dashboardService;
