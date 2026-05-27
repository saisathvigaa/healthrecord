# HealthTrack — Auth Fix Setup Guide

## What changed

The app was wired to Manus's OAuth platform. This update replaces it with a **self-contained auth system** that works with your deployed backend:

| Before | After |
|---|---|
| Manus OAuth → broken outside Manus | Email + Password login |
| No register flow | Register new accounts |
| OAuth redirecting to manus.space | Google Sign-In (optional) |
| No back/sign-out buttons | Sign Out + Exit Demo buttons |

---

## Step 1 — Copy the files into your project

Replace these files (all in the output folder):

```
drizzle/schema.ts          ← adds passwordHash column
server/_core/sdk.ts        ← self-contained JWT auth (no Manus)
server/_core/oauth.ts      ← email/password + Google routes
server/_core/env.ts        ← updated env config
server/db.ts               ← adds getUserByEmail
constants/oauth.ts         ← new auth helpers for the app
app/_layout.tsx            ← registers /login screen
app/login.tsx              ← NEW: login/register screen
app/(tabs)/index.tsx       ← fixed Sign In button
```

> ⚠️ The `app/tabs/` folder in the output corresponds to `app/(tabs)/` in your project.
> Rename it back to `(tabs)` when you copy it over.

---

## Step 2 — Update your .env files

### Backend server `.env`

```env
# Required
DATABASE_URL=mysql://user:pass@host/dbname
JWT_SECRET=some-long-random-secret-at-least-32-chars

# Optional — only needed for Google Sign-In
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# Keep these if they exist
PORT=3000
NODE_ENV=production
```

### App `.env` (root of project)

```env
# Your deployed backend URL
EXPO_PUBLIC_API_BASE_URL=https://your-backend.railway.app

# Optional — only needed for Google Sign-In
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

---

## Step 3 — Run the DB migration

This adds the `passwordHash` column to your users table:

```bash
pnpm db:push
```

> Run this against your **deployed database**. Make sure DATABASE_URL in your environment points to it.

---

## Step 4 — Install expo-auth-session (for Google Sign-In)

```bash
pnpm add expo-auth-session
```

> If you're **not** using Google Sign-In, skip this. The login screen shows the Google button only when `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set.

---

## Step 5 — Set up Google Sign-In (optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sign-In API** (OAuth 2.0)
4. Create credentials → **OAuth 2.0 Client ID** → type: **Web application**
5. Add authorized redirect URI:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/health-track-mobile
   ```
   Replace `YOUR_EXPO_USERNAME` with your Expo account username (run `npx expo whoami`)
6. Copy the **Client ID** to your `.env` files:
   ```
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   ```
7. On your backend `.env`, also add `GOOGLE_CLIENT_SECRET` (from the same credentials page)

---

## Step 6 — Redeploy your backend

Push your changes and redeploy however you normally do:

```bash
git add -A
git commit -m "Replace Manus auth with self-contained email+password auth"
git push
```

If using Railway/Render/Fly.io — trigger a redeploy and make sure the new env vars are set in the dashboard.

---

## Step 7 — Test in Expo Go

```bash
# Start the dev server
pnpm dev:metro

# Or to just start Expo (no backend):
npx expo start
```

Then scan the QR code with Expo Go on your phone.

> Make sure your phone and laptop are on the **same WiFi network** (for local backend), OR use `EXPO_PUBLIC_API_BASE_URL` pointing to your deployed server.

### Test flow:
1. Open app → tap **Sign In / Register**
2. Switch to **Register** tab → create an account
3. Sign in with the same email/password → lands on dashboard
4. Tap **Sign Out** → returns to landing page

---

## Troubleshooting

**"Login failed" on the app**
- Check that `EXPO_PUBLIC_API_BASE_URL` in your app `.env` is correct
- Verify the backend is running: `curl https://your-backend/api/health`

**"Database not available" in server logs**
- Check `DATABASE_URL` in your server env
- Make sure you ran `pnpm db:push` to add the `passwordHash` column

**Google button doesn't appear**
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` must be set in your app `.env`
- Restart Metro after changing `.env` files

**Google Sign-In fails in Expo Go**
- Make sure `https://auth.expo.io` is in your Google OAuth authorized redirect URIs
- The redirect URI format is: `https://auth.expo.io/@<expo-username>/health-track-mobile`
