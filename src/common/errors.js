class SynapseError extends Error {
  constructor(message, code = 'GENERIC_ERROR', originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

class GoogleAdsApiError extends SynapseError {
  constructor(message, originalError = null) {
    super(message, 'GOOGLE_ADS_API_ERROR', originalError);
  }
}

class DatabaseError extends SynapseError {
  constructor(message, originalError = null) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}

class ValidationError extends SynapseError {
  constructor(message, originalError = null) {
    super(message, 'VALIDATION_ERROR', originalError);
  }
}

module.exports = {
  SynapseError,
  GoogleAdsApiError,
  DatabaseError,
  ValidationError,
};
