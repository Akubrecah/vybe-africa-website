-- ADD FINANCE MANAGER
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    user_id UUID;
BEGIN
    -- unique ID
    user_id := gen_random_uuid();
    
    -- Insert into auth.users (dummy auth check)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        'joey.junior@vybeafrica.org', 
        crypt('VybeFinance2025', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"user_type":"staff","name":"Joey Junior"}',
        NOW(), NOW(), 'authenticated', 'authenticated'
    );
    
    -- Insert into user_profiles
    INSERT INTO user_profiles (
        id, user_type, name, designation, role, created_at, updated_at
    ) VALUES (
        user_id,
        'staff',
        'Joey Junior',
        'Finance Manager',
        'admin', -- giving admin role for dashboard access
        NOW(), NOW()
    );
    
    RAISE NOTICE 'Finance Manager account created for Joey Junior.';
    RAISE NOTICE 'Email: joey.junior@vybeafrica.org';
    RAISE NOTICE 'Password: VybeFinance2025';
END $$;
