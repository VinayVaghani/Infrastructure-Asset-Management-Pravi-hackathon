const FinancialRecord = require('../models/FinancialRecord');
const Asset = require('../models/Asset');

/**
 * Record a financial transaction for maintenance/work order and update Asset lifecycle costs
 */
const recordFinancialTransaction = async ({
  assetId,
  workOrderId = null,
  maintenanceRecordId = null,
  type = 'MAINTENANCE',
  category = 'MAINTENANCE',
  amount,
  estimatedCost = 0,
  actualCost = 0,
  description = '',
  approvedBy = null,
  invoiceNumber = '',
}) => {
  try {
    const costAmount = Number(amount) || Number(actualCost) || 0;
    const year = new Date().getFullYear();
    const count = await FinancialRecord.countDocuments();
    const recordId = `FIN-${year}-${String(count + 1).padStart(5, '0')}`;

    // 1. Create permanent financial audit record
    const financialRecord = await FinancialRecord.create({
      recordId,
      asset: assetId,
      workOrder: workOrderId,
      maintenanceRecord: maintenanceRecordId,
      type: type === 'CAPEX' ? 'CAPEX' : 'MAINTENANCE',
      category,
      amount: costAmount,
      estimatedCost: Number(estimatedCost) || 0,
      actualCost: Number(actualCost) || costAmount,
      description,
      approvedBy,
      invoiceNumber: invoiceNumber || `INV-${year}-${String(count + 1).padStart(4, '0')}`,
      status: 'APPROVED',
      transactionDate: new Date(),
      fiscalYear: `${year}-${year + 1}`,
    });

    // 2. Increment Asset costs transactionally without overwriting previous history
    if (assetId && costAmount > 0) {
      const asset = await Asset.findById(assetId);
      if (asset) {
        asset.totalMaintenanceCost = (asset.totalMaintenanceCost || 0) + costAmount;
        asset.totalLifecycleCost = (asset.acquisitionCost || 0) + asset.totalMaintenanceCost;
        await asset.save();
      }
    }

    return financialRecord;
  } catch (err) {
    console.error('[Financial Transaction Error]:', err.message);
    throw err;
  }
};

module.exports = {
  recordFinancialTransaction,
};
