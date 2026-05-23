# BayanServe Deployment Guide

## 1. Deploy API to Render
1. Go to render.com and sign up with GitHub
2. Click "New" → "Web Service"
3. Connect your GitHub repository "bayanserve"
4. Settings:
   - Name: bayanserve-api
   - Region: Singapore
   - Branch: main
   - Build Command: cd apps/api && npm install && npm run build
   - Start Command: node apps/api/dist/index.js
   - Plan: Free
5. Add all GROUP B environment variables from the list above
6. Click "Create Web Service"
7. Wait for deployment — takes 3-5 minutes
8. Copy the Render URL (https://bayanserve-api.onrender.com)

## 2. Deploy Frontend to Vercel
1. Go to vercel.com and sign up with GitHub
2. Click "Add New Project"
3. Import your "bayanserve" repository
4. Settings:
   - Framework: Next.js
   - Root Directory: apps/web
   - Build Command: (leave default)
   - Output Directory: (leave default)
5. Add all GROUP A environment variables
6. Update NEXTAUTH_URL to your actual Vercel URL
7. Update NEXT_PUBLIC_API_URL to your Render URL
8. Update NEXT_PUBLIC_SITE_URL to your Vercel URL
9. Update CORS_ORIGIN in Render to match your Vercel URL
10. Click Deploy
11. Wait 2-3 minutes

## 3. Keep Render Awake (Prevent Cold Starts)
1. Go to uptimerobot.com — sign up free
2. Click "Add New Monitor"
3. Type: HTTP(s)
4. URL: https://bayanserve-api.onrender.com/health
5. Interval: Every 5 minutes
6. Click "Create Monitor"
This prevents the free Render service from sleeping.

## 4. Verify Deployment
After both are deployed, test:
- [ ] Homepage loads with Peñablanca branding
- [ ] Citizen can register and receive OTP email
- [ ] Application submission works
- [ ] Admin login works at /admin/login
- [ ] QR verification works on mobile phone
- [ ] Issue E-Document generates PDF correctly
