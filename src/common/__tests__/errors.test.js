const { SynapseError, GoogleAdsApiError, DatabaseError, ValidationError } = require('../errors');

describe('Custom Error Classes', () => {
  test('SynapseError should have correct properties', () => {
    const error = new SynapseError('Generic message', 'GEN_CODE', new Error('Original'));
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SynapseError);
    expect(error.message).toBe('Generic message');
    expect(error.name).toBe('SynapseError');
    expect(error.code).toBe('GEN_CODE');
    expect(error.originalError.message).toBe('Original');
  });

  test('GoogleAdsApiError should extend SynapseError with specific code', () => {
    const original = new Error('API failed');
    const error = new GoogleAdsApiError('Google Ads API issue', original);
    expect(error).toBeInstanceOf(SynapseError);
    expect(error).toBeInstanceOf(GoogleAdsApiError);
    expect(error.message).toBe('Google Ads API issue');
    expect(error.name).toBe('GoogleAdsApiError');
    expect(error.code).toBe('GOOGLE_ADS_API_ERROR');
    expect(error.originalError).toBe(original);
  });

  test('DatabaseError should extend SynapseError with specific code', () => {
    const original = new Error('DB connection failed');
    const error = new DatabaseError('Database operation failed', original);
    expect(error).toBeInstanceOf(SynapseError);
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toBe('Database operation failed');
    expect(error.name).toBe('DatabaseError');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.originalError).toBe(original);
  });

  test('ValidationError should extend SynapseError with specific code', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(SynapseError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid input');
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.originalError).toBeNull();
  });
});
