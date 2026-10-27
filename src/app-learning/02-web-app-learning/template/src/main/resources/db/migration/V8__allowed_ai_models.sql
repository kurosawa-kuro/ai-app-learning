-- Explicit allow-list; independent of the global AI switch and environment defaults.
alter table app_settings add column allowed_ai_models text not null default 'gemini-3.5-flash-lite';
alter table app_settings add constraint allowed_ai_models_size check (length(allowed_ai_models) <= 2000);
