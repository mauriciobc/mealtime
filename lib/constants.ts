// Time constants (in milliseconds)
export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const FIVE_MINUTES = 5 * ONE_MINUTE;
export const THIRTY_MINUTES = 30 * ONE_MINUTE;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;

// Cache constants
export const DEFAULT_CACHE_TIME = FIVE_MINUTES;
export const API_CACHE_TIME = FIVE_MINUTES;
export const SHORT_CACHE_TIME = ONE_MINUTE;

// Retry constants
export const DEFAULT_RETRY_COUNT = 3;
export const MAX_RETRY_COUNT = 5;
export const DEFAULT_RETRY_DELAY = ONE_SECOND;
export const MAX_RETRY_DELAY = 10 * ONE_SECOND;

// Validation constants
export const MAX_CAT_NAME_LENGTH = 100;
export const MAX_CAT_WEIGHT_KG = 50;
export const MIN_FEEDING_INTERVAL_HOURS = 1;
export const MAX_FEEDING_INTERVAL_HOURS = 24;
export const MAX_RESTRICTIONS_LENGTH = 500;
export const MAX_NOTES_LENGTH = 1000;

// Pagination constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// API endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const API_VERSION = 'v1';
