# STAFF LOGIN FIX - Step by Step

## Issue: Can't Login to Staff Portal

**Root cause:** After migrating to Supabase Auth, your old staff accounts don't exist anymore. You need to create a new admin account.

---

## ✅ SOLUTION: Create Your First Admin Account

### Method 1: Using SQL (FASTEST - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Open your project
   - Click **SQL Editor** in sidebar

2. **Run the Admin Creation Script**
   - Open the file: `create_admin_account.sql`
   - **EDIT THE FILE FIRST:**
     - Line 35: Change `'yourname@gmail.com'` to YOUR email
     - Line 36: Change `'YourSecurePassword123'` to YOUR password
     - Line 39: Change `'Your Name'` to YOUR name
     - Line 50: Change `'Your Name'` to YOUR name again
   
3. **Copy & Paste Into Supabase**
   - Select ALL the edited SQL
   - Paste into SQL Editor
   - Click **RUN**
   - Should see: "Admin account created successfully!"

4. **Test Login**
   - Go to `login.html` in browser
   - Enter YOUR email and password
   - Should redirect to admin dashboard!

---

### Method 2: Using Staff Registration Page (Easier)

**Wait...** You can't use `staff_register.html` yet because you need to be logged in as admin first. Use Method 1 instead.

---

## After Creating Admin Account

Now you can:
1. ✅ Login to staff portal
2. ✅ Access admin dashboard
3. ✅ Go to `staff_register.html` to add more staff members
4. ✅ Those staff members will get verification emails

---

## Quick Verification

After running the SQL, check it worked:

```sql
SELECT email, name, role FROM user_profiles WHERE user_type = 'staff';
```

Should show your admin account!

---

## Troubleshooting

**Error: "relation auth.users does not exist"**
→ Make sure you ran `migrate_to_supabase_auth.sql` FIRST

**Error: "Invalid email or password"**  
→ Double-check you edited the SQL with YOUR email/password before running it

**Login works but redirects to wrong dashboard**
→ Check the role is set to 'superadmin' in the SQL

**Still can't login**
→ Open browser console (F12), try to login, send me the error message

---

## Next Steps

After you can login:
1. ✅ Test member registration
2. ✅ Add more staff via staff_register.html
3. ✅ Configure production settings when ready
