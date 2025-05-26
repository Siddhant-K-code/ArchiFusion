# Quick Neon Setup Guide for ArchiFusion

## 🚀 Getting Started with Neon

### Step 1: Create Neon Account
1. Visit [neon.tech](https://neon.tech)
2. Sign up with GitHub, Google, or email
3. Verify your email if needed

### Step 2: Create Your First Project
1. Click "Create Project"
2. Choose a project name (e.g., "archifusion")
3. Select a region (choose closest to your users)
4. Click "Create Project"

### Step 3: Get Connection Details
1. In your project dashboard, find "Connection Details"
2. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### Step 4: Configure Your App
1. Create `.env.local` in your project root:
   ```bash
   DATABASE_URL="your-neon-connection-string-here"
   DIRECT_URL="your-neon-connection-string-here"
   ```

2. Run database setup:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

## 🌟 Neon Features You'll Love

### Database Branching
- Create branches for development, staging, production
- Each branch is an isolated database
- Perfect for testing schema changes

### Auto-Scaling
- Scales to zero when not in use (saves money!)
- Automatically wakes up on first query
- No connection limits to worry about

### Built-in Connection Pooling
- No need to configure external pooling
- Handles thousands of connections efficiently
- Perfect for serverless applications

## 📊 Neon Plans

### Free Tier (Perfect for Development)
- **Storage**: 3 GB
- **Compute**: 100 hours/month
- **Branches**: 10
- **Projects**: 1

### Pro Tier (For Production)
- **Storage**: 200 GB included
- **Compute**: Always-on option
- **Branches**: Unlimited
- **Projects**: Unlimited
- **Point-in-time recovery**: 7 days

## 🔧 Common Neon Tasks

### Creating a Branch
```bash
# Using Neon CLI (optional)
npm install -g neonctl
neonctl branches create --name staging
```

### Connecting to Different Branches
```bash
# Development branch
DATABASE_URL="postgresql://user:pass@ep-dev-123.region.aws.neon.tech/neondb?sslmode=require"

# Production branch
DATABASE_URL="postgresql://user:pass@ep-prod-456.region.aws.neon.tech/neondb?sslmode=require"
```

### Monitoring Usage
- Check your Neon dashboard for:
  - Storage usage
  - Compute hours used
  - Connection statistics
  - Query performance

## 🚨 Important Notes

### Connection Requirements
- Always include `?sslmode=require` in your connection string
- Neon requires SSL connections for security

### IP Restrictions
- Free tier: No IP restrictions
- Some paid tiers may have IP allowlist features
- Check your plan if you have connection issues

### Auto-Suspend
- Free tier databases auto-suspend after 5 minutes of inactivity
- Pro tier can be configured for always-on
- First query after suspend may take a few seconds

## 🔍 Troubleshooting

### Connection Issues
```bash
# Test connection with psql
psql "postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

### Common Error Messages
- **"connection refused"**: Check if database is suspended
- **"SSL required"**: Add `?sslmode=require` to connection string
- **"authentication failed"**: Verify username/password in connection string

### Performance Optimization
- Use connection pooling (built-in with Neon)
- Enable prepared statements in Prisma
- Monitor slow queries in Neon dashboard

## 🔗 Useful Links

- [Neon Documentation](https://neon.tech/docs)
- [Neon with Prisma Guide](https://neon.tech/docs/guides/prisma)
- [Neon CLI Documentation](https://neon.tech/docs/reference/cli-reference)
- [Neon Status Page](https://neonstatus.com/)

## 💡 Pro Tips

1. **Use branches for schema changes**: Test migrations safely
2. **Monitor your usage**: Keep an eye on compute hours
3. **Set up monitoring**: Use Neon's built-in metrics
4. **Backup strategy**: Neon auto-backups, but consider additional backups for critical data
5. **Region selection**: Choose region closest to your application deployment
