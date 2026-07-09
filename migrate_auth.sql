-- ============================================
-- 1. MIGRATE EXISTING USERS TO auth.users
-- ============================================
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_anonymous
)
SELECT
    id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    email,
    password, -- already Bcrypt hashed password
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('name', name),
    created_at,
    NOW(),
    false
FROM public.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. MIGRATE IDENTITIES TO auth.identities
-- ============================================
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    email,
    created_at,
    updated_at
)
SELECT
    id, -- Using user ID as the identity ID for simplicity
    id,
    jsonb_build_object('sub', id::text, 'email', email),
    'email',
    email, -- provider_id is the email for email provider
    email,
    created_at,
    NOW()
FROM public.users
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ============================================
-- 3. SYNCHRONIZATION TRIGGER FUNCTION
-- ============================================
-- This function runs whenever a user is added to auth.users (e.g. signup)
-- and creates/updates their record in public.users automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    created_at, 
    name, 
    email, 
    password, 
    role, 
    designation, 
    phone,
    bio
  )
  VALUES (
    new.id,
    coalesce(new.created_at, NOW()),
    coalesce(new.raw_user_meta_data->>'name', 'Staff Member'),
    new.email,
    coalesce(new.encrypted_password, ''), -- password is kept in auth.users
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    new.raw_user_meta_data->>'designation',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'bio'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    designation = EXCLUDED.designation,
    phone = EXCLUDED.phone,
    bio = EXCLUDED.bio;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on insert into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
