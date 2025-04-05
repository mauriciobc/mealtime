import { CronJob } from 'cron';

// Function to check feeding notifications
async function checkFeedingNotifications() {
  try {
    const response = await fetch('/api/notifications/feeding-check', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to check feeding notifications');
    }

    const result = await response.json();
    console.log('Feeding notification check completed:', result);
  } catch (error) {
    console.error('Error in feeding notification cron job:', error);
  }
}

// Create cron jobs
export function initializeCronJobs() {
  // Check feeding notifications every 5 minutes
  new CronJob(
    '*/5 * * * *',
    checkFeedingNotifications,
    null,
    true,
    'UTC'
  );
} 