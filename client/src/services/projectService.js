import api from './api';

export const projectService = {
  getProjects: async (params = {}) => {
    const res = await api.get('/projects', { params });
    return res.data;
  },

  getProjectById: async (id) => {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  createProject: async (data) => {
    const res = await api.post('/projects', data);
    return res.data;
  },

  updateProject: async (id, data) => {
    const res = await api.put(`/projects/${id}`, data);
    return res.data;
  },

  createAssetFromProject: async (id, data) => {
    const res = await api.post(`/projects/${id}/create-asset`, data);
    return res.data;
  },
};
