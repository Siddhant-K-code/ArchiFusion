# Stripe & Authentication Setup Guide

This guide will help you set up Stripe payments and NextAuth authentication for ArchiFusion.

## Prerequisites

- PostgreSQL database
- Stripe account
- Google OAuth app (optional)
- GitHub OAuth app (optional)

## 1. Database Setup with Neon

### Using Neon PostgreSQL (Recommended)

Neon is a serverless PostgreSQL platform that's perfect for Next.js applications.

1. **Create a Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Your Database Connection String**
   - In your Neon dashboard, go to your project
   - Navigate to "Connection Details"
   - Copy the connection string (it looks like this):
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. **Configure Environment Variables**
   
   Create `.env.local` and add your Neon connection string:
   ```bash
   # Neon Database URL
   DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   
   # Optional: Neon direct URL for migrations (recommended)
   DIRECT_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

4. **Update Prisma Schema (if needed)**
   
   Your `prisma/schema.prisma` should have:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```

5. **Run Prisma Migrations**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### Neon Features & Benefits

- **Serverless**: Automatically scales to zero when not in use
- **Branching**: Database branching for development/staging
- **Connection Pooling**: Built-in connection pooling
- **Backups**: Automatic daily backups
- **Free Tier**: 3 GB storage, 100 hours of compute monthly

## 2. NextAuth Setup

### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```bash
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add credentials to `.env.local`:

```bash
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### GitHub OAuth (Optional)

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Add credentials to `.env.local`:

```bash
GITHUB_ID="your-client-id"
GITHUB_SECRET="your-client-secret"
```

## 3. Stripe Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API keys

### 2. Configure Environment Variables

Add to `.env.local`:
```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Create Products and Prices

1. Go to Stripe Dashboard → Products
2. Create products for your plans (e.g., "Pro Plan", "Enterprise Plan")
3. Create recurring prices for each product
4. Copy the price IDs and update them in `app/pricing/page.tsx`

### 4. Set up Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `http://localhost:3000/api/stripe/webhooks`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
4. Copy webhook secret and add to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 5. Test Webhooks Locally (Development)

Install Stripe CLI:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

## 4. Running the Application

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
npx prisma migrate dev
npx prisma generate
```

3. Start the development server:
```bash
npm run dev
```

## 5. Testing the Integration

### Test Authentication

1. Go to `http://localhost:3000/auth/signin`
2. Try signing up with email/password
3. Test OAuth providers if configured

### Test Stripe Integration

1. Go to `http://localhost:3000/pricing`
2. Click on a paid plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete the checkout flow

### Test User Dashboard

1. Sign in to the application
2. Navigate to `http://localhost:3000/dashboard`
3. Verify user data and subscription status

## 6. Production Deployment

### Environment Variables for Production

Update these for production:
```bash
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Neon Production Database
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Database Migration

For Neon, you can either:

**Option 1: Create a new production branch**
```bash
# Create a production branch in Neon dashboard
# Use the production branch connection string
npx prisma migrate deploy
```

**Option 2: Use the same database with different schemas**
```bash
npx prisma migrate deploy
```

### Neon Production Tips

- **Database Branching**: Create separate branches for development, staging, and production
- **Connection Pooling**: Neon automatically handles connection pooling
- **Compute Auto-suspend**: Your database will auto-suspend after inactivity (saves costs)
- **Backups**: Neon automatically creates daily backups

### Webhook Endpoint

Update Stripe webhook endpoint to your production URL:
`https://your-domain.com/api/stripe/webhooks`

## 7. Troubleshooting

### Common Issues

1. **Database connection errors**: Check your DATABASE_URL format and ensure it includes `?sslmode=require`
2. **Authentication not working**: Verify NEXTAUTH_SECRET and OAuth credentials
3. **Stripe webhooks failing**: Ensure webhook URL is accessible and secret is correct
4. **Missing types**: Run `npx prisma generate` after schema changes
5. **Neon connection issues**: 
   - Ensure your IP is not blocked (Neon has IP restrictions on some plans)
   - Check if the database is in a suspended state (it auto-suspends after inactivity)
   - Verify the connection string format includes the correct endpoint and SSL mode

### Logs to Check

- Next.js console output
- Stripe webhook logs in Dashboard
- Database logs
- Browser network tab for API calls

## 8. Security Considerations

- Never commit `.env.local` to version control
- Use strong, unique secrets for production
- Enable HTTPS in production
- Regularly rotate API keys
- Monitor webhook security logs

## Support

If you encounter issues:
1. Check the logs in development tools
2. Verify all environment variables are set correctly
3. Test with Stripe's test mode first
4. Check Stripe webhook logs for delivery status