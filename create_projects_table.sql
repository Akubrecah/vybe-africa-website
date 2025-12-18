-- Run this in Supabase SQL Editor to create the projects table

-- Projects/Programs Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    category VARCHAR(100),
    start_date DATE,
    end_date DATE,
    budget NUMERIC(12, 2),
    progress INTEGER DEFAULT 0,
    manager_id UUID REFERENCES users(id),
    location VARCHAR(255)
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects table
CREATE POLICY "Anyone can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Staff can insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Staff can delete projects" ON projects FOR DELETE USING (true);
