import api from './api';

export const workOrderService = {
  getWorkOrders: async (params = {}) => {
    const res = await api.get('/work-orders', { params });
    return res.data;
  },

  getWorkOrderById: async (id) => {
    const res = await api.get(`/work-orders/${id}`);
    return res.data;
  },

  createWorkOrder: async (data) => {
    const res = await api.post('/work-orders', data);
    return res.data;
  },

  updateWorkOrder: async (id, data) => {
    const res = await api.put(`/work-orders/${id}`, data);
    return res.data;
  },
};

export default workOrderService;
