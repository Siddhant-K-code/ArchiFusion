# 🚀 Production Deployment Guide - ArchiFusion

This guide will walk you through setting up ArchiFusion for production deployment with NextAuth, Google OAuth, GitHub OAuth, Stripe, and Neon database.

## 📋 Prerequisites

- [Netlify Account](https://netlify.com) for deployment
- [Neon Account](https://neon.tech) for database
- [Stripe Account](https://stripe.com) for payments
- [Google Cloud Console](https://console.cloud.google.com) access
- [GitHub Developer Settings](https://github.com/settings/developers) access
- Domain name (optional, but recommended)

## 🎯 Deployment Overview

We'll deploy to **Netlify** which provides excellent support for Next.js applications with their Essential Next.js plugin.

---

## Step 1: 🗄️ Database Setup (Neon)

### 1.1 Create Production Database

1. **Go to [Neon Console](https://console.neon.tech)**
2. **Create a new project** or use existing
3. **Create production branch**:
   - Click "Branches" in sidebar
   - Click "Create Branch"
   - Name: `production`
   - Base it on `main` branch
4. **Get connection string**:
   - Select your `production` branch
   - Copy the connection string

### 1.2 Save Database URLs

```bash
# Production URLs (save these for later)
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

---

## Step 2: 🚀 Deploy to Netlify

### 2.1 Initial Deployment

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add authentication and Stripe integration"
   git push origin main
   ```

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to your GitHub repository
   - **Build settings**:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Click "Deploy site"

3. **Enable Next.js Runtime**:
   - In your Netlify dashboard, go to "Site configuration" → "Functions"
   - Enable "Essential Next.js Plugin" (should auto-detect)
   - Or add to `netlify.toml` in your project root:

   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

4. **Get your production URL**:
   - After deployment, you'll get a URL like: `https://archifusion-xyz.netlify.app`
   - **Save this URL** - you'll need it for OAuth setup

### 2.2 Custom Domain (Optional but Recommended)

1. **In Netlify Dashboard**:
   - Go to your site
   - Click "Domain settings" → "Add custom domain"
   - Add your custom domain (e.g., `archifusion.com`)
   - Follow DNS setup instructions
   - Netlify will automatically provision SSL certificate

2. **Use custom domain for the rest of this guide** if you set one up

---

## Step 3: 🔐 NextAuth Production Setup

### 3.1 Generate Production Secret

```bash
# Generate a strong secret
openssl rand -base64 32
```

### 3.2 Environment Variables

**In Netlify Dashboard**:
1. Go to your site
2. Click "Site configuration" → "Environment variables"
3. Add these variables:

```bash
# App Settings
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-generated-secret-from-step-3.1

# Database (from Step 1)
DATABASE_URL=your-neon-production-url
DIRECT_URL=your-neon-production-url
```

---

## Step 4: 🔵 Google OAuth Setup

### 4.1 Create Google OAuth Application

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**

2. **Create/Select Project**:
   - Create new project or select existing
   - Name it "ArchiFusion" or similar

3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Search and enable "Google+ API"
   - Search and enable "People API"

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (for public app)
   - Fill required fields:
     - App name: "ArchiFusion"
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (optional for testing)

5. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "ArchiFusion Web Client"
   - **Authorized JavaScript origins**:
     ```
     https://your-domain.com
     ```
   - **Authorized redirect URIs**:
     ```
     https://your-domain.com/api/auth/callback/google
     ```
   - Click "Create"

6. **Save Credentials**:
   - Copy `Client ID` and `Client Secret`
   - Add to Netlify environment variables:
     ```bash
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     ```

### 4.2 Verify Google OAuth

1. **Redeploy your app** (Netlify will auto-deploy on env var changes or push to main branch)
2. **Test**: Go to `https://your-domain.com/auth/signin`
3. **Click "Google"** button and verify OAuth flow works

---

## Step 5: 🐙 GitHub OAuth Setup

### 5.1 Create GitHub OAuth Application

1. **Go to [GitHub Developer Settings](https://github.com/settings/developers)**

2. **Create OAuth App**:
   - Click "New OAuth App"
   - Fill details:
     - Application name: "ArchiFusion"
     - Homepage URL: `https://your-domain.com`
     - Application description: "AI-powered architectural design platform"
     - **Authorization callback URL**: `https://your-domain.com/api/auth/callback/github`
   - Click "Register application"

3. **Get Credentials**:
   - Copy `Client ID`
   - Click "Generate a new client secret"
   - Copy `Client Secret`

4. **Add to Netlify Environment Variables**:
   ```bash
   GITHUB_ID=your-github-client-id
   GITHUB_SECRET=your-github-client-secret
   ```

### 5.2 Verify GitHub OAuth

1. **Test**: Go to `https://your-domain.com/auth/signin`
2. **Click "GitHub"** button and verify OAuth flow works

---

## Step 6: 💳 Stripe Production Setup

### 6.1 Stripe Account Setup

1. **Go to [Stripe Dashboard](https://dashboard.stripe.com)**
2. **Switch to Live Mode** (toggle in left sidebar)
3. **Activate your account** (complete business verification if needed)

### 6.2 Create Products and Prices

1. **Create Products**:
- Go to "Products" in Stripe Dashboard
- Create one product:
- **Pro Plan**: $5/month recurring

2. **Copy Price ID**:
   - Click on the Pro Plan product
- Copy the `price_xxx` ID
- Update in `app/pricing/page.tsx` and `components/upgrade-modal.tsx`:

```typescript
// In app/pricing/page.tsx
const plans = [
// ... free plan (2 generations)
{
name: "Pro",
price: "$5",
priceId: "price_your_actual_pro_price_id", // Replace with your Stripe price ID
// ... rest of plan
},
];

// Also update in components/upgrade-modal.tsx
priceId: "price_your_actual_pro_price_id"
```

### 6.3 Stripe Environment Variables

**Add to Netlify Environment Variables**:

```bash
# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
```

### 6.4 Setup Production Webhooks

1. **In Stripe Dashboard**:
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.com/api/stripe/webhooks`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
   - Click "Add endpoint"

2. **Get Webhook Secret**:
   - Click on your newly created webhook
   - Click "Reveal" next to "Signing secret"
   - Copy the `whsec_xxx` value

3. **Add to Netlify Environment Variables**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

---

## Step 7: 🗃️ Database Migration

### 7.1 Run Production Migration

1. **Install Prisma CLI globally** (if not already):
   ```bash
   npm install -g prisma
   ```

2. **Set environment variables locally** for migration:
   ```bash
   # Create a temporary .env file for migration
   echo "DATABASE_URL=your-neon-production-url" > .env.production
   echo "DIRECT_URL=your-neon-production-url" >> .env.production
   ```

3. **Run migration**:
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

4. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

5. **Clean up**:
   ```bash
   rm .env.production
   ```

---

## Step 8: 🧪 Testing Production Setup

### 8.1 Test Authentication

1. **Visit your production site**: `https://your-domain.com`
2. **Test registration**:
   - Go to `/auth/signup`
   - Create account with email/password
   - Verify you're redirected to dashboard
3. **Test OAuth**:
   - Sign out and go to `/auth/signin`
   - Test Google OAuth
   - Test GitHub OAuth

### 8.2 Test Stripe Integration

1. **Visit pricing page**: `https://your-domain.com/pricing`
2. **Test checkout flow**:
   - Click on a paid plan
   - Complete Stripe checkout with test card: `4242 4242 4242 4242`
   - Verify webhook processing
   - Check user subscription status in dashboard

### 8.3 Test Project Management

1. **Create a new project** on the main page
2. **Verify it saves** to your account
3. **Check dashboard** for project list

---

## Step 9: 🔒 Security & Performance

### 9.1 Environment Variable Security

**Ensure these are set in Vercel**:
- All secrets are marked as "Production" and "Preview" environments
- No secrets are committed to Git
- Webhook secrets are properly configured

### 9.2 CORS and Security Headers

**Add to `next.config.mjs`**:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

### 9.3 Rate Limiting (Optional)

Consider adding rate limiting for API routes to prevent abuse.

---

## Step 10: 📊 Monitoring & Analytics

### 10.1 Netlify Analytics

1. **Enable Netlify Analytics**:
   - Go to your Netlify site dashboard
   - Click "Analytics" tab
   - Enable Site Analytics (may require paid plan)
   - Alternative: Integrate Google Analytics for free analytics

### 10.2 Stripe Dashboard Monitoring

- Monitor subscription metrics
- Set up email notifications for failed payments
- Review webhook delivery logs

### 10.3 Neon Monitoring

- Monitor database usage in Neon console
- Set up alerts for high usage
- Review query performance

---

## 🎉 Production Checklist

### ✅ Authentication
- [ ] NextAuth configured with production URL
- [ ] Google OAuth working with production domain
- [ ] GitHub OAuth working with production domain
- [ ] Strong NEXTAUTH_SECRET generated and set
- [ ] Email/password registration working

### ✅ Database
- [ ] Neon production database created
- [ ] Migration deployed successfully
- [ ] Connection strings configured in Vercel
- [ ] Database accessible from production app

### ✅ Payments
- [ ] Stripe live mode activated
- [ ] Products and prices created
- [ ] Live API keys configured
- [ ] Webhooks set up and tested
- [ ] Test payment completed successfully

### ✅ Deployment
- [ ] App deployed to Netlify
- [ ] Essential Next.js plugin enabled
- [ ] Custom domain configured (if applicable)
- [ ] All environment variables set
- [ ] HTTPS working properly
- [ ] No console errors in production

### ✅ Testing
- [ ] User registration flow tested
- [ ] OAuth flows tested
- [ ] Payment flow tested
- [ ] Project creation/saving tested
- [ ] Dashboard functionality verified

---

## 🆘 Troubleshooting

### Authentication Issues

**Problem**: OAuth redirect errors
**Solution**:
- Verify callback URLs match exactly in OAuth provider settings
- Ensure NEXTAUTH_URL is set correctly in Netlify environment variables
- Check that domain is accessible and SSL certificate is active

**Problem**: "Invalid credentials" on sign-in
**Solution**:
- Verify OAuth client IDs and secrets are correct
- Check that OAuth apps are not in development mode
- Ensure callback URLs are whitelisted

### Stripe Issues

**Problem**: Webhooks not triggering
**Solution**:
- Verify webhook URL is accessible
- Check webhook secret matches
- Review Stripe webhook logs
- Ensure endpoint returns 200 status

**Problem**: Payment not processing
**Solution**:
- Verify using live API keys
- Check that products/prices exist in Stripe
- Ensure customer creation is working

### Database Issues

**Problem**: Connection errors
**Solution**:
- Verify Neon database is not suspended
- Check connection string format
- Ensure SSL mode is required
- Verify IP restrictions in Neon

---

## 📞 Support Resources

- [NextAuth.js Deployment Guide](https://next-auth.js.org/deployment)
- [Netlify Next.js Documentation](https://docs.netlify.com/frameworks/next-js/)
- [Netlify Essential Next.js Plugin](https://github.com/netlify/netlify-plugin-nextjs)
- [Stripe Go-Live Checklist](https://stripe.com/docs/go-live)
- [Neon Documentation](https://neon.tech/docs)

---

## 🔄 Post-Deployment Updates

When making updates:

1. **Code changes**: Git push triggers auto-deployment on Netlify
2. **Environment variables**: Update in Netlify site configuration
3. **Database changes**: Run `prisma migrate deploy`
4. **OAuth changes**: Update callback URLs in provider settings

Your ArchiFusion app is now ready for production! 🎉
