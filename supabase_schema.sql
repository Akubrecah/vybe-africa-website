-- Create Users Table matching the VYBE Africa schema
create table public.users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null unique,
  password text not null, -- Stores hashed password
  role text default 'staff', -- 'superadmin', 'staff'
  designation text -- 'HR', 'Executive Director', etc.
);

-- Turn on Row Level Security (Optional but recommended)
alter table public.users enable row level security;

-- Allow public read access (for now, to simplify migration)
create policy "Allow public read" on public.users for select using (true);
create policy "Allow public insert" on public.users for insert with check (true);
create policy "Allow public update" on public.users for update using (true);
create policy "Allow public delete" on public.users for delete using (true);

-- Projects/Programs Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, on-hold
    category VARCHAR(100), -- SRHR, Climate Action, Child Protection, etc.
    start_date DATE,
    end_date DATE,
    budget NUMERIC(12, 2),
    progress INTEGER DEFAULT 0, -- 0-100
    manager_id UUID REFERENCES users(id),
    location VARCHAR(255)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Anyone can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Staff can insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Staff can delete projects" ON projects FOR DELETE USING (true);
