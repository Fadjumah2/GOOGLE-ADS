import logger from '../../utils/logger.js';

const handleGetVerificationStatus = async (req, res) => {
  try {
    logger.info('Fetching verification status...');
    const data = await gbpClient.getVerificationStatus();
    
    if (data.error) {
        return res.status(500).json(data);
    }

    res.json({ success: true, verification: data });
  } catch (error) {
    logger.error('Failed to fetch verification status.');
    res.status(500).json({ success: false, error: 'GET_VERIFICATION_STATUS_FAILED', message: error.message });
  }
};

export default handleGetVerificationStatus;
