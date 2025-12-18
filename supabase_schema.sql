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
