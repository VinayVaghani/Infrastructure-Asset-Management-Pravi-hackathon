import api from './api';

export const contractorService = {
  getContractors: async (params = {}) => {
    const res = await api.get('/contractors', { params });
    return res.data;
  },

  getContractorById: async (id) => {
    const res = await api.get(`/contractors/${id}`);
    return res.data;
  },

  createContractor: async (data) => {
    const res = await api.post('/contractors', data);
    return res.data;
  },

  updateContractor: async (id, data) => {
    const res = await api.put(`/contractors/${id}`, data);
    return res.data;
  },
};

export default contractorService;
