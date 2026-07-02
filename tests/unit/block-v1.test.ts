import { describe, it, expect } from 'vitest';
import { v1DeprecatedResponse, isDeprecatedV1ApiPath } from '@/lib/middleware/block-v1';

describe('v1DeprecatedResponse', () => {
  it('returns 410 with deprecation message', async () => {
    const res = v1DeprecatedResponse();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toContain('/api/v2');
  });
});

describe('isDeprecatedV1ApiPath', () => {
  it('flags legacy v1 API paths', () => {
    expect(isDeprecatedV1ApiPath('/api/feedings')).toBe(true);
    expect(isDeprecatedV1ApiPath('/api/feedings/cats')).toBe(true);
    expect(isDeprecatedV1ApiPath('/api/cats')).toBe(true);
  });

  it('allows v2, auth, health, and monitoring', () => {
    expect(isDeprecatedV1ApiPath('/api/v2/cats')).toBe(false);
    expect(isDeprecatedV1ApiPath('/api/auth/mobile')).toBe(false);
    expect(isDeprecatedV1ApiPath('/api/health')).toBe(false);
    expect(isDeprecatedV1ApiPath('/api/monitoring/errors')).toBe(false);
  });

  it('ignores non-API paths', () => {
    expect(isDeprecatedV1ApiPath('/cats')).toBe(false);
    expect(isDeprecatedV1ApiPath('/login')).toBe(false);
  });
});
