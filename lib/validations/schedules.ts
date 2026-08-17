import { z } from 'zod';

const hhmm = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Times must be in HH:MM 24-hour format');

export const createScheduleSchema = z
  .object({
    catId: z.string().uuid(),
    type: z.enum(['interval', 'fixedTime']),
    interval: z.number().positive().optional(),
    times: z.array(hhmm).optional(),
    enabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'interval' && (data.interval == null || data.interval <= 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Interval must be greater than zero',
        path: ['interval'],
      });
    }
    if (data.type === 'fixedTime' && (!data.times || data.times.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Times array is required for fixed time schedules',
        path: ['times'],
      });
    }
  });

export const updateScheduleSchema = z.object({
  type: z.enum(['interval', 'fixedTime']).optional(),
  interval: z.number().positive().optional(),
  times: z.union([z.string(), z.array(hhmm)]).optional(),
  overrideUntil: z.union([z.string(), z.null()]).optional(),
  enabled: z.boolean().optional(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
