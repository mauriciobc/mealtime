# MealTime App Development Plan

## Project Overview
**App Name:** MealTime  
**Category:** Pet Care, Home Management  
**Tech Stack:** Node.js, React Native, SQLite  
**Objective:** Build a mobile app to streamline cat feeding routines with collaborative features, configurable schedules, and analytics.

---

## Development Phases

### Phase 1: Project Setup & Architecture
**Duration:** 1 Week  
**Goals:** Establish project structure, tools, and initial configurations.

#### Tasks
1. **Environment Setup**
   - Install Node.js, npm, and React Native CLI.
   - Set up a Git repository for version control.
   - Configure ESLint and Prettier for code quality.
2. **Project Structure**
   - **Backend (Node.js):**
     - `/server`
       - `/src`
         - `/controllers` (API logic)
         - `/models` (SQLite schemas)
         - `/routes` (API endpoints)
         - `/services` (business logic)
         - `/utils` (helpers)
   - **Frontend (React Native):**
     - `/app`
       - `/components` (reusable UI components)
       - `/screens` (app views)
       - `/navigation` (app navigation)
       - `/store` (state management)
       - `/assets` (images, fonts)
3. **Database Setup**
   - Use SQLite with `sqlite3` package in Node.js.
   - Initialize database with migrations for tables: `users`, `households`, `cats`, `feeding_logs`, `schedules`.
4. **Dependencies**
   - Backend: `express`, `sqlite3`, `nodemon`, `jsonwebtoken` (auth), `socket.io` (real-time sync).
   - Frontend: `react-native-sqlite-storage`, `axios`, `@react-navigation/native`, `socket.io-client`, `react-native-chart-kit` (analytics).

#### Deliverables
- Initialized project repository with backend and frontend folders.
- SQLite database schema designed and implemented.

---

### Phase 2: Core Features Development
**Duration:** 4 Weeks  
**Goals:** Implement key features with basic UI and backend logic.

#### 2.1 Household & User Management
**Duration:** 1 Week
- **Backend:**
  - API endpoints:
    - `POST /household` (create household)
    - `GET /household/invite/:id` (generate invite link)
    - `POST /household/join` (join via invite)
    - `PATCH /household/:id/users/:userId/role` (assign roles)
  - SQLite tables: `users` (id, name, email, role, household_id), `households` (id, name, invite_code).
  - Real-time sync with Socket.io for user updates.
- **Frontend:**
  - Screens: HouseholdCreation, HouseholdJoin, UserManagement.
  - Components: RoleSelector, InviteLinkDisplay.
  - State Management: Redux for user and household data.

#### 2.2 Cat Profile Management
**Duration:** 1 Week
- **Backend:**
  - API endpoints:
    - `POST /cats` (create cat profile)
    - `GET /cats/:householdId` (list cats)
    - `PATCH /cats/:id` (update profile)
    - `POST /cats/groups` (create group)
  - SQLite table: `cats` (id, name, photo_url, birthdate, weight, restrictions, notes, household_id), `cat_groups` (id, name, cat_ids).
- **Frontend:**
  - Screens: CatProfileCreate, CatProfileView, CatGroupManager.
  - Components: CatCard, PhotoUploader.
  - Local storage for cat photos using React Native FS.

#### 2.3 Feeding Interval Configuration
**Duration:** 1 Week
- **Backend:**
  - API endpoints:
    - `POST /schedules` (create schedule)
    - `PATCH /schedules/:id` (update/override schedule)
    - `GET /schedules/:catId` (fetch schedules)
  - SQLite table: `schedules` (id, cat_id, type, interval, times, override_until).
- **Frontend:**
  - Screens: ScheduleSetup, ScheduleOverride.
  - Components: TimePicker, IntervalSelector.

#### 2.4 Feeding Tracking & Notifications
**Duration:** 1 Week
- **Backend:**
  - API endpoints:
    - `POST /feedings` (log feeding)
    - `GET /feedings/:catId` (fetch feeding logs)
  - SQLite table: `feeding_logs` (id, cat_id, user_id, timestamp, portion_size, notes).
  - Push notifications via `node-pushnotifications`.
  - Escalation logic for missed feedings.
- **Frontend:**
  - Screens: FeedingLogEntry, NotificationSettings.
  - Components: FeedingButton, NotificationBanner.
  - Use `react-native-push-notification` for local notifications.

---

### Phase 3: Advanced Features & Analytics
**Duration:** 3 Weeks  
**Goals:** Add logs, analytics, and app settings.

#### 3.1 Feeding Log & Analytics
**Duration:** 2 Weeks
- **Backend:**
  - API endpoints:
    - `GET /analytics/:catId` (fetch trends data)
    - `GET /export/:catId` (export logs as CSV)
  - Aggregate data for charts (daily/weekly frequency, weight vs. intake).
- **Frontend:**
  - Screens: FeedingLogView, AnalyticsDashboard.
  - Components: ChartView (using `react-native-chart-kit`), ExportButton.
  - Offline caching of logs with SQLite.

#### 3.2 App Settings
**Duration:** 1 Week
- **Backend:**
  - API endpoints:
    - `PATCH /users/:id/settings` (update timezone/language)
  - SQLite column in `users`: `timezone`, `language`.
- **Frontend:**
  - Screens: SettingsScreen.
  - Components: TimezonePicker, LanguageSelector.
  - Localization with `i18n-js` (en-US, pt-BR, es-ES).

---

### Phase 4: Testing & Refinement
**Duration:** 2 Weeks  
**Goals:** Ensure quality, performance, and usability.

#### Tasks
1. **Unit Testing**
   - Backend: Use `jest` for API and service tests.
   - Frontend: Use `react-native-testing-library` for component tests.
2. **Integration Testing**
   - Test household sync, feeding logs, and notifications end-to-end.
3. **UI/UX Refinement**
   - Gather feedback on UI flow and adjust screens/components.
4. **Performance Optimization**
   - Optimize SQLite queries and Socket.io events.

#### Deliverables
- Test coverage report.
- Polished UI with smooth navigation.

---

### Phase 5: Deployment & Launch
**Duration:** 1 Week  
**Goals:** Prepare for production and launch.

#### Tasks
1. **Backend Deployment**
   - Deploy Node.js server to a platform like Heroku or AWS.
   - Set up SQLite in persistent storage or migrate to PostgreSQL if scaling.
2. **Frontend Build**
   - Build React Native app for iOS/Android using Expo or native builds.
   - Submit to App Store and Google Play.
3. **Documentation**
   - Write user guide and API docs.

#### Deliverables
- Live app on app stores.
- Documentation for users and developers.

---

## Milestones
1. **Week 1:** Project setup completed.
2. **Week 5:** Core features (household, cat profiles, schedules, tracking) functional.
3. **Week 8:** Analytics and settings implemented.
4. **Week 10:** Testing completed, app refined.
5. **Week 11:** App deployed and launched.

---

## Database Schema (SQLite)
```sql
CREATE TABLE households (id INTEGER PRIMARY KEY, name TEXT, invite_code TEXT);
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, role TEXT, household_id INTEGER, timezone TEXT, language TEXT);
CREATE TABLE cats (id INTEGER PRIMARY KEY, name TEXT, photo_url TEXT, birthdate TEXT, weight REAL, restrictions TEXT, notes TEXT, household_id INTEGER);
CREATE TABLE cat_groups (id INTEGER PRIMARY KEY, name TEXT, cat_ids TEXT);
CREATE TABLE schedules (id INTEGER PRIMARY KEY, cat_id INTEGER, type TEXT, interval INTEGER, times TEXT, override_until TEXT);
CREATE TABLE feeding_logs (id INTEGER PRIMARY KEY, cat_id INTEGER, user_id INTEGER, timestamp TEXT, portion_size REAL, notes TEXT);