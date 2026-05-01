import { normalizeProfile } from '../../utils/normalizeGBPResponse.js';
import logger from '../../utils/logger.js';

const handleGetProfile = async (req, res) => {
  try {
    logger.info('Fetching profile details...');
    const rawData = await gbpClient.getProfile();
    
    if (rawData.error) {
        return res.status(500).json(rawData);
    }

    const normalizedData = normalizeProfile(rawData);
    logger.info('Successfully fetched and normalized profile.');
    res.json(normalizedData);
  } catch (error) {
    logger.error('Failed to fetch profile.');
    res.status(500).json({ success: false, error: 'GET_PROFILE_FAILED', message: error.message });
  }
};

export default handleGetProfile;
