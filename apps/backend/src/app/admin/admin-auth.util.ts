import { UnauthorizedException } from '@nestjs/common';

export function verifyAdminToken(token?: string, authHeader?: string): void {
  const expectedSecret =
    process.env['ADMIN_API_SECRET'] || process.env['ADMIN_TOKEN'];

  let providedToken = token ? token.trim() : '';

  if (!providedToken && authHeader) {
    const trimmedHeader = authHeader.trim();

    if (trimmedHeader.startsWith('Bearer ')) {
      providedToken = trimmedHeader.slice('Bearer '.length).trim();
    } else {
      providedToken = trimmedHeader;
    }
  }

  if (!expectedSecret) {
    if (
      process.env['NODE_ENV'] === 'production' &&
      process.env['ENABLE_ADMIN_API'] !== 'true'
    ) {
      throw new UnauthorizedException('Admin secret is not configured on the server');
    }

    return;
  }

  if (!providedToken || providedToken !== expectedSecret) {
    throw new UnauthorizedException('Invalid or missing admin token');
  }
}
