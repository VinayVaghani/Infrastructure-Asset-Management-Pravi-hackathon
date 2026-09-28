const LifecycleEvent = require('../models/LifecycleEvent');

/**
 * Record a lifecycle event for an infrastructure asset
 */
const formatEventTypeTitle = (type) => {
  if (!type) return 'Lifecycle Event';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const recordLifecycleEvent = async ({
  eventType,
  assetId,
  projectId = null,
  performedBy,
  title,
  description,
  metadata = {},
}) => {
  try {
    const event = await LifecycleEvent.create({
      eventType,
      asset: assetId,
      project: projectId,
      performedBy,
      title: title || formatEventTypeTitle(eventType),
      description,
      metadata,
      timestamp: new Date(),
    });
    return event;
  } catch (error) {
    console.error(`[Lifecycle Event Error]: ${error.message}`);
    throw error;
  }
};

module.exports = {
  recordLifecycleEvent,
};
