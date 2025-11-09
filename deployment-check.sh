#!/bin/bash
set -e

echo "🔍 Pre-Deployment Checklist for Render.com"
echo "=========================================="
echo ""

# 1. Check for Replit-specific hardcoded URLs
echo "✓ Checking for hardcoded Replit URLs..."
if grep -r "replit\.dev" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null | grep -v "APP_URL\|REPLIT_DEV_DOMAIN"; then
  echo "❌ Found hardcoded replit.dev URLs! Please use environment variables."
  exit 1
fi
echo "  ✅ No hardcoded Replit URLs found"

# 2. Verify cache headers on public endpoints
echo ""
echo "✓ Verifying cache-busting headers..."
if ! grep -q "Cache-Control.*no-store" server/routes.ts; then
  echo "❌ Missing cache headers on public endpoints!"
  exit 1
fi
echo "  ✅ Cache-Control headers configured"

# 3. Check environment variables documentation
echo ""
echo "✓ Required environment variables for Render:"
echo "  - DATABASE_URL (PostgreSQL connection string)"
echo "  - APP_URL (e.g., https://your-app.onrender.com)"
echo "  - SESSION_SECRET (random string)"
echo "  - RESEND_API_KEY (email notifications)"
echo "  - TWILIO_ACCOUNT_SID (SMS notifications)"
echo "  - TWILIO_AUTH_TOKEN (SMS notifications)"
echo "  - TWILIO_PHONE_NUMBER (SMS sender)"
echo "  - STRIPE_SECRET_KEY (payments)"
echo "  - VITE_STRIPE_PUBLIC_KEY (frontend payments)"

# 4. Verify build scripts
echo ""
echo "✓ Checking build configuration..."
if ! grep -q '"build":' package.json; then
  echo "❌ Missing build script!"
  exit 1
fi
echo "  ✅ Build scripts configured"

# 5. Test build (dry run)
echo ""
echo "✓ Testing production build..."
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed! Run 'npm run build' to see errors"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ All pre-deployment checks passed!"
echo ""
echo "🚀 Ready to deploy to Render.com"
echo ""
echo "Next steps:"
echo "1. Ensure all environment variables are set in Render dashboard"
echo "2. Push to your GitHub repository (main branch)"
echo "3. Render will automatically build and deploy"
echo ""
