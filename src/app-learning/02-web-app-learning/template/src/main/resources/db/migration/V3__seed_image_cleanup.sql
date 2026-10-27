-- Keep failed Storage deletions retryable after a seed reset commits.
CREATE TABLE seed_image_cleanup (
    image_bucket text NOT NULL,
    image_key text NOT NULL,
    PRIMARY KEY (image_bucket, image_key)
);
ALTER TABLE seed_image_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON seed_image_cleanup FROM anon, authenticated;
