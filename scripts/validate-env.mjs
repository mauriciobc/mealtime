const isNetlify =
  process.env.NETLIFY === 'true' ||
  process.env.NETLIFY === '1' ||
  Boolean(process.env.CONTEXT);

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.CONTEXT === 'production' ||
  isNetlify;

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function isLocalDatabaseUrl(value) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

if (isProduction) {
  let failed = false;

  for (const key of REQUIRED_VARS) {
    const value = process.env[key]?.trim();
    if (!value) {
      console.error(`[validate-env] Missing required env var: ${key}`);
      failed = true;
      continue;
    }

    if ((key === 'DATABASE_URL' || key === 'DIRECT_URL') && isLocalDatabaseUrl(value)) {
      console.error(
        `[validate-env] ${key} points to localhost. Remote hosts (Netlify Preview Server, deploys) cannot reach it.`,
      );
      failed = true;
    }
  }

  if (failed) {
    console.error(
      '[validate-env] For Netlify Preview Server, set env vars with scope "All" or "Dev" in Site settings → Environment variables.',
    );
    console.error(
      '[validate-env] Each var must include the "Builds" scope (not Runtime-only) so npm run build can read them.',
    );
    console.error(
      '[validate-env] Tip: netlify env:get DATABASE_URL --context production && netlify env:set DATABASE_URL "<value>" --context dev',
    );
    process.exit(1);
  }

  if (!process.env.ALLOWED_ORIGINS?.trim()) {
    const derivedOrigin =
      process.env.NEXTAUTH_URL ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      '';

    if (derivedOrigin.trim()) {
      process.env.ALLOWED_ORIGINS = derivedOrigin.replace(/\/$/, '');
      console.warn(
        `[validate-env] ALLOWED_ORIGINS unset; derived from site URL: ${process.env.ALLOWED_ORIGINS}`,
      );
    } else {
      console.error(
        '[validate-env] ALLOWED_ORIGINS is required in production. Set comma-separated origins in Netlify env vars.',
      );
      process.exit(1);
    }
  }
}
