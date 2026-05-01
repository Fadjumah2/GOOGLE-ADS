const sendError = (res, statusCode, errorCode, message) => {
  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message: message,
  });
};

export default sendError;
