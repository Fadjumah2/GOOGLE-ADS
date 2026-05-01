import logger from '../../utils/logger.js';
import sendError from '../../utils/error.js';

const sanitize = (str) => {
  return str.replace(/<[^>]*>?/gm, '');
};

const handleReplyToReview = async (req, res) => {
  const { reviewName, replyText } = req.body;

  if (!reviewName || !replyText) {
    logger.error('Missing reviewName or replyText in request body.');
    return sendError(res, 400, 'MISSING_PARAMETERS', 'Missing reviewName or replyText in request body.');
  }

  const sanitizedReplyText = sanitize(replyText);

  try {
    logger.info(`Sending reply to review: ${reviewName}`);
    const result = await req.gbp.replyToReview(reviewName, sanitizedReplyText);
    
    if (result.success) {
      logger.info(`Successfully replied to review: ${reviewName}`);
      res.json(result);
    } else {
      logger.error(`Failed to reply to review ${reviewName}: ${result.error || result.message}`);
      sendError(res, 500, result.error || 'REPLY_TO_REVIEW_FAILED', result.message || 'Failed to reply to review.');
    }
  } catch (error) {
    logger.error(`Unexpected error replying to review ${reviewName}: ${error.message}`);
    sendError(res, 500, 'REPLY_TO_REVIEW_FAILED', error.message);
  }
};

export default handleReplyToReview;
