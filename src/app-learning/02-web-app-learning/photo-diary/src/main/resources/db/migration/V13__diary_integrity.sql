-- Additive: preserves entries, tag IDs, links and Storage locations.
alter table diary_entries add constraint diary_fingerprint_format check(fingerprint ~ '^[0-9a-f]{64}$');
alter table diary_tag_catalog add constraint diary_tag_version_nonnegative check(version >= 0);
alter table diary_photos add constraint diary_photo_location_nonblank check(length(trim(image_bucket)) > 0 and length(trim(image_key)) > 0);
