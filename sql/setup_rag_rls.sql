-- Enable Row Level Security
ALTER TABLE bonga_documents ENABLE ROW LEVEL SECURITY;

-- Allow public select access for clients and backend queries
DROP POLICY IF EXISTS "Allow public select access" ON bonga_documents;
CREATE POLICY "Allow public select access" ON bonga_documents
  FOR SELECT TO anon, authenticated USING (true);

-- Allow insert access (required for the ingestion API using the anon key)
DROP POLICY IF EXISTS "Allow public insert access" ON bonga_documents;
CREATE POLICY "Allow public insert access" ON bonga_documents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow delete access (required for the ingestion API using the anon key)
DROP POLICY IF EXISTS "Allow public delete access" ON bonga_documents;
CREATE POLICY "Allow public delete access" ON bonga_documents
  FOR DELETE TO anon, authenticated USING (true);
