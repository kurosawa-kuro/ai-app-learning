CREATE TABLE user_icons (
    user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    image_bucket text NOT NULL,
    image_key text NOT NULL,
    image_type text NOT NULL CHECK (image_type IN ('image/png', 'image/jpeg'))
);
ALTER TABLE user_icons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_icons FROM anon, authenticated;
ALTER TABLE seed_image_cleanup RENAME TO image_cleanup;
