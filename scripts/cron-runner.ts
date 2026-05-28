import { CronJob } from 'cron';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const BASE_URL = process.env.CRON_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

async function hitEndpoint(path: string) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(CRON_SECRET ? { 'X-Cron-Secret': CRON_SECRET } : {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    console.log(`[Cron] ${path} — ${res.status}`, body);
  } catch (err) {
    console.error(`[Cron] ${path} — failed`, err);
  }
}

// Scheduled notification delivery (reminders + missed-feeding warnings) — every minute
const deliverJob = new CronJob(
  '* * * * *',
  () => hitEndpoint('/api/v2/scheduled-notifications/deliver'),
  null,
  true,
  'UTC'
);

console.log('[CronRunner] Cron jobs started');
console.log(`  - /api/v2/scheduled-notifications/deliver  (every minute)`);

// Keep process alive
setInterval(() => {}, 1 << 30);
