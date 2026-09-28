import api from './api';

export const documentService = {
  getDocuments: async (params = {}) => {
    const res = await api.get('/documents', { params });
    return res.data;
  },

  getDocumentById: async (id) => {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  createDocument: async (data) => {
    const res = await api.post('/documents', data);
    return res.data;
  },

  deleteDocument: async (id) => {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },
};
