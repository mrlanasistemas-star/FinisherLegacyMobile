import { loginSchema, registerSchema } from './auth';

describe('loginSchema', () => {
  it('accepts a valid email/password pair', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    first_name: 'Ana',
    last_name: 'Ruiz',
    email: 'ana@example.com',
    password: 'password123',
    password_confirmation: 'password123',
  };

  it('accepts a fully valid payload', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a password shorter than 8 characters (backend Password::default())', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'short', password_confirmation: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({ ...valid, password_confirmation: 'somethingElse123' });
    expect(result.success).toBe(false);
  });
});
