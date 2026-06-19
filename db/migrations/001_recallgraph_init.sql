CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sources (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  source_type text NOT NULL,
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type)
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  run_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  record_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS recalls (
  id text PRIMARY KEY,
  source text NOT NULL,
  source_record_id text,
  source_url text,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  recall_date timestamptz,
  published_at timestamptz,
  company_name text,
  normalized_company_name text,
  brand_name text,
  product_name text,
  product_description text,
  product_type text,
  category text,
  hazards_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  remedy text,
  consumer_action text,
  images_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_hash text NOT NULL,
  raw_record_json jsonb NOT NULL,
  normalized_record_json jsonb NOT NULL,
  canonical_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recall_embeddings (
  id bigserial PRIMARY KEY,
  recall_id text NOT NULL REFERENCES recalls(id) ON DELETE CASCADE,
  embedding_scope text NOT NULL,
  model text NOT NULL,
  dimensions integer NOT NULL,
  text_hash text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recall_id, embedding_scope, model, text_hash)
);

CREATE TABLE IF NOT EXISTS related_recalls (
  id bigserial PRIMARY KEY,
  source_recall_id text NOT NULL REFERENCES recalls(id) ON DELETE CASCADE,
  target_recall_id text NOT NULL REFERENCES recalls(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  score double precision NOT NULL,
  reason text,
  method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_recall_id <> target_recall_id),
  UNIQUE (source_recall_id, target_recall_id, link_type)
);

CREATE TABLE IF NOT EXISTS evaluation_queries (
  id bigserial PRIMARY KEY,
  query text NOT NULL,
  intent text,
  expected_recall_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id bigserial PRIMARY KEY,
  search_method text NOT NULL,
  metrics_json jsonb NOT NULL,
  results_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sources (name, source_type, base_url)
VALUES
  ('U.S. Food and Drug Administration', 'fda', 'https://www.fda.gov'),
  ('Consumer Product Safety Commission', 'cpsc', 'https://www.cpsc.gov'),
  ('National Highway Traffic Safety Administration', 'nhtsa', 'https://www.nhtsa.gov')
ON CONFLICT (source_type) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url;

CREATE INDEX IF NOT EXISTS recalls_source_idx ON recalls (source);
CREATE INDEX IF NOT EXISTS recalls_source_url_idx ON recalls (source_url);
CREATE INDEX IF NOT EXISTS recalls_normalized_company_idx ON recalls (normalized_company_name);
CREATE INDEX IF NOT EXISTS recalls_product_type_idx ON recalls (product_type);
CREATE INDEX IF NOT EXISTS recalls_category_idx ON recalls (category);
CREATE INDEX IF NOT EXISTS recalls_recall_date_idx ON recalls (recall_date);
CREATE INDEX IF NOT EXISTS recalls_published_at_idx ON recalls (published_at);
CREATE INDEX IF NOT EXISTS recall_embeddings_embedding_idx
  ON recall_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS related_recalls_source_idx ON related_recalls (source_recall_id);
CREATE INDEX IF NOT EXISTS related_recalls_target_idx ON related_recalls (target_recall_id);
CREATE INDEX IF NOT EXISTS related_recalls_link_type_idx ON related_recalls (link_type);
