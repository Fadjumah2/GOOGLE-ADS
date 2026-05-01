import gbpClient from '../utils/gbpClient.js';

const gbpClientMiddleware = (req, res, next) => {
  req.gbp = gbpClient(req);
  next();
};

export default gbpClientMiddleware;
