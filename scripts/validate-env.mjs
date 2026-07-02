const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.CONTEXT === 'production';

if (isProduction && !process.env.ALLOWED_ORIGINS?.trim()) {
  const derivedOrigin =
    process.env.NEXTAUTH_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    '';

  if (derivedOrigin.trim()) {
    process.env.ALLOWED_ORIGINS = derivedOrigin.replace(/\/$/, '');
    console.warn(
      `[validate-env] ALLOWED_ORIGINS unset; derived from site URL: ${process.env.ALLOWED_ORIGINS}`
    );
  } else {
    console.error(
      '[validate-env] ALLOWED_ORIGINS is required in production. Set comma-separated origins in Netlify env vars.'
    );
    process.exit(1);
  }
}
