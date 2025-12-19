-- FIX: Link Existing Account to User Profile
-- Run this if you get "duplicate key" error when creating admin

-- This checks if your account exists but isn't linked to user_profiles yet

DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Find your existing user
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = 'poweldayck@gmail.com';
    
    IF existing_user_id IS NULL THEN
        RAISE NOTICE 'No user found with that email';
    ELSE
        RAISE NOTICE 'Found user ID: %', existing_user_id;
        
        -- Check if profile exists
        IF EXISTS (SELECT 1 FROM user_profiles WHERE id = existing_user_id) THEN
            RAISE NOTICE 'Profile already exists! You can login now.';
            
            -- Update to make sure it's admin
            UPDATE user_profiles 
            SET role = 'superadmin',
                designation = 'Executive Director',
                user_type = 'staff'
            WHERE id = existing_user_id;
            
            RAISE NOTICE 'Updated to admin role!';
        ELSE
            -- Create the profile
            INSERT INTO user_profiles (
                id,
                user_type,
                name,
                designation,
                role,
                created_at,
                updated_at
            ) VALUES (
                existing_user_id,
                'staff',
                'Akubrecah Entertainment',
                'Executive Director',
                'superadmin',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Profile created! You can now login.';
        END IF;
    END IF;
END $$;

-- After running this, try logging in at /login.html
