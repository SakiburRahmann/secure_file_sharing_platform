-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- Encrypted filename (optional, plaintext for now)
  storage_path TEXT NOT NULL, -- UUID-based path in S3
  encrypted_key TEXT NOT NULL, -- Session key (AES) wrapped with OWNER's RSA Public Key
  iv TEXT NOT NULL, -- Initial Vector for AES-GCM
  integrity_hash TEXT NOT NULL, -- SHA-256
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create shared_keys table for sharing files with other users
CREATE TABLE IF NOT EXISTS shared_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES files ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  encrypted_key TEXT NOT NULL, -- Session key (AES) wrapped with RECIPIENT's RSA Public Key
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can do everything with their files
CREATE POLICY "Owners can manage own files" ON files
  FOR ALL USING (auth.uid() = owner_id);

-- Policy: Recipients can view files shared with them
CREATE POLICY "Recipients can view shared files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_keys
      WHERE shared_keys.file_id = files.id
      AND shared_keys.recipient_id = auth.uid()
    )
  );

-- Policy: Shared keys visibility
CREATE POLICY "Users can view own shared keys" ON shared_keys
  FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = (SELECT owner_id FROM files WHERE id = file_id));
