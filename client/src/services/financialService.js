import api from './api';

export const financialService = {
  getFinancialRecords: async (params = {}) => {
    const res = await api.get('/financials', { params });
    return res.data;
  },

  getFinancialSummary: async (params = {}) => {
    const res = await api.get('/financials/summary', { params });
    return res.data;
  },

  createFinancialRecord: async (data) => {
    const res = await api.post('/financials', data);
    return res.data;
  },
};
