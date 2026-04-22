const { Storage } = require('@google-cloud/storage');
const logger = require('../../utils/logger');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

const handleGetSignedUrl = async (req, res) => {
  const { filename, contentType } = req.body;

  if (!bucketName) {
    logger.error('GCS_BUCKET_NAME environment variable not set.');
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  if (!filename || !contentType) {
    logger.error('Missing filename or contentType in request body.');
    return res.status(400).json({ success: false, message: 'Missing filename or contentType.' });
  }

  const options = {
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  };

  try {
    const [url] = await storage.bucket(bucketName).file(filename).getSignedUrl(options);
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
    res.json({ success: true, signedUrl: url, publicUrl });
  } catch (error) {
    logger.error(`Error generating signed URL: ${error.message}`);
    res.status(500).json({ success: false, message: 'Could not generate upload URL.' });
  }
};

module.exports = handleGetSignedUrl;
