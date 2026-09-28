import api from './api';

export const inspectionService = {
  getInspections: async (params = {}) => {
    const res = await api.get('/inspections', { params });
    return res.data;
  },

  getInspectionById: async (id) => {
    const res = await api.get(`/inspections/${id}`);
    return res.data;
  },

  createInspection: async (data) => {
    const res = await api.post('/inspections', data);
    return res.data;
  },

  updateInspection: async (id, data) => {
    const res = await api.put(`/inspections/${id}`, data);
    return res.data;
  },
};

export default inspectionService;
