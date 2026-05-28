# PostKaro — Production Deployment Guide

## Overview

PostKaro is a MERN social media app deployed across two platforms:
- **Frontend**: React + Vite on Vercel
- **Backend**: Node.js + Express + Socket.io on Render
- **Database**: MongoDB Atlas

This guide explains how to properly configure production deployment for Google OAuth, CORS, and sessions.

---

## Why Google OAuth Was Failing

**Root Causes:**

1. **Mismatched CORS Origins**: Frontend (Vercel) couldn't communicate with backend (Render) due to CORS restrictions.
2. **Incorrect Cookie Configuration**: Cookies weren't configured for cross-domain usage in production.
3. **Session Not Trusted**: Backend didn't trust the reverse proxy (Render), causing session/IP detection issues.
4. **Hardcoded Localhost URLs**: Development URLs leaked into production builds.
5. **Wrong OAuth Callback URL**: Google Console callback URL didn't match production backend domain.

**How It's Fixed Now:**

✅ CORS uses `FRONTEND_URL` environment variable  
✅ Cookies are marked `secure` + `sameSite` configured per environment  
✅ `app.set("trust proxy", 1)` tells Express to trust Render's reverse proxy  
✅ All URLs use environment variables (no hardcoded localhost)  
✅ OAuth callback URL is production-aware  

---

## Deployment Checklist

### 1️⃣ Backend Deployment (Render)

#### Step 1: Set Environment Variables on Render

Go to your Render service dashboard → Environment → Add the following:

```
NODE_ENV=production
PORT=5000

MONGO_URI=mongodb+srv://your_user:your_password@cluster0.xxxxx.mongodb.net/postkaro?appName=Cluster0
SESSION_SECRET=use_a_strong_random_string_min_32_chars
JWT_SECRET=use_another_strong_random_string_min_32_chars

GOOGLE_CLIENT_ID=915411993528-l10mfto4pu1h6o85kemnb1msesgcfm0c.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://postkaro-main.onrender.com/api/auth/google/callback

FRONTEND_URL=https://postkaro.vercel.app

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

UNSPLASH_ACCESS_KEY=your_unsplash_key
PEXELS_API_KEY=your_pexels_key
```

**CRITICAL Notes:**
- `FRONTEND_URL` must match your exact Vercel domain (including https://)
- `GOOGLE_CALLBACK_URL` must point to `https://postkaro-main.onrender.com/api/auth/google/callback`
- Use strong random strings for `SESSION_SECRET` and `JWT_SECRET`

#### Step 2: Verify Backend Start Script

Check your `backend/package.json` has:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

Render will automatically run `npm start`.

#### Step 3: Test Backend Health Check

After deployment, visit:
```
https://postkaro-main.onrender.com/api/health
```

Should return: `{"success": true, "message": "PostKaro API is running", ...}`

---

### 2️⃣ Frontend Deployment (Vercel)

#### Step 1: Create `.env.production.local` File (Local Only)

In your frontend root, create `.env.production.local` with production values:

```env
VITE_API_URL=https://postkaro-main.onrender.com/api
VITE_SOCKET_URL=https://postkaro-main.onrender.com
VITE_APP_NAME=PostKaro
```

**⚠️ DO NOT commit this file to Git** — add to `.gitignore`

#### Step 2: Build Locally to Test

```bash
cd frontend
npm run build
```

This injects the production env vars into the build.

#### Step 3: Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Or use Vercel's Git integration:
1. Push to GitHub
2. Vercel auto-detects and deploys
3. Set environment variables in Vercel dashboard if needed

#### Step 4: Verify Frontend

Visit `https://postkaro.vercel.app` and check:
- ✅ API calls reach backend (check Network tab)
- ✅ WebSocket connects (check Console for Socket.IO logs)
- ✅ Google login redirects correctly

---

### 3️⃣ Google OAuth Setup

#### Step 1: Update Google Console

Go to [Google Cloud Console](https://console.cloud.google.com):

1. Select your project
2. Navigate to **APIs & Services > Credentials**
3. Find your OAuth 2.0 Client ID (type: Web application)
4. Click **Edit**
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:5000/api/auth/google/callback` (dev)
   - `https://postkaro-main.onrender.com/api/auth/google/callback` (prod)
6. Save

#### Step 2: Verify Credentials Match

- `GOOGLE_CLIENT_ID` in .env = matches Google Console
- `GOOGLE_CLIENT_SECRET` in .env = matches Google Console
- `GOOGLE_CALLBACK_URL` in backend .env = exactly matches Google Console

#### Step 3: Test OAuth Flow

1. Go to `https://postkaro.vercel.app/login`
2. Click "Login with Google"
3. Should redirect to Google login
4. After auth, should redirect to `https://postkaro.vercel.app/auth/callback?token=...`
5. Should auto-login and redirect to feed

---

## Environment Variables Reference

### Backend (.env on Render)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | App environment | `production` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection | `mongodb+srv://...` |
| `SESSION_SECRET` | Session encryption | 32+ char random string |
| `JWT_SECRET` | JWT signing key | 32+ char random string |
| `FRONTEND_URL` | Frontend domain (CORS) | `https://postkaro.vercel.app` |
| `GOOGLE_CLIENT_ID` | OAuth client ID | From Google Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | From Google Console |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI | `https://postkaro-main.onrender.com/api/auth/google/callback` |
| `EMAIL_SERVICE` | Email provider | `gmail` |
| `EMAIL_USER` | Sender email | your_email@gmail.com |
| `EMAIL_PASS` | App password | Gmail App Password |
| `UNSPLASH_ACCESS_KEY` | Unsplash API | From unsplash.com/developers |
| `PEXELS_API_KEY` | Pexels API | From pexels.com/api |

### Frontend (`.env.production.local` — not committed)

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API base URL | `https://postkaro-main.onrender.com/api` |
| `VITE_SOCKET_URL` | Socket.IO base URL | `https://postkaro-main.onrender.com` |
| `VITE_APP_NAME` | App name | `PostKaro` |

---

## CORS Configuration Explained

**Backend (server.js):**
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL,     // Only allow Vercel domain
  credentials: true                      // Allow cookies
};
app.use(cors(corsOptions));
```

**How it works:**
- In dev: `FRONTEND_URL=http://localhost:5173` → allows localhost
- In prod: `FRONTEND_URL=https://postkaro.vercel.app` → allows only Vercel

**Why credentials=true matters:**
- Allows cookies to be sent in cross-origin requests
- Required for Google OAuth sessions to work

---

## Session & Cookie Configuration

**Backend (server.js):**
```javascript
app.set("trust proxy", 1);  // Trust Render's reverse proxy for IP detection

app.use(expressSession({
  // ... config ...
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,  // 24 hours
    secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));
```

**What this does:**
- `secure: true` in prod: Prevents cookies over HTTP (security)
- `secure: false` in dev: Allows cookies over HTTP for localhost
- `sameSite: "none"` in prod: Allows cross-site cookies (required for OAuth)
- `sameSite: "lax"` in dev: Standard development security

---

## Socket.IO Production Configuration

**Backend (server.js):**
```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,  // Same as Express CORS
    credentials: true
  }
});
```

**Frontend (SocketContext.jsx):**
```javascript
const SOCKET_URL = import.meta.env.DEV
  ? ''                                    // Dev: let Vite proxy it
  : import.meta.env.VITE_SOCKET_URL;     // Prod: use env variable

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],  // WebSocket first, fallback to polling
  withCredentials: true,                 // Send cookies
  reconnection: true
});
```

**In production:**
- Frontend sends WebSocket to `https://postkaro-main.onrender.com`
- Render proxies to Express server
- Socket.IO verifies CORS + credentials

---

## Common Issues & Fixes

### Issue: CORS Error on Login

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Fix:**
1. Verify `FRONTEND_URL` on Render matches your Vercel domain exactly (including https://)
2. Restart Render deployment
3. Clear browser cache and try again

### Issue: Google OAuth Redirect Loop

**Error:** Redirects to `/login` with `error=google_auth_failed`

**Cause:** `GOOGLE_CALLBACK_URL` doesn't match Google Console  

**Fix:**
1. Go to Google Console → OAuth 2.0 Client > Edit
2. Verify authorized redirect URIs includes: `https://postkaro-main.onrender.com/api/auth/google/callback`
3. Update backend `.env` to match exactly
4. Restart Render deployment

### Issue: WebSocket Connection Fails

**Error:** `WebSocket closed before established` or `Connection refused`

**Fix:**
1. Verify `VITE_SOCKET_URL` points to Render backend URL
2. Verify Socket.IO CORS includes your Vercel domain
3. Check Render logs for connection errors
4. Try disabling ad blockers (some block WebSocket)

### Issue: Cookies Not Persisting

**Error:** User logged out after page refresh

**Cause:** Cookies marked `secure` but using HTTP (or vice versa)

**Fix:**
1. Set `NODE_ENV=production` on Render
2. Verify `FRONTEND_URL` uses https://
3. Clear browser cookies and login again

### Issue: Session Not Working in Production

**Error:** Session lost, need to re-login every request

**Cause:** `app.set("trust proxy", 1)` missing or backend not reading env vars

**Fix:**
1. Ensure `server.js` has `app.set("trust proxy", 1)`
2. Verify `NODE_ENV=production` on Render
3. Check Render logs: `express-session` should show session store warnings if misconfigured
4. Restart Render deployment

---

## Security Checklist

- [ ] `SESSION_SECRET` is 32+ random characters (not default)
- [ ] `JWT_SECRET` is 32+ random characters (not default)
- [ ] `NODE_ENV=production` on Render
- [ ] `FRONTEND_URL` uses https:// (not http://)
- [ ] `GOOGLE_CLIENT_SECRET` not committed to Git
- [ ] `.env` file in `.gitignore`
- [ ] Email password is Gmail App Password (not main password)
- [ ] Render environment variables are marked private
- [ ] Vercel environment variables are marked private
- [ ] CORS origin is exact domain (no wildcards in prod)

---

## Monitoring & Debugging

### Check Backend Logs on Render

```bash
# View real-time logs
vercel logs [project-name] --follow
# Or use Render dashboard → Logs tab
```

**Look for:**
- CORS warnings: `[CORS] Blocked origin: ...`
- Session warnings: `connect-mongo` connection issues
- OAuth errors: Passport authentication failures

### Check Frontend Logs in Browser

Open DevTools → Console:

```javascript
// Check environment variables
console.log(import.meta.env.VITE_API_URL)
console.log(import.meta.env.VITE_SOCKET_URL)

// Check network requests
// Network tab → look for API requests to Render domain
```

### Test OAuth Callback

```bash
# Test from terminal
curl -v "https://postkaro-main.onrender.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Redeploy Checklist

After making changes:

1. **Backend changes:**
   - Push to GitHub
   - Render auto-redeploys (or manually trigger)
   - Wait ~2 min for startup
   - Test `/api/health` endpoint

2. **Frontend changes:**
   - Run `npm run build` locally to test
   - Push to GitHub
   - Vercel auto-redeploys
   - Wait ~1 min
   - Test app in new incognito window

3. **Environment variable changes:**
   - Update Render dashboard → Environment
   - Manually redeploy from Render dashboard
   - Or push dummy commit to trigger auto-redeploy

---

## Need Help?

Check these logs:
- **Render logs**: Backend errors, OAuth failures, session issues
- **Vercel logs**: Build errors, environment variable issues
- **Browser DevTools**: CORS errors, network failures, Socket.IO issues
- **Google Cloud Console**: OAuth configuration and redirect URIs

See error pattern? Search GitHub issues or ask in community forums.
