import api from './api';

export const issueService = {
  getIssues: async (params = {}) => {
    const res = await api.get('/issues', { params });
    return res.data;
  },

  getIssueById: async (id) => {
    const res = await api.get(`/issues/${id}`);
    return res.data;
  },

  createIssue: async (data) => {
    const res = await api.post('/issues', data);
    return res.data;
  },

  updateIssue: async (id, data) => {
    const res = await api.put(`/issues/${id}`, data);
    return res.data;
  },
};

export default issueService;
