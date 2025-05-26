# Usage Tracking & Simplified Pricing Implementation

## 📊 Overview

ArchiFusion now implements a simplified pricing structure with usage tracking:

- **Free Tier**: 2 generations per user (lifetime)
- **Pro Tier**: $5/month for unlimited generations
- **Usage Tracking**: Real-time generation counting
- **Upgrade Prompts**: Modal popup when limit reached

---

## 🎯 Pricing Structure

### Free Plan
- **Price**: $0
- **Generations**: 2 total (not monthly)
- **Features**:
  - Basic 3D visualization
  - Export to GLTF/OBJ
  - Community support
- **Limitations**:
  - Limited to 2 generations total
  - Basic features only

### Pro Plan
- **Price**: $5/month
- **Generations**: Unlimited
- **Features**:
  - Unlimited AI model generations
  - Advanced 3D visualization
  - High-resolution exports
  - Custom lighting and materials
  - Priority support
  - Commercial usage rights
  - Save unlimited projects

---

## 🗄️ Database Changes

### User Schema Update
```prisma
model User {
  // ... existing fields
  generationsUsed Int @default(0)  // Track how many generations user has used
  // ... rest of schema
}
```

### Migration Applied
- Added `generationsUsed` field to track user generation count
- Migration: `20250526053205_add_generations_used`

---

## 🔧 API Implementation

### Usage Tracking API (`/api/usage`)

**GET** - Check user usage:
```json
{
  "generationsUsed": 1,
  "generationsRemaining": 1,
  "isPro": false,
  "canGenerate": true
}
```

**POST** - Increment usage counter:
```json
{
  "generationsUsed": 2,
  "generationsRemaining": 0,
  "isPro": false,
  "canGenerate": false
}
```

**Error Response** (when limit reached):
```json
{
  "error": "Generation limit reached",
  "needsUpgrade": true,
  "generationsUsed": 2,
  "limit": 2
}
```

---

## 🎨 UI Components

### Upgrade Modal (`components/upgrade-modal.tsx`)
- **Triggers**: When free user reaches 2 generation limit
- **Features**:
  - Shows current usage
  - Lists Pro plan benefits
  - Direct Stripe checkout integration
  - "Maybe Later" option

### Dashboard Updates
- **Usage Display**: Shows generations used/remaining
- **Plan Status**: Free vs Pro indicator
- **Quick Upgrade**: Link to pricing page

### Main Page Integration
- **Auth Check**: Requires login to generate
- **Usage Validation**: Checks limits before generation
- **Auto-increment**: Updates usage counter on successful generation
- **Upgrade Prompt**: Shows modal when limit reached

---

## 🔄 User Flow

### Free User Journey
1. **Sign Up** → Gets 2 free generations
2. **Generate Model** → Usage increments (1/2 used)
3. **Generate Again** → Usage increments (2/2 used)
4. **Try to Generate** → Upgrade modal appears
5. **Upgrade** → Redirects to Stripe checkout

### Pro User Experience
- Unlimited generations
- No usage tracking limitations
- Priority features enabled

---

## 🛠️ Implementation Details

### Generation Limit Check
```typescript
// Before each generation
if (userUsage && !userUsage.canGenerate) {
  setShowUpgradeModal(true);
  return;
}
```

### Usage Increment
```typescript
// After successful generation
const usageResponse = await fetch("/api/usage", {
  method: "POST",
});
```

### Pro User Detection
```typescript
const isPro = user.subscription?.stripeSubscriptionId && 
              user.subscription?.stripeCurrentPeriodEnd && 
              user.subscription.stripeCurrentPeriodEnd > new Date();
```

---

## 📋 Configuration Required

### 1. Stripe Product Setup
1. Create **ONE** product in Stripe Dashboard
2. Set price to **$5/month recurring**
3. Copy the `price_xxx` ID
4. Update in two files:
   - `app/pricing/page.tsx`
   - `components/upgrade-modal.tsx`

### 2. Environment Variables
```bash
# Same as before - no new variables needed
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3. Database Migration
```bash
# Already applied - just for reference
npx prisma migrate dev --name add_generations_used
npx prisma generate
```

---

## 🧪 Testing Checklist

### Free User Testing
- [ ] New user gets 2 generations
- [ ] Usage increments correctly (0→1→2)
- [ ] Dashboard shows correct usage
- [ ] Upgrade modal appears at limit
- [ ] Modal links to Stripe checkout

### Pro User Testing
- [ ] Pro users have unlimited generations
- [ ] Dashboard shows "Pro" status
- [ ] No usage limitations
- [ ] Subscription status detection works

### Edge Cases
- [ ] Authentication required for generation
- [ ] Usage persists across sessions
- [ ] Concurrent generation handling
- [ ] Stripe webhook updates subscription status

---

## 🔧 Stripe Configuration

### Product Creation Steps
1. **Go to Stripe Dashboard** → Products
2. **Create New Product**:
   - Name: "ArchiFusion Pro"
   - Description: "Unlimited architectural design generations"
3. **Add Pricing**:
   - Price: $5.00
   - Billing: Monthly
   - Currency: USD
4. **Copy Price ID**: `price_xxxxxxxxxxxxx`
5. **Update Code**: Replace `price_your_actual_pro_price_id` in:
   - `app/pricing/page.tsx` (line ~28)
   - `components/upgrade-modal.tsx` (line ~37)

---

## 📊 Analytics & Monitoring

### Key Metrics to Track
- **Conversion Rate**: Free → Pro upgrades
- **Usage Patterns**: How quickly users hit limits
- **Churn Rate**: Pro subscription cancellations
- **Generation Volume**: Total generations per month

### Stripe Dashboard Monitoring
- Monthly Recurring Revenue (MRR)
- Subscription growth
- Failed payment alerts
- Webhook delivery status

---

## 🚀 Future Enhancements

### Short Term
- [ ] Email notifications for limit reached
- [ ] Grace period for expired Pro users
- [ ] Usage analytics dashboard

### Long Term
- [ ] Team collaboration features
- [ ] Annual subscription discount
- [ ] API access tier
- [ ] Enterprise custom pricing

---

## 🔍 Troubleshooting

### Common Issues

**Usage not incrementing:**
- Check API route `/api/usage` is working
- Verify database connection
- Check session authentication

**Upgrade modal not showing:**
- Verify `userUsage.canGenerate` logic
- Check modal state management
- Ensure usage fetch is working

**Stripe checkout fails:**
- Verify price ID is correct
- Check Stripe environment keys
- Test with Stripe test mode first

### Debug Commands
```bash
# Check user usage in database
npx prisma studio

# Test API endpoint
curl -X GET http://localhost:3000/api/usage \
  -H "Cookie: next-auth.session-token=your-session"

# Verify Stripe webhook
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

---

## ✅ Summary

The implementation provides:
- **Simple pricing**: Only $5/month Pro plan
- **Clear limits**: 2 free generations total
- **Smooth UX**: Upgrade modal with direct checkout
- **Real-time tracking**: Accurate usage monitoring
- **Pro benefits**: Unlimited generations and features

Users get a taste of the product with 2 free generations, then a simple $5/month upgrade for unlimited access - optimized for conversion and user satisfaction.