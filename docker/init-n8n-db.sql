-- =============================================================
-- Auto-create the "n8n" database on first PostgreSQL boot.
-- This script is mounted into /docker-entrypoint-initdb.d/ and
-- runs only when the data volume is empty (fresh init).
-- =============================================================

SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec
