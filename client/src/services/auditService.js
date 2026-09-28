import api from './api';

export const auditService = {
  getAuditLogs: async (params = {}) => {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  },
};
