-- Provider migration only: preserve all teaching data and feature switches.
DELETE FROM allowed_ai_models WHERE model_id LIKE 'gemini-%';
ALTER TABLE allowed_ai_models DROP CONSTRAINT allowed_ai_models_model_id_check;
ALTER TABLE allowed_ai_models ADD CONSTRAINT allowed_ai_models_model_id_check CHECK (model_id ~ '^gpt-[a-z0-9.-]{1,80}$');
INSERT INTO allowed_ai_models(model_id,position)
SELECT 'gpt-4.1-mini', n FROM generate_series(0,19) AS n
WHERE NOT EXISTS (SELECT 1 FROM allowed_ai_models WHERE position=n)
  AND NOT EXISTS (SELECT 1 FROM allowed_ai_models WHERE model_id='gpt-4.1-mini')
ORDER BY n LIMIT 1;
