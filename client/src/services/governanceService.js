import api from './api';

export const governanceService = {
  getDataQualitySummary: async () => {
    const res = await api.get('/governance/data-quality');
    return res.data;
  },

  getAssetDataQuality: async (assetId) => {
    const res = await api.get(`/governance/data-quality/${assetId}`);
    return res.data;
  },

  getDuplicates: async () => {
    const res = await api.get('/governance/duplicates');
    return res.data;
  },

  mergeDuplicates: async (primaryAssetId, secondaryAssetId) => {
    const res = await api.post('/governance/duplicates/merge', {
      primaryAssetId,
      secondaryAssetId,
    });
    return res.data;
  },
};
