# QUICK FIX: Get Login Working NOW! 🚨

## The Problem
You can't login because the database migration hasn't been run yet. The `user_profiles` table doesn't exist.

## **5-Minute Fix** (Follow These Steps EXACTLY)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Sign in to your account
3. Click on your **VYBE Africa** project

### Step 2: Run the Migration SQL
1. In the left sidebar, click **SQL Editor**
2. Click **New query** button
3. Copy **ENTIRE** contents from `migrate_to_supabase_auth.sql` (126 lines)
4. Paste into the SQL editor
5. Click **RUN** button (bottom right)
6. Wait for "Success. No rows returned" message

### Step 3: Enable Email Authentication
1. In sidebar, go to **Authentication** → **Providers**
2. Find **Email** provider
3. Toggle **Enable Email provider** to ON
4. Toggle **Confirm email** to ON
5. Click **Save**

### Step 4: Set URLs
1. Still in **Authentication**, click **URL Configuration**
2. Set **Site URL**: `http://localhost:5500` (or your Vercel URL)
3. Under **Redirect URLs**, add these (one per line):
   ```
   http://localhost:5500/verify-email.html
   http://localhost:5500/reset-password.html  
   http://localhost:5500/member_login.html
   http://localhost:5500/login.html
   ```
4. Click **Save**

### Step 5: Test!
1. Go to `member_register.html` in your browser
2. Try creating a new member account
3. Check your email for verification
4. Try logging in

---

## Quick Verification

Run this in Supabase SQL Editor to check if migration worked:

```sql
SELECT COUNT(*) FROM user_profiles;
```

Should return: `0 rows` (table exists but empty)

If error: Table doesn't exist → Migration didn't run

---

## Still Not Working?

### Check Browser Console
1. Open browser (Chrome/Firefox)
2. Press F12 → Console tab
3. Try to login/register
4. Look for errors (send me screenshot)

### Common Issues

**Error: "relation user_profiles does not exist"**
→ Migration not run. Go back to Step 2.

**Error: "Email not confirmed"**
→ Email provider not enabled. Go back to Step 3.

**Error: "Invalid  email or password"**
→ No account exists. Register first.

---

## After This Works

Then follow the full setup in `SUPABASE_AUTH_SETUP.md` for production settings.

**This should take 5 minutes max!** ⏱️
