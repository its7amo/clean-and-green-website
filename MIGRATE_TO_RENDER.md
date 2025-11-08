# Migrate Clean & Green from Replit to Render

## 🎯 Goal
Transfer all your business data (customers, bookings, invoices, etc.) from Replit's database to Render's database, making your app 100% independent of Replit.

---

## ⚠️ IMPORTANT: Before You Start

**Take 5 minutes to do this migration during OFF-PEAK hours** (when no customers are booking) to avoid losing any new bookings during migration.

---

## 📋 Step-by-Step Migration

### **Step 1: Export Database from Replit**

1. **Open Replit** in your browser
2. **Open the Shell** (in the Tools panel at bottom)
3. **Run this command** to create a backup file:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```
4. **Wait** for it to complete (30-60 seconds)
5. **Download the file**:
   - Click on the "Files" icon (left sidebar)
   - Find `backup.sql` in the file list
   - Right-click → Download

---

### **Step 2: Prepare Render Database**

1. **Go to**: https://dashboard.render.com
2. **Click** on your database: `clean-and-green-db`
3. **Click** the "Shell" tab at the top
4. **Clear the database** (this removes the empty default tables):
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO clean_and_green_db_user;
   ```
5. **Wait** for the prompt to return (means it's done)

---

### **Step 3: Import Your Data to Render**

**Option A: Using Render's Web Shell (Recommended)**

1. **Stay in the Render database Shell**
2. **Click the "Upload" button** (top right of shell)
3. **Select** your `backup.sql` file
4. **After upload completes**, run this command in the shell:
   ```sql
   \i backup.sql
   ```
5. **Wait** for import to complete (1-2 minutes)
6. **You'll see** lots of output - this is normal!
7. **Look for** "CREATE TABLE", "COPY", "ALTER TABLE" messages

**Option B: Using Local psql Command Line**

If Option A doesn't work, you can import from your local machine:

1. **Get your Render database connection string**:
   - In Render dashboard, go to your database
   - Click "Info" tab
   - Copy the "External Database URL" (starts with `postgresql://`)

2. **Run this command on your computer** (replace with your actual connection string):
   ```bash
   psql "postgresql://clean_and_green_db_user:YOUR_PASSWORD@dpg-xxx-a/clean_and_green_db" < backup.sql
   ```

3. **Wait** for import to complete

---

### **Step 4: Add Missing Environment Variable**

1. **Go back** to your web service: `clean-and-green`
2. **Click** "Environment" tab
3. **Click** "Add Environment Variable"
4. **Add this variable**:
   ```
   Key: APP_URL
   Value: https://clean-and-green-website.onrender.com
   ```
5. **Click** "Save Changes"
6. **Render will auto-redeploy** (takes 2-3 minutes)

---

### **Step 5: Verify Everything Works**

After Render redeploys (you'll see "Live" status):

1. **Go to**: https://clean-and-green-website.onrender.com/login
2. **Log in** with your admin credentials
3. **Check each section**:
   - ✅ Customers tab - Do you see your customers?
   - ✅ Bookings tab - Do you see past bookings?
   - ✅ Invoices tab - Do you see your invoices?
   - ✅ Employees tab - Do you see your team?
   - ✅ Promo Codes - Do you see your promo codes?

4. **Test creating**:
   - ✅ Create a test customer
   - ✅ Create a test invoice
   - ✅ Verify they appear in the tables

5. **Test email/SMS** (if configured):
   - ✅ Send a test email from Customers tab
   - ✅ Verify links in email point to Render (not Replit)

---

### **Step 6: Push Code Changes to GitHub**

Your local code has the SMS/email URL fixes. Push them:

```bash
git add .
git commit -m "Fix: Migrate to Render and remove Replit dependencies"
git push origin main
```

Render will auto-deploy the fixed code!

---

## ✅ Success Checklist

After migration, you should have:

- ✅ All customer data visible in Render admin
- ✅ All bookings showing in Render admin
- ✅ All invoices, employees, promo codes intact
- ✅ Can create new invoices and they appear
- ✅ Can create new customers and they appear
- ✅ Email links point to `clean-and-green-website.onrender.com`
- ✅ SMS links point to `clean-and-green-website.onrender.com`
- ✅ App works even when Replit is down

---

## 🔧 Troubleshooting

### **Import fails with "already exists" error**
You didn't clear the database properly. Go back to Step 2 and run the DROP/CREATE commands again.

### **Tables are empty after import**
The import might have failed silently. Check the shell output for errors. You may need to:
1. Download the backup.sql file
2. Open it in a text editor
3. Copy/paste sections manually

### **Can't log in after migration**
Your admin password is in the database. If you migrated successfully, your old password should work. If not, you may need to reset it via the database shell.

### **Still seeing Replit URLs in emails**
Make sure:
1. You pushed the code changes to GitHub
2. Render auto-deployed the new code
3. You added the `APP_URL` environment variable

---

## 🎉 You're Done!

Your Clean & Green website is now **100% independent** and running entirely on Render with no Replit dependency!

**Benefits:**
- ✅ Works 24/7 even if Replit is down
- ✅ All data in one place (Render database)
- ✅ Proper production URLs in all emails/SMS
- ✅ Professional `.onrender.com` domain
- ✅ Easy to upgrade to custom domain later

---

## 📞 Need Help?

If you run into issues during migration:
1. Take a screenshot of any error messages
2. Note which step failed
3. Don't panic - your original data is still safe in Replit!
