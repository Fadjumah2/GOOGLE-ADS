import gbpClient from '../../utils/gbpClient.js';
import logger from '../../utils/logger.js';

const handleGetAttributes = async (req, res) => {
  try {
    logger.info('Fetching attributes...');
    const data = await gbpClient.getAttributes();
    
    if (data.error) {
        return res.status(500).json(data);
    }

    res.json({ success: true, attributes: data });
  } catch (error) {
    logger.error('Failed to fetch attributes.');
    res.status(500).json({ success: false, error: 'GET_ATTRIBUTES_FAILED', message: error.message });
  }
};

export default handleGetAttributes;
