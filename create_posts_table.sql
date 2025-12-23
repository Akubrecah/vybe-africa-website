-- Create Posts/News Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    author_id UUID REFERENCES users(id),
    is_published BOOLEAN DEFAULT true,
    image_url TEXT
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view published posts" ON posts FOR SELECT USING (is_published = true);
CREATE POLICY "Staff can create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Staff can delete posts" ON posts FOR DELETE USING (true);


-- Seed Data
INSERT INTO posts (title, content, category, is_published, created_at) VALUES
('VYBE Africa Launches New SRHR Initiative', 'We are proud to announce the launch of our new program aiming to reach 5000 youth in West Pokot.', 'Program Update', true, NOW() - INTERVAL '2 days'),
('Q3 Financial Report Available', 'The financial report for the third quarter has been finalized and is ready for review by the board.', 'Internal', true, NOW() - INTERVAL '5 days'),
('Partnership with County Government', 'A new MoU has been signed with the West Pokot County Government to support youth innovation hubs.', 'Partnership', true, NOW() - INTERVAL '10 days'),
('Community Clean-up Drive Success', 'Over 200 volunteers participated in our monthly clean-up drive in Kapenguria.', 'Event', true, NOW() - INTERVAL '15 days');
