import logger from '../../utils/logger.js';

const handleAddService = async (req, res) => {
  const { serviceItem } = req.body;

  if (!serviceItem) {
    logger.error('Missing serviceItem in request body.');
    return res.status(400).json({ success: false, message: 'Missing serviceItem in request body.' });
  }

  try {
    logger.info('Fetching current service list...');
    const serviceList = await gbpClient.getServiceList();

    if (!serviceList || serviceList.error) {
      logger.error('Failed to fetch service list.');
      return res.status(500).json({ success: false, message: 'Failed to fetch service list.' });
    }

    const updatedServiceItems = [...(serviceList.serviceItems || []), serviceItem];
    const updatedServiceList = { ...serviceList, serviceItems: updatedServiceItems };

    logger.info('Updating service list with new item...');
    const result = await gbpClient.updateServiceList(updatedServiceList, 'serviceItems');

    if (result.error) {
        logger.error(`GBP error updating service list: ${result.error}`);
        return res.status(500).json(result);
    }

    logger.info('Successfully added new service.');
    res.json({ success: true, serviceList: result });
  } catch (error) {
    logger.error(`Unexpected error adding service: ${error.message}`);
    res.status(500).json({ success: false, error: 'ADD_SERVICE_FAILED', message: error.message });
  }
};

export default handleAddService;
ge });
  }
};

export default handleAddService;
