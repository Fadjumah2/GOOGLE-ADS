import { normalizeInsights } from '../../utils/normalizeGBPResponse.js';
import logger from '../../utils/logger.js';

const handleGetInsights = async (req, res) => {
  try {
    const { startDate, endDate, period, days } = req.query || {};
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate)   options.endDate   = endDate;
    if (period)    options.period    = period;
    if (days)      options.days      = days;

    logger.info(`Fetching insights (options=${JSON.stringify(options)})...`);
    const rawData = await gbpClient.getInsights(options);

    if (rawData.error) {
        logger.error(`GBP error fetching insights: ${rawData.error}`);
        return res.status(500).json(rawData);
    }

    const normalizedData = normalizeInsights(rawData);
    if (rawData.range) normalizedData.range = rawData.range;
    logger.info('Successfully fetched and normalized insights.');
    res.json(normalizedData);
  } catch (error) {
    logger.error(`Failed to fetch insights: ${error.message}`);
    res.status(500).json({ success: false, error: 'GET_INSIGHTS_FAILED', message: error.message });
  }
};

export default handleGetInsights;
