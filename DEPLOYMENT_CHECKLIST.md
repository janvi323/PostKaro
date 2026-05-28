# PostKaro Production Deployment Checklist

## Pre-Deployment

### Backend (Render)

- [ ] MongoDB Atlas URI is correct and cluster allows Render IP
- [ ] Created strong SESSION_SECRET (min 32 chars)
- [ ] Created strong JWT_SECRET (min 32 chars)
- [ ] Google OAuth credentials obtained from Google Console
- [ ] Authorized redirect URI added to Google Console: `https://postkaro-main.onrender.com/api/auth/google/callback`
- [ ] FRONTEND_URL set to exact Vercel domain (e.g., `https://postkaro.vercel.app`)
- [ ] Gmail App Password generated and EMAIL credentials configured
- [ ] Unsplash and Pexels API keys obtained
- [ ] All sensitive values reviewed and set in Render dashboard

### Frontend (Vercel)

- [ ] Created `.env.production.local` with production URLs
- [ ] VITE_API_URL points to Render backend (e.g., `https://postkaro-main.onrender.com/api`)
- [ ] VITE_SOCKET_URL points to Render backend (e.g., `https://postkaro-main.onrender.com`)
- [ ] `.env.production.local` added to `.gitignore`
- [ ] Verified file is NOT committed to Git

### Google Cloud Console

- [ ] OAuth 2.0 Client credentials obtained
- [ ] Authorized redirect URIs include BOTH:
  - [ ] `http://localhost:5000/api/auth/google/callback` (dev)
  - [ ] `https://postkaro-main.onrender.com/api/auth/google/callback` (prod)

---

## Deployment Steps

### 1. Deploy Backend to Render

```bash
# Step 1: Push code to GitHub
git add .
git commit -m "Production deployment configuration"
git push origin main

# Step 2: Go to Render dashboard
# - Select your backend service
# - Environment → Add all variables from .env.production.example
# - Save and auto-redeploy (or manually trigger)

# Step 3: Wait for deployment to complete
# Monitor Render dashboard → Logs tab
```

### 2. Verify Backend is Running

```bash
# Should return health check response
curl https://postkaro-main.onrender.com/api/health
```

### 3. Deploy Frontend to Vercel

```bash
# Step 1: Create .env.production.local with production URLs
# (see .env.production.example)

# Step 2: Build locally (optional, to test)
cd frontend
npm run build

# Step 3: Deploy
# Option A - Git-based:
git push origin main
# Vercel auto-detects and deploys

# Option B - Direct deploy:
npm install -g vercel
vercel --prod

# Step 4: Wait for deployment
# Monitor Vercel dashboard
```

---

## Post-Deployment Verification

### ✅ Backend Health Check

```bash
curl https://postkaro-main.onrender.com/api/health
# Expected: {"success": true, "message": "PostKaro API is running", ...}
```

### ✅ Frontend Loading

Visit `https://postkaro.vercel.app`:
- [ ] Page loads without CORS errors
- [ ] Navigation works
- [ ] Images load correctly

### ✅ API Connectivity

Open DevTools → Network:
- [ ] API calls go to `postkaro-main.onrender.com`
- [ ] Status 200 for successful calls
- [ ] No CORS errors in console

### ✅ Socket.IO Connection

Open DevTools → Console:
- [ ] Should see `[Socket] Connected: ...` message
- [ ] No connection errors
- [ ] No WebSocket failures

### ✅ Google OAuth Flow

1. Go to `/login`
2. Click "Login with Google"
3. Redirects to Google login page
4. After auth, redirects back to `/auth/callback?token=...`
5. Automatically logged in and redirected to `/feed`
6. User profile loads correctly

### ✅ Core Features

- [ ] Create a post with image upload
- [ ] Like/unlike posts
- [ ] Follow/unfollow users
- [ ] View notifications
- [ ] Send chat messages (Socket.IO)
- [ ] View online users
- [ ] Search functionality

---

## Troubleshooting Quick Guide

| Issue | Check | Fix |
|-------|-------|-----|
| CORS error | `FRONTEND_URL` on Render | Must match Vercel domain exactly (https://) |
| OAuth fails | Google Console redirect URIs | Add `https://postkaro-main.onrender.com/api/auth/google/callback` |
| WebSocket fails | `VITE_SOCKET_URL` in frontend | Must point to Render backend URL |
| Cookies not working | `NODE_ENV=production` | Set on Render, not in code |
| Session lost | `SESSION_SECRET` | Should be random, min 32 chars |
| API 500 errors | Render logs | Check `/logs` tab for error messages |
| API 401 errors | JWT token | Clear localStorage and re-login |
| Images not loading | `VITE_SOCKET_URL` | Should include full domain with scheme |

---

## Performance Monitoring

### Monitor Backend (Render)

- Check Render dashboard for CPU/memory usage
- Monitor database connections in MongoDB Atlas
- Set up alerts for deployment failures

### Monitor Frontend (Vercel)

- Check Vercel dashboard for deployment status
- Monitor Core Web Vitals score
- Check bandwidth usage

### Monitor Errors

- Set up error logging (Sentry, LogRocket)
- Monitor Render logs for exceptions
- Monitor browser console for client errors

---

## Rollback Plan

If deployment fails:

**Backend:**
```bash
# Go to Render dashboard → Deployments
# Select previous successful deployment → Click "Redeploy"
```

**Frontend:**
```bash
# Go to Vercel dashboard → Deployments
# Select previous successful deployment → Click "Redeploy"
```

---

## Schedule

- **Time required**: 30-60 minutes
- **Downtime**: ~5-10 minutes during deployment
- **Best time**: Off-peak hours (avoid user traffic)

---

## Contacts & Resources

- **Render Support**: https://render.com/support
- **Vercel Support**: https://vercel.com/support
- **MongoDB Atlas**: https://www.mongodb.com/support
- **Google Cloud Console**: https://console.cloud.google.com

---

## Sign-Off

- [ ] All checks passed
- [ ] Team notified
- [ ] Users monitoring enabled
- [ ] Rollback plan tested
- [ ] Documentation updated

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Status:** ✅ Live / ⚠️ Issues / ❌ Rolled Back
