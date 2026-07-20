-- ============================================================
-- SQL Migration: Donation Config & Confirmations Tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. DONATION CONFIG TABLE (editable by admin)
-- Stores paybill number, account number, org name, goal etc.
CREATE TABLE IF NOT EXISTS public.donation_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    label       TEXT,
    description TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.donation_config ENABLE ROW LEVEL SECURITY;

-- Public can READ the config (needed by donate.html to show paybill numbers)
CREATE POLICY "Public read donation_config"
    ON public.donation_config FOR SELECT USING (true);

-- Only staff can update / insert / delete
CREATE POLICY "Staff update donation_config"
    ON public.donation_config FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff insert donation_config"
    ON public.donation_config FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff delete donation_config"
    ON public.donation_config FOR DELETE USING (public.is_staff());

-- Seed default values
INSERT INTO public.donation_config (key, value, label, description) VALUES
('paybill',       '522522',                'M-Pesa Paybill Number', 'The Safaricom Paybill number donors send money to'),
('account',       '1341747743',            'Account Number',         'The account / till number donors enter'),
('org_name',      'VYBE AFRICA ORGANIZATION', 'Organisation Name',    'Name shown on M-Pesa confirmation SMS'),
('monthly_goal',  '50000',                 'Monthly Goal (KES)',      'The monthly fundraising target shown on the page'),
('tagline',       'Fund real change in West Pokot', 'Page Tagline',   'Short motivational line on the donate page')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- 2. DONATION CONFIRMATIONS TABLE (records when donors submit M-Pesa code)
CREATE TABLE IF NOT EXISTS public.donation_confirmations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_name  TEXT,
    phone       TEXT,
    mpesa_code  TEXT NOT NULL,
    amount      NUMERIC,
    paybill     TEXT,
    verified    BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.donation_confirmations ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (donate anonymously)
CREATE POLICY "Anyone can insert donation_confirmations"
    ON public.donation_confirmations FOR INSERT WITH CHECK (true);

-- Only staff can SELECT (view who donated)
CREATE POLICY "Staff read donation_confirmations"
    ON public.donation_confirmations FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff update donation_confirmations"
    ON public.donation_confirmations FOR UPDATE USING (public.is_staff());
