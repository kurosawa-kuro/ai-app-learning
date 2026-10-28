-- Who may use this app after Google sign-in through Supabase Auth. Add rows by SQL:
--   INSERT INTO app_admins(email, note) VALUES ('owner@example.com', '店長');
-- Emails are stored lowercase; the app compares the verified email claim of the access token.
CREATE TABLE app_admins(
  email varchar(320) PRIMARY KEY CHECK (email = lower(email) AND email LIKE '%_@_%'),
  note varchar(80) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_admins FROM anon, authenticated;
