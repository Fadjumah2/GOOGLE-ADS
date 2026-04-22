const gbpClient = require('../../utils/gbpClient');
const logger = require('../../utils/logger');

const handleGetSignedUrl = async (req, res) => {
  const { filename, contentType } = req.body;

  if (!filename || !contentType) {
    logger.error('Missing filename or contentType in request body.');
    return res.status(400).json({ success: false, message: 'Missing filename or contentType.' });
  }

  try {
    const result = await gbpClient.getSignedUrl(filename, contentType);
    if (result.error) {
        logger.error(`GBP error getting signed URL: ${result.error}`);
        return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    logger.error(`Unexpected error getting signed URL: ${error.message}`);
    res.status(500).json({ success: false, error: 'GET_SIGNED_URL_FAILED', message: error.message });
  }
};

module.exports = handleGetSignedUrl;
