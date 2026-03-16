# RecallsAtlas – Implementation Report

## 1. Folder Structure Created

```
recallsatlas/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── recalls/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── category/
│   │   │   └── [category]/
│   │   │       └── page.tsx
│   │   ├── brand/
│   │   │   ├── page.tsx
│   │   │   └── [brand]/
│   │   │       └── page.tsx
│   │   └── year/
│   │       ├── page.tsx
│   │       └── [year]/
│   │           └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── styles/
│   │   ├── globals.css
│   │   ├── layout.css
│   │   ├── recall.css
│   │   └── grid.css
│   ├── public/
│   │   └── images/
│   │       └── recalls/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   └── .env.example
├── backend/
│   ├── pipelines/
│   │   ├── fetch_fda_recalls.js
│   │   ├── clean_recalls.js
│   │   ├── download_images.js
│   │   └── insert_mongodb.js
│   ├── database/
│   │   └── mongodb.js
│   ├── package.json
│   └── .env.example
├── search-service/
│   ├── src/
│   │   └── main/
│   │       └── java/
│   │           └── search/
│   │               └── SearchService.java
│   └── pom.xml
├── scripts/
│   ├── generate_sitemap.js
│   └── cron_jobs.md
├── .gitignore
└── REPORT.md
```

---

## 2. Frontend Components Implemented

| Component | Purpose |
|-----------|---------|
| `app/layout.tsx` | Root layout, metadata, CSS imports |
| `app/page.tsx` | Homepage: hero, search bar, browse by category/brand/year, latest recalls |
| `app/recalls/page.tsx` | Recalls list (placeholder) |
| `app/recalls/[slug]/page.tsx` | Recall detail by slug (placeholder) |
| `app/category/[category]/page.tsx` | Category browse |
| `app/brand/page.tsx` | Brand index |
| `app/brand/[brand]/page.tsx` | Brand browse |
| `app/year/page.tsx` | Year index |
| `app/year/[year]/page.tsx` | Year browse |

**CSS system (plain CSS, no Tailwind):**
- `globals.css` – variables, reset, base styles; colors: Primary `#0f172a`, Accent `#ef4444`, Background `#f8fafc`, Text `#1e293b`
- `layout.css` – header, main, footer, homepage sections
- `recall.css` – recall detail page, cards, source link
- `grid.css` – responsive recall grid (mobile-first breakpoints)

---

## 3. Backend Components Implemented

| Component | Purpose |
|-----------|---------|
| `database/mongodb.js` | MongoDB connector (pooled client, `getRecallsCollection()`); DB `recallsatlas`, collection `recalls` |
| `pipelines/fetch_fda_recalls.js` | Stub – throws “Not implemented” |
| `pipelines/clean_recalls.js` | Stub – throws “Not implemented” |
| `pipelines/download_images.js` | Stub – throws “Not implemented” |
| `pipelines/insert_mongodb.js` | Stub – throws “Not implemented” |

---

## 4. Search Service (Java / Lucene)

| Component | Purpose |
|-----------|---------|
| `SearchService.java` | Skeleton: Jetty on 8081, `GET /search?q=query` → JSON `[{title, slug}, ...]` |
| `pom.xml` | Maven: Lucene 9.11, Jetty 11, Gson |

- Returns empty array when Lucene index is missing or not yet built.
- Index path: `./lucene-index` (override via `LUCENE_INDEX_PATH`).

---

## 5. Environment Configuration

| File | Variables |
|------|-----------|
| `frontend/.env.example` | `NEXT_PUBLIC_SITE_URL=https://recallsatlas.com` |
| `backend/.env.example` | `MONGODB_URI=mongodb://localhost:27017` |

---

## 6. Assumptions

1. Next.js is scaffolded manually (no `create-next-app` run).
2. Backend runs with Node.js and `npm install` in `backend/`.
3. Search service runs with Java 17+ and `mvn clean package`.
4. Recall document shape: `slug`, `title`, `brand`, `product`, `category`, `classification`, `reason`, `distribution`, `quantity`, `report_date`, `image`, `source_url`, `languages`.
5. Category slugs: `drugs`, `food`, `medical-devices`, `supplements`.

---

## 7. Recommendations Before Continuing

1. **Frontend**
   - Run: `cd frontend && npm install`
   - Then: `npm run dev` and verify localhost:3000

2. **Backend**
   - Run: `cd backend && npm install`
   - Copy `.env.example` to `.env` and set `MONGODB_URI`
   - Start MongoDB locally before testing

3. **Search service**
   - Run: `cd search-service && mvn clean package`
   - Run: `java -jar target/search-service-0.1.0.jar`
   - `GET http://localhost:8081/search?q=test` will return `[]` until the Lucene index is populated by the ingestion pipeline

4. **Next steps**
   - Add MongoDB data access in Next.js (API routes or server-side fetch)
   - Implement FDA ingestion pipeline
   - Add Lucene indexing step and wire frontend search to the Java service
   - Configure cron on the VPS per `scripts/cron_jobs.md`
