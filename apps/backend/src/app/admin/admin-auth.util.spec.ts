import { UnauthorizedException } from '@nestjs/common';
import { verifyAdminToken } from './admin-auth.util';

describe('verifyAdminToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('accepts valid token query param or bearer header', () => {
    process.env['ADMIN_API_SECRET'] = 'top-secret-token';

    expect(() => verifyAdminToken('top-secret-token')).not.toThrow();
    expect(() =>
      verifyAdminToken(undefined, 'Bearer top-secret-token')
    ).not.toThrow();
    expect(() =>
      verifyAdminToken(undefined, 'top-secret-token')
    ).not.toThrow();
  });

  it('rejects invalid or missing token when secret is set', () => {
    process.env['ADMIN_API_SECRET'] = 'top-secret-token';

    expect(() => verifyAdminToken('wrong-token')).toThrow(
      UnauthorizedException
    );
    expect(() =>
      verifyAdminToken(undefined, 'Bearer wrong-token')
    ).toThrow(UnauthorizedException);
    expect(() => verifyAdminToken(undefined, undefined)).toThrow(
      UnauthorizedException
    );
  });

  it('falls back to ADMIN_TOKEN if ADMIN_API_SECRET is not set', () => {
    delete process.env['ADMIN_API_SECRET'];
    process.env['ADMIN_TOKEN'] = 'legacy-admin-token';

    expect(() => verifyAdminToken('legacy-admin-token')).not.toThrow();
    expect(() => verifyAdminToken('invalid-token')).toThrow(
      UnauthorizedException
    );
  });

  it('allows access in non-production when no secret is configured', () => {
    delete process.env['ADMIN_API_SECRET'];
    delete process.env['ADMIN_TOKEN'];
    process.env['NODE_ENV'] = 'development';

    expect(() => verifyAdminToken(undefined, undefined)).not.toThrow();
  });

  it('throws in production when no secret is configured and ENABLE_ADMIN_API is not true', () => {
    delete process.env['ADMIN_API_SECRET'];
    delete process.env['ADMIN_TOKEN'];
    process.env['NODE_ENV'] = 'production';
    delete process.env['ENABLE_ADMIN_API'];

    expect(() => verifyAdminToken(undefined, undefined)).toThrow(
      UnauthorizedException
    );
  });
});
