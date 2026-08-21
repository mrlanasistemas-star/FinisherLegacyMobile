import { AppError, toAppError } from './errors';

function axiosError(overrides: Record<string, unknown>) {
  return { isAxiosError: true, response: undefined, code: undefined, ...overrides };
}

describe('toAppError', () => {
  it('returns a generic unknown error for a non-axios error', () => {
    const result = toAppError(new Error('boom'));
    expect(result.kind).toBe('unknown');
  });

  it('is idempotent for an already-normalized AppError', () => {
    const original = new AppError({ kind: 'conflict', message: 'ya existe' });
    expect(toAppError(original)).toBe(original);
  });

  it('maps a timeout to kind "timeout"', () => {
    const result = toAppError(axiosError({ code: 'ECONNABORTED' }));
    expect(result.kind).toBe('timeout');
  });

  it('maps a missing response to kind "network"', () => {
    const result = toAppError(axiosError({}));
    expect(result.kind).toBe('network');
  });

  it('uses the Laravel top-level message and keeps per-field errors separate for a 422', () => {
    const result = toAppError(
      axiosError({
        response: {
          status: 422,
          data: { message: 'Los datos no son válidos.', errors: { email: ['El correo ya está en uso.'] } },
        },
      }),
    );
    expect(result.kind).toBe('validation');
    expect(result.message).toBe('Los datos no son válidos.');
    expect(result.fieldErrors).toEqual({ email: ['El correo ya está en uso.'] });
  });

  it('reads message from the documented {error:{code,message}} envelope', () => {
    const result = toAppError(
      axiosError({
        response: { status: 404, data: { error: { code: 'NOT_FOUND', message: 'No existe.' } } },
      }),
    );
    expect(result.kind).toBe('not_found');
    expect(result.code).toBe('NOT_FOUND');
  });

  it('falls back to a top-level `message` when the response uses the success envelope for an error status', () => {
    // LegacyCodeController::claim() returns 409s as {data:null, message} instead
    // of {error:{code,message}} — the parser must still surface that message.
    const result = toAppError(
      axiosError({
        response: { status: 409, data: { data: null, message: 'Esta placa ya forma parte de otro Legacy.' } },
      }),
    );
    expect(result.kind).toBe('conflict');
    expect(result.message).toBe('Esta placa ya forma parte de otro Legacy.');
  });

  it('falls back to a generic message for an unmapped 5xx status', () => {
    const result = toAppError(axiosError({ response: { status: 500, data: {} } }));
    expect(result.kind).toBe('server');
    expect(result.message).toBe('Algo salió mal. Intenta nuevamente.');
  });
});
