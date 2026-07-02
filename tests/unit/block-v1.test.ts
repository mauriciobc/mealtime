import { describe, it, expect } from 'vitest';
import { v1DeprecatedResponse } from '@/lib/middleware/block-v1';

describe('v1DeprecatedResponse', () => {
  it('returns 410 with deprecation message', async () => {
    const res = v1DeprecatedResponse();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toContain('/api/v2');
  });
});
