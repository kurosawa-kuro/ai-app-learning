CREATE TABLE learning_entries(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES app_users(id),kind varchar(10) NOT NULL CHECK(kind IN ('QUIZ','CHAT','REFLECT')),question text NOT NULL,input text NOT NULL,feedback text NOT NULL,fingerprint varchar(64) NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX learning_entries_user_created ON learning_entries(user_id,created_at DESC,id);
ALTER TABLE learning_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON learning_entries FROM anon,authenticated;
