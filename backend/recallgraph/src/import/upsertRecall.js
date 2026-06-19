function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

async function upsertRecall(client, record) {
  await client.query(
    `
      INSERT INTO recalls (
        id, source, source_record_id, source_url, slug, title, description,
        recall_date, published_at, company_name, normalized_company_name,
        brand_name, product_name, product_description, product_type, category,
        hazards_json, remedy, consumer_action, images_json, raw_hash,
        raw_record_json, normalized_record_json, canonical_text, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17::jsonb, $18, $19, $20::jsonb, $21,
        $22::jsonb, $23::jsonb, $24, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        source_record_id = EXCLUDED.source_record_id,
        source_url = EXCLUDED.source_url,
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        recall_date = EXCLUDED.recall_date,
        published_at = EXCLUDED.published_at,
        company_name = EXCLUDED.company_name,
        normalized_company_name = EXCLUDED.normalized_company_name,
        brand_name = EXCLUDED.brand_name,
        product_name = EXCLUDED.product_name,
        product_description = EXCLUDED.product_description,
        product_type = EXCLUDED.product_type,
        category = EXCLUDED.category,
        hazards_json = EXCLUDED.hazards_json,
        remedy = EXCLUDED.remedy,
        consumer_action = EXCLUDED.consumer_action,
        images_json = EXCLUDED.images_json,
        raw_hash = EXCLUDED.raw_hash,
        raw_record_json = EXCLUDED.raw_record_json,
        normalized_record_json = EXCLUDED.normalized_record_json,
        canonical_text = EXCLUDED.canonical_text,
        updated_at = now()
    `,
    [
      record.id,
      record.source,
      record.sourceRecordId,
      record.sourceUrl,
      record.slug,
      record.title,
      record.description,
      record.recallDate,
      record.publishedAt,
      record.companyName,
      record.normalizedCompanyName,
      record.brandName,
      record.productName,
      record.productDescription,
      record.productType,
      record.category,
      toJson(record.hazards),
      record.remedy,
      record.consumerAction,
      toJson(record.images),
      record.rawHash,
      toJson(record.rawRecord),
      toJson(record),
      record.canonicalTextForEmbedding,
    ]
  );
}

module.exports = { upsertRecall };
