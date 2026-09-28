import api from './api';

export const maintenanceService = {
  getMaintenanceRecords: async (params = {}) => {
    const res = await api.get('/maintenance', { params });
    return res.data;
  },

  getMaintenanceRecordById: async (id) => {
    const res = await api.get(`/maintenance/${id}`);
    return res.data;
  },

  createMaintenanceRecord: async (data) => {
    const res = await api.post('/maintenance', data);
    return res.data;
  },

  updateMaintenanceRecord: async (id, data) => {
    const res = await api.put(`/maintenance/${id}`, data);
    return res.data;
  },
};

export default maintenanceService;
