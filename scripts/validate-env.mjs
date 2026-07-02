const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.CONTEXT === 'production';

if (isProduction && !process.env.ALLOWED_ORIGINS?.trim()) {
  console.error(
    '[validate-env] ALLOWED_ORIGINS is required in production. Set comma-separated origins in Netlify env vars.'
  );
  process.exit(1);
}
