# Supabase Authentication Setup Guide

Follow these steps to configure Supabase Authentication for VYBE Africa.

## Step 1: Run Database Migration

1. Go to: https://supabase.com/dashboard/project/lkqkhpgrjhynqynaiciu/sql/new
2. Copy the entire contents of `migrate_to_supabase_auth.sql`
3. Paste and click **Run**
4. Verify success: Check that `user_profiles` table exists in Database → Tables

## Step 2: Enable Email Authentication

1. Go to: **Authentication → Providers**
2. Find **Email** provider
3. Toggle **Enable Email provider** to ON
4. Toggle **Confirm email** to ON
5. Click **Save**

## Step 3: Configure URL Settings

1. Go to: **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel domain:
   ```
   https://your-vybe-africa-site.vercel.app
   ```
3. Add **Redirect URLs**:
   ```
   https://your-vybe-africa-site.vercel.app/verify-email.html
   https://your-vybe-africa-site.vercel.app/member_login.html
   https://your-vybe-africa-site.vercel.app/login.html
   http://localhost:5000/verify-email.html (for testing)
   ```
4. Click **Save**

## Step 4: Configure Email Templates

1. Go to: **Authentication → Email Templates**

### Confirm Signup Template
Edit the **Confirm signup** template:

**Subject**: Welcome to VYBE Africa - Verify Your Email

**Body**:
```html
<h2>Welcome to VYBE Africa!</h2>
<p>Hello,</p>
<p>Thank you for registering with VYBE Africa. Please verify your email address to activate your account.</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<p>Best regards,<br>The VYBE Africa Team</p>
```

Click **Save**

### Magic Link Template (Optional)
Edit the **Magic Link** template for passwordless login (future feature)

### Change Email Address Template
Edit the **Change Email Address** template:

**Subject**: Confirm Your Email Change

**Body**:
```html
<h2>Email Change Request</h2>
<p>Hello,</p>
<p>You requested to change your email address. Please confirm this change:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Change</a></p>
<p>If you didn't request this change, please contact support immediately.</p>
```

Click **Save**

### Reset Password Template
Edit the **Reset Password** template:

**Subject**: Reset Your VYBE Africa Password

**Body**:
```html
<h2>Password Reset Request</h2>
<p>Hello,</p>
<p>You requested to reset your password. Click the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
```

Click **Save**

## Step 5: Configure Email Rate Limits

1. Go to: **Authentication → Rate Limits**
2. Recommended settings:
   - **Emails per hour**: 10 (free tier allows 4, upgrade if needed)
   - **SMS per hour**: 0 (not using SMS)

## Step 6: Optional - SMTP Configuration

For production, configure custom SMTP:

1. Go to: **Project Settings → Auth → SMTP Settings**
2. Click **Enable Custom SMTP**
3. Enter your SMTP details:
   - **Host**: smtp.gmail.com (for Gmail)
   - **Port**: 587
   - **Username**: your-email@gmail.com
   - **Password**: your-app-password
   - **Sender email**: noreply@vybeafrica.org
   - **Sender name**: VYBE Africa

4. Click **Save**

### Gmail Setup
If using Gmail:
1. Enable 2-factor authentication
2. Generate App Password: Google Account → Security → 2-Step Verification → App Passwords
3. Use that password in SMTP settings

## Step 7: Test Email Delivery

1. Visit your site: `member_register.html`
2. Register a test account
3. Check email inbox (and spam folder)
4. Verify email link works
5. Confirm you can login

## Step 8: Security Settings

1. Go to: **Authentication → Policies**
2. Recommended settings:
   - **JWT expiry**: 3600 (1 hour)
   - **Refresh token rotation**: Enabled
   - **Password requirements**: Minimum 6 characters

## Troubleshooting

### Emails not arriving?
- Check Supabase logs: **Logs → Auth Logs**
- Verify email provider is enabled
- Check spam folder
- Verify Site URL matches your domain

### "Invalid redirect URL" error?
- Add the URL to Redirect URLs in URL Configuration
- Ensure URL includes protocol (https://)

### Users can't verify?
- Check confirmation token hasn't expired (24 hours)
- Verify email template has correct `{{ .ConfirmationURL }}`
- Check browser console for errors

## Next Steps

After setup complete:
1. ✅ Run database migration
2. ✅ Enable email auth
3. ✅ Configure URLs
4. ✅ Customize email templates
5. ✅ Test registration flow
6. → Deploy updated code to Vercel
7. → Communicate changes to users

## Support

If you encounter issues:
- Check Supabase documentation: https://supabase.com/docs/guides/auth
- View auth logs in Supabase dashboard
- Contact Supabase support if needed
