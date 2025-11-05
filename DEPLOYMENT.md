# Deploy Clean & Green to Render.com

This guide will help you deploy your cleaning business website to Render.com for FREE!

## 🎯 What You Get

- ✅ **FREE hosting** forever
- ✅ **FREE PostgreSQL database** (renew every 90 days for free)
- ✅ **Automatic HTTPS** with SSL certificate
- ✅ **Auto-deploy** from GitHub (whenever you push changes)
- ⚠️ **Note**: App sleeps after 15 minutes of inactivity (30-second wake-up time)

---

## 📋 Prerequisites

1. **GitHub Account** - [Sign up free](https://github.com/signup)
2. **Render Account** - [Sign up free](https://render.com/register)

---

## 🚀 Step-by-Step Deployment

### Step 1: Push Your Code to GitHub

If you haven't already, create a GitHub repository:

1. Go to [GitHub](https://github.com) and click **"New repository"**
2. Name it `clean-and-green-website`
3. Make it **Public** (required for free tier)
4. **Don't** initialize with README
5. Click **"Create repository"**

Then, in your Replit shell (or terminal), run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Clean & Green website"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/clean-and-green-website.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Important**: Replace `YOUR_USERNAME` with your actual GitHub username!

---

### Step 2: Create Render Account & Connect GitHub

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up using your **GitHub account** (this connects them automatically)

---

### Step 3: Deploy Using render.yaml (Easiest Method)

Your project already includes a `render.yaml` file that configures everything!

1. **In Render Dashboard**, click **"New +"** → **"Blueprint"**
2. Find your repository: `clean-and-green-website`
3. Click **"Connect"**
4. Render will detect `render.yaml` automatically
5. Click **"Apply"**

Render will now:
- ✅ Create a PostgreSQL database
- ✅ Create a web service
- ✅ Link them together
- ✅ Start deploying!

⏱️ **First deployment takes 3-5 minutes**

---

### Step 4: Set Up Database Schema

After deployment completes:

1. In Render Dashboard, click on your **"clean-and-green-db"** database
2. Click **"Connect"** → Copy the **"External Database URL"**
3. Go to your **web service** → **"Shell"** tab (left sidebar)
4. Run these commands in the shell:

```bash
# Create sessions table (required for authentication)
psql $DATABASE_URL -c "CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);"
psql $DATABASE_URL -c "CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);"

# Add username and password columns to users table (required for new auth system)
psql $DATABASE_URL -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE;"
psql $DATABASE_URL -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR;"
psql $DATABASE_URL -c "ALTER TABLE users ALTER COLUMN email DROP NOT NULL;"

# Seed database with default services and FAQs
npx tsx server/seed.ts
```

---

### Step 5: Create Your Admin Account 🔐

**IMPORTANT**: Your app now uses username/password authentication (not Replit Auth).

1. Visit your live website: `https://clean-and-green.onrender.com`
2. You'll be automatically redirected to `/setup`
3. Create your admin account:
   - **Username**: Choose a username (e.g., "admin")
   - **Password**: Choose a strong password (min 6 characters)
   - **Email**: Optional
4. Click **"Create Admin Account"**
5. You'll be redirected to `/login`
6. Log in with your credentials

**Security Note**: The setup page is only accessible when NO users exist in the database. After creating the first admin, it's automatically disabled for security.

---

### Step 6: Access Your Live Website! 🎉

Your site will be live at: `https://clean-and-green.onrender.com`

(Render gives you a free subdomain)

---

## 🔄 Updating Your Website

After the initial deployment, updates are automatic!

1. Make changes in Replit
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Updated services page"
   git push
   ```
3. Render automatically detects the change and redeploys! ✨

---

## 💰 Costs

| Service | Cost |
|---------|------|
| Web hosting | **FREE** |
| PostgreSQL | **FREE** |
| SSL certificate | **FREE** |
| Bandwidth | 100GB/month **FREE** |

**Total: $0/month** 🎉

---

## ⚠️ Important Notes

### Free Tier Limitations

1. **Sleep after 15 min** - App spins down after 15 minutes of inactivity
   - First visitor after sleep waits ~30 seconds
   - Subsequent visitors = instant
   
2. **Database expires after 90 days** - Render will email you
   - Simply click "Renew" in the email (takes 2 clicks)
   - Your data is preserved!

3. **750 hours/month** - More than enough for 24/7 operation

---

## 🔧 Troubleshooting

### Build Failed?

1. Check **"Logs"** tab in your web service
2. Common issues:
   - Missing dependencies → Check `package.json`
   - Build timeout → Contact Render support for free tier extension

### Database Connection Error?

1. Go to web service → **Environment** tab
2. Verify `DATABASE_URL` is connected to your database
3. In Shell, run: `echo $DATABASE_URL` to verify

### App Not Loading?

1. Check **"Events"** tab for deployment status
2. Check **"Logs"** tab for errors
3. Ensure build completed successfully

---

## 🎁 Bonus: Custom Domain (Optional)

Want `www.cleanandgreen.com` instead of `.onrender.com`?

1. Buy domain from Namecheap/GoDaddy (~$12/year)
2. In Render: **Settings** → **Custom Domain**
3. Add your domain
4. Update DNS records (Render provides instructions)

---

## 📞 Need Help?

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Community**: [community.render.com](https://community.render.com)

---

## ✅ Summary

You now have a **production-ready website** running on Render.com:
- ✅ Live URL with HTTPS
- ✅ PostgreSQL database
- ✅ Auto-deploy from GitHub
- ✅ $0/month hosting

Congratulations! 🎉
