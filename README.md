# TimeShift

TimeShift is a browser-based calendar application that displays events in the
user's preferred time zone. It uses Vite for the frontend and Firebase
Authentication and Cloud Firestore for account and schedule data.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install` in the project root.
3. Run `npm run dev`.
4. Open the local address printed by Vite.

## Commands

- `npm run dev` starts the development server.
- `npm run build` creates a production build in `dist`.
- `npm run preview` previews the production build.
- `npm test` runs the model tests.

## Firebase

The frontend connects to the `timeshift-team13` Firebase project. Google
Authentication must be enabled in the Firebase console. Firestore rules and
indexes are stored in `firestore.rules` and `firestore.indexes.json`.

After signing in to the Firebase CLI, deploy the database configuration with:

```text
npx firebase deploy --only firestore
```

Build and deploy the site with:

```text
npm run build
npx firebase deploy --only hosting
```

## Current data collections

- `users` stores account profiles and settings.
- `events` stores calendar events.
- `calendars` supports calendar data operations.
- `repetitions` stores repeat rules selected during event creation.
- `reminders` stores reminder schedules selected during event creation.

Shared-calendar and invitation interfaces are intentionally not implemented in
this version because those screens are being designed separately.
