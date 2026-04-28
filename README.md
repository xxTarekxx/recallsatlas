# 🛑 RecallsAtlas — FDA Recall Ingestion Pipeline

Automated data pipeline that ingests, processes, and structures FDA recall data into a scalable, SEO-ready system.

---

## 🚀 Overview

RecallsAtlas is a full-stack data pipeline designed to scrape, process, and structure FDA recall data at scale. It focuses on reliability, performance, and data accuracy while enabling near real-time recall updates.

---

## 🧠 Key Features

- 🔍 Automated scraping using Playwright  
- ⚙️ Idempotent ETL pipeline (prevents duplicate data)  
- 📉 ~90% reduction in duplicate records  
- 🔁 Retry system with exponential backoff (~70% fewer failures)  
- 🧩 Structured data generation (JSON-LD for SEO)  
- 🖼 Image extraction and WebP optimization  
- 💾 Incremental persistence with resume support  
- 🌍 Multi-language ready architecture  
- 🧪 Logging, error handling, and recovery  

---

## 🏗 Architecture

FDA Website → Playwright Scraper → ETL Processing → Deduplication (Redis) → JSON-LD Generation → Storage → Frontend

---

## 🛠 Tech Stack

- Backend: Node.js, Express  
- Scraping: Playwright  
- Data Processing: Custom ETL pipeline  
- Caching / Deduplication: Redis  
- Storage: JSON / MongoDB  
- Image Processing: Sharp  
- SEO: JSON-LD structured data  

---

## 📊 Impact

- Reduced duplicate recall entries by ~90%  
- Reduced pipeline failures by ~70%  
- Enabled near real-time recall ingestion  
- Improved SEO visibility via structured data  

---

## ⚙️ How It Works

1. Scrape recall listings from FDA  
2. Visit each recall detail page  
3. Extract structured data (summary, images, metadata)  
4. Run ETL pipeline (deduplication + retry logic)  
5. Generate JSON-LD structured content  
6. Persist data for frontend/API usage  

---

## 📁 Structure

/scraper  
/etl  
/images  
/output  
/utils  

---

## ▶️ Run

npm install  
npm run scrape  

---

## 📌 Notes

- Built for scalability and fault tolerance  
- Production-grade retry and logging system  
- Easily extendable to other sources (CPSC, NHTSA)  

---

## 🔗 Live

https://recallsatlas.com
