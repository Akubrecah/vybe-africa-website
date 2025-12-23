-- CREATE YOUR FIRST ADMIN ACCOUNT
-- Run this in Supabase SQL Editor AFTER running migrate_to_supabase_auth.sql

-- ⚠️ IMPORTANT: Replace these values with YOUR information
-- Change the email and password below to your actual credentials

-- This creates an admin account directly in the database
-- Password: Change "YourSecurePassword123" to your desired password
-- Email: Change to your actual email address

DO $$
DECLARE
    user_id UUID;
    hashed_password TEXT;
BEGIN
    -- Generate UUID for the user
    user_id := gen_random_uuid();
    
    -- For now, we'll insert without hashed password
    -- You'll set the password via Supabase Dashboard
    
    -- Insert into auth.users (Supabase's auth table)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        role,
        aud
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        'poweldayck@gmail.com', -- ⚠️ CHANGE THIS TO YOUR EMAIL
        crypt('Akufamilia@254', gen_salt('bf')), -- ⚠️ CHANGE PASSWORD
        NOW(), -- Email already confirmed
        '{"provider":"email","providers":["email"]}',
        '{"user_type":"staff","name":"Akubrecah Entertainment"}', -- ⚠️ CHANGE YOUR NAME
        NOW(),
        NOW(),
        '',
        '',
        'authenticated',
        'authenticated'
    );
    
    -- Insert into user_profiles
    INSERT INTO user_profiles (
        id,
        user_type,
        name,
        designation,
        role,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'staff',
        'Akubrecah Entertainment', -- ⚠️ CHANGE TO YOUR NAME
        'Executive Director',
        'superadmin',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Admin account created successfully!';
    RAISE NOTICE 'Email: poweldayck@gmail.com';
    RAISE NOTICE 'You can now login at login.html';
END $$;
