import { describe, expect, it } from 'vitest';
import { ADMIN_CLAIM_KEY, isAdminClaim } from './adminClaim';

describe('admin custom claim', () => {
  it('grants admin only for a literal boolean true claim', () => {
    expect(ADMIN_CLAIM_KEY).toBe('admin');
    // The shape Firebase produces from customAttributes '{"admin":true}'.
    expect(isAdminClaim({ admin: true, sub: 'uid-1', iss: 'https://securetoken.google.com/acecse' })).toBe(true);
  });

  it('refuses every truthy-but-not-true value, so the UI cannot outrun the rules', () => {
    // Each of these is truthy in JavaScript but fails `request.auth.token.admin == true`
    // in firestore.rules. Accepting them would show admin screens whose writes
    // the backend then rejects.
    for (const value of ['true', 'TRUE', '1', 1, -1, {}, [], ['admin'], Number.NaN, 'admin']) {
      expect(isAdminClaim({ admin: value })).toBe(false);
    }
  });

  it('refuses an absent, falsy, or malformed claim set', () => {
    expect(isAdminClaim({ admin: false })).toBe(false);
    expect(isAdminClaim({ admin: null })).toBe(false);
    expect(isAdminClaim({ admin: undefined })).toBe(false);
    expect(isAdminClaim({ sub: 'uid-1' })).toBe(false);
    expect(isAdminClaim({})).toBe(false);
    expect(isAdminClaim(null)).toBe(false);
    expect(isAdminClaim(undefined)).toBe(false);
    expect(isAdminClaim('admin')).toBe(false);
    expect(isAdminClaim(true)).toBe(false);
  });

  it('is not fooled by a differently spelled or nested claim', () => {
    expect(isAdminClaim({ isAdmin: true })).toBe(false);
    expect(isAdminClaim({ Admin: true })).toBe(false);
    expect(isAdminClaim({ role: 'admin' })).toBe(false);
    expect(isAdminClaim({ claims: { admin: true } })).toBe(false);
    // An inherited property is not a claim on this token.
    expect(isAdminClaim(Object.create({ admin: true }) as object)).toBe(false);
  });
});
