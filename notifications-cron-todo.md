# Unified Notification Dispatch Plan

## 1. Notification Types & Triggers

| Type        | Triggered by Cron? | Triggered by Event? | Example Event Source                |
|-------------|--------------------|---------------------|-------------------------------------|
| feeding     | ✅                 | ✅                  | Cron (overdue), feeding registration|
| reminder    | ✅                 | ✅                  | Cron (upcoming), schedule update    |
| warning     | ✅                 | ✅                  | Cron (missed/duplicate), feeding    |
| household   | ❌                 | ✅                  | User joins/leaves household         |
| system      | ❌                 | ✅                  | System update, schedule change      |
| info        | ❌                 | ✅                  | Admin message, general info         |
| error       | ❌                 | ✅                  | Feeding failure, system error       |

---

## 2. Cron-based Notification Flow

- **Runs every N minutes** (via `initializeCronJobs`).
- For each cat:
  - Fetch schedules and last feeding log.
  - Use `generateFeedingNotifications` to determine if a `feeding`, `reminder`, or `warning` notification is due.
  - For each notification, POST to `/api/notifications`.
- **Metrics**: Use `feedingNotificationMonitor` to track checks, successes, failures, and timing.

---

## 3. Event-driven Notification Flow

- **Direct triggers** in business logic (e.g., user joins household, feeding is registered, schedule is updated, error occurs).
- Call `createNotification` (or POST `/api/notifications`) with the appropriate type (`household`, `system`, `info`, `error`, etc.).
- **Examples**:
  - When a user joins a household, trigger a `household` notification for all members.
  - When a schedule is updated, trigger a `system` notification for the owner.
  - On feeding registration failure, trigger an `error` notification for the user.

---

## 4. API & Persistence

- All notifications are persisted via the `/api/notifications` endpoint.
- Notification types and payloads are validated against the unified type system.
- The API supports creation, listing, marking as read, and deletion.

---

## 5. Monitoring & Observability

- **Cron metrics**: Track notification creation, failures, and timing.
- **Event metrics**: Log event-driven notification triggers and errors.
- **Expose**: Admin/debug endpoint for notification metrics.

---

## 6. Testing

- **Cron tests**: Simulate time, schedules, and logs to ensure correct notifications are generated.
- **Event tests**: Simulate user/system events and assert correct notification creation.
- **Integration**: Ensure both flows can coexist and do not duplicate notifications.

---

## 7. Documentation

- Update `docs/architecture.md` to show both cron and event-driven flows.
- Add trigger examples for each notification type.
- Document how to add new notification types or triggers.

---

## 8. Next Steps

1. ~~Implement `/api/notifications/feeding-check` for the cron job.~~ ✅ **Done: Implemented and committed on 'cron-notifications' branch.**
2. **Ensure all event-driven triggers use the notification API/service.**

### Detailed Plan for Event-Driven Notification Triggers

#### Notification Types & Expected Triggers

- **feeding**
  - Triggered by: Feeding registration (user logs a feeding)
  - Action: Notify relevant users (e.g., household members, owner) that a feeding was registered
  - Implementation: Call `createNotification` after successful feeding registration

- **reminder**
  - Triggered by: Schedule update (user changes feeding schedule)
  - Action: Notify owner/user about upcoming feeding or schedule change
  - Implementation: Call `createNotification` after schedule is updated

- **warning**
  - Triggered by: Feeding registration (duplicate/missed feeding detected)
  - Action: Notify user of missed or duplicate feeding
  - Implementation: Call `createNotification` if feeding registration logic detects a missed/duplicate event

- **household**
  - Triggered by: User joins or leaves a household
  - Action: Notify all household members of the change
  - Implementation: Call `createNotification` for each member when join/leave event occurs

- **system**
  - Triggered by: System-wide updates, schedule changes, or admin actions
  - Action: Notify affected users of system events
  - Implementation: Call `createNotification` in system update or schedule change handlers

- **info**
  - Triggered by: Admin messages, general info broadcasts
  - Action: Notify users of informational messages
  - Implementation: Call `createNotification` when admin/info event is triggered

- **error**
  - Triggered by: Feeding failure, system error, or failed user action
  - Action: Notify user of the error
  - Implementation: Call `createNotification` in error handling logic

#### Implementation Checklist

- [x] Feeding registration triggers `feeding` notification *(implemented in POST handler)*
- [ ] Feeding registration triggers `warning` notification on duplicate/missed *(audit in progress)*
- [ ] Schedule update triggers `reminder` or `system` notification
- [ ] User joins/leaves household triggers `household` notification for all members
- [ ] System/admin events trigger `system` or `info` notification
- [ ] Error handling triggers `error` notification for affected user

#### Next Steps for This Milestone

- [ ] Audit and update all business logic to call `createNotification` for the above events *(feeding registration handler updated, warning audit in progress)*
- [ ] Ensure notification payloads match the unified type system
- [ ] Add/expand tests for event-driven notification triggers
- [ ] Document trigger points and update architecture docs

---

# Risk Assessment & Review

## Risks

- **Duplicate Notifications**: If both cron and event-driven flows trigger for the same event, users may receive multiple notifications. 
  - *Mitigation*: Add deduplication logic (e.g., unique constraints, time windows, or idempotency keys).

- **Performance/Scalability**: Cron job may become slow as the number of cats/schedules grows.
  - *Mitigation*: Paginate queries, process in batches, and monitor execution time.

- **Missed Notifications**: If the cron job fails or is delayed, notifications may be late or missed.
  - *Mitigation*: Add monitoring/alerts for cron failures and execution lag.

- **Race Conditions**: Simultaneous event and cron triggers could cause race conditions in notification creation.
  - *Mitigation*: Use database transactions or atomic upserts where possible.

- **API Rate Limits**: High notification volume could hit API or database rate limits.
  - *Mitigation*: Throttle notification creation, use bulk inserts, and monitor API usage.

- **User Preferences**: Not all users may want all notification types.
  - *Mitigation*: Respect user notification settings/preferences in both flows.

- **Testing Complexity**: Ensuring both flows are covered and do not conflict increases test complexity.
  - *Mitigation*: Write comprehensive unit, integration, and E2E tests for both flows.

- **Data Consistency**: Event-driven and cron-driven notifications must not diverge in logic or data.
  - *Mitigation*: Centralize notification logic in shared service functions.

## Review

- The plan unifies cron-based and event-driven notification flows, ensuring all notification types are handled.
- Risks are identified and mitigations proposed.
- The plan is extensible for new notification types and scalable for growth.
- Next steps are actionable and clear.

---

*Registered by AI assistant on behalf of the team. Review and update as implementation progresses.* 