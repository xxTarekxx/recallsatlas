# Cron Jobs (RecallsAtlas)

Cron automation will be configured in a later prompt.

## Planned jobs

- **FDA ingestion**: Fetch new recalls periodically
- **Image download**: Download product images for new recalls
- **Sitemap generation**: Regenerate sitemap after data updates
- **Search index**: Rebuild Lucene index after recalls update

## Environment

Run from project root. Ensure `backend/.env` has `MONGODB_URI` set.
