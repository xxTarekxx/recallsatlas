const { sha256 } = require("../lib/hash");
const { closePool, withClient } = require("../lib/postgres");
const { getEmbeddingProvider, vectorLiteral } = require("../embed/embeddingProvider");

const EMBEDDING_SCOPE = "canonical";
const DEFAULT_MAX_EMBED_CHARS_PER_RECORD = 6000;
const DEFAULT_HARD_MAX_EMBED_CHARS_PER_RECORD = 24000;

function positiveInt(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    dryRun: false,
    force: false,
    limit: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg.startsWith("--limit=")) args.limit = positiveInt(arg.slice("--limit=".length));
    else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: npm run recallgraph:embed -- [--dry-run] [--limit=100] [--force]",
          "",
          "--dry-run    Check what would embed without provider calls or DB writes.",
          "--limit=N    Embed at most N new/changed records in this run.",
          "--force      Re-embed unchanged records. Requires RECALLGRAPH_ALLOW_FORCE_EMBED=true.",
        ].join("\n")
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function getRunLimit(cliLimit) {
  const envLimit = positiveInt(process.env.RECALLGRAPH_MAX_EMBEDDINGS_PER_RUN);
  if (cliLimit && envLimit) return Math.min(cliLimit, envLimit);
  return cliLimit || envLimit || null;
}

function getMaxCharsPerRecord() {
  return positiveInt(
    process.env.RECALLGRAPH_MAX_EMBED_CHARS_PER_RECORD,
    DEFAULT_MAX_EMBED_CHARS_PER_RECORD
  );
}

function getHardMaxCharsPerRecord(maxChars) {
  return Math.max(
    maxChars,
    positiveInt(
      process.env.RECALLGRAPH_HARD_MAX_EMBED_CHARS_PER_RECORD,
      DEFAULT_HARD_MAX_EMBED_CHARS_PER_RECORD
    )
  );
}

function normalizeCanonicalText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function validateCanonicalEmbeddingInput(recallId, text, hardMaxChars) {
  if (!text) {
    throw new Error(`Recall ${recallId} has empty canonical_text.`);
  }

  if (text.length > hardMaxChars) {
    throw new Error(
      `Recall ${recallId} canonical_text is ${text.length} chars, above hard limit ${hardMaxChars}.`
    );
  }

  if (/<(?:html|body|script|style|table|div|p|img|a)\b/i.test(text)) {
    throw new Error(`Recall ${recallId} canonical_text appears to contain HTML.`);
  }

  const trimmed = text.trim();
  if (
    /^[{[]/.test(trimmed) ||
    /"rawRecord"|"raw_record_json"|"normalized_record_json"|"canonicalTextForEmbedding"|"images_json"/i.test(
      trimmed
    )
  ) {
    throw new Error(`Recall ${recallId} canonical_text appears to contain JSON/raw payload data.`);
  }
}

function prepareEmbeddingInput(row, maxChars, hardMaxChars) {
  const canonicalText = normalizeCanonicalText(row.canonical_text);
  validateCanonicalEmbeddingInput(row.id, canonicalText, hardMaxChars);

  if (canonicalText.length <= maxChars) {
    return { text: canonicalText, truncated: false };
  }

  return {
    text: canonicalText.slice(0, maxChars).trimEnd(),
    truncated: true,
  };
}

function estimateTokens(chars) {
  return Math.ceil(chars / 4);
}

function estimateCost(provider, chars) {
  if (provider.name !== "openai") {
    return { tokens: estimateTokens(chars), cost: 0, costKnown: true };
  }

  const pricePerMillion = Number(process.env.RECALLGRAPH_OPENAI_EMBEDDING_USD_PER_1M_TOKENS || "");
  if (!Number.isFinite(pricePerMillion) || pricePerMillion <= 0) {
    return { tokens: estimateTokens(chars), cost: null, costKnown: false };
  }

  const tokens = estimateTokens(chars);
  return {
    tokens,
    cost: (tokens / 1_000_000) * pricePerMillion,
    costKnown: true,
  };
}

function formatCostEstimate(provider, chars) {
  const estimate = estimateCost(provider, chars);
  if (!estimate.costKnown) {
    return `estimated_tokens=${estimate.tokens}, estimated_cost=unavailable (set RECALLGRAPH_OPENAI_EMBEDDING_USD_PER_1M_TOKENS)`;
  }
  return `estimated_tokens=${estimate.tokens}, estimated_cost_usd=${estimate.cost.toFixed(6)}`;
}

async function replaceEmbedding(client, row, provider, textHash, embedding) {
  await client.query("BEGIN");
  try {
    await client.query(
      "DELETE FROM recall_embeddings WHERE recall_id = $1 AND embedding_scope = $2 AND model = $3",
      [row.id, EMBEDDING_SCOPE, provider.model]
    );
    await client.query(
      `
        INSERT INTO recall_embeddings (recall_id, embedding_scope, model, dimensions, text_hash, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        ON CONFLICT (recall_id, embedding_scope, model, text_hash)
        DO UPDATE SET
          dimensions = EXCLUDED.dimensions,
          embedding = EXCLUDED.embedding
      `,
      [row.id, EMBEDDING_SCOPE, provider.model, provider.dimensions, textHash, vectorLiteral(embedding)]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.force && process.env.RECALLGRAPH_ALLOW_FORCE_EMBED !== "true") {
    throw new Error(
      "--force requires RECALLGRAPH_ALLOW_FORCE_EMBED=true. This prevents accidental full re-embedding."
    );
  }

  const provider = getEmbeddingProvider();
  const maxChars = getMaxCharsPerRecord();
  const hardMaxChars = getHardMaxCharsPerRecord(maxChars);
  const runLimit = getRunLimit(args.limit);

  const stats = {
    totalRecallsChecked: 0,
    skippedUnchanged: 0,
    embeddedNewOrChanged: 0,
    failed: 0,
    truncated: 0,
    deferredByRunLimit: 0,
    embeddingInputChars: 0,
  };

  await withClient(async (client) => {
    const { rows } = await client.query(
      "SELECT id, canonical_text FROM recalls WHERE canonical_text IS NOT NULL AND canonical_text <> '' ORDER BY published_at DESC NULLS LAST, id"
    );

    for (const row of rows) {
      stats.totalRecallsChecked += 1;

      let prepared;
      try {
        prepared = prepareEmbeddingInput(row, maxChars, hardMaxChars);
      } catch (error) {
        stats.failed += 1;
        console.warn(`[RecallGraph embed] skipped ${row.id}: ${error.message}`);
        continue;
      }

      if (prepared.truncated) stats.truncated += 1;
      const textHash = sha256(prepared.text);
      const existing = await client.query(
        "SELECT id FROM recall_embeddings WHERE recall_id = $1 AND embedding_scope = $2 AND model = $3 AND text_hash = $4 LIMIT 1",
        [row.id, EMBEDDING_SCOPE, provider.model, textHash]
      );

      if (existing.rowCount && !args.force) {
        stats.skippedUnchanged += 1;
        continue;
      }

      if (runLimit && stats.embeddedNewOrChanged >= runLimit) {
        stats.deferredByRunLimit += 1;
        continue;
      }

      stats.embeddingInputChars += prepared.text.length;

      if (args.dryRun) {
        stats.embeddedNewOrChanged += 1;
        continue;
      }

      try {
        const embedding = await provider.embed(prepared.text);
        if (!Array.isArray(embedding) || embedding.length !== provider.dimensions) {
          throw new Error(
            `Provider returned ${Array.isArray(embedding) ? embedding.length : "invalid"} dimensions; expected ${provider.dimensions}.`
          );
        }
        await replaceEmbedding(client, row, provider, textHash, embedding);
        stats.embeddedNewOrChanged += 1;
      } catch (error) {
        stats.failed += 1;
        console.warn(`[RecallGraph embed] failed ${row.id}: ${error.message}`);
      }
    }
  });

  console.log("RecallGraph embeddings complete.");
  console.log(`provider=${provider.name}`);
  console.log(`model=${provider.model}`);
  console.log(`embedding_scope=${EMBEDDING_SCOPE}`);
  console.log(`dry_run=${args.dryRun}`);
  console.log(`force=${args.force}`);
  console.log(`max_chars_per_record=${maxChars}`);
  console.log(`hard_max_chars_per_record=${hardMaxChars}`);
  console.log(`run_limit=${runLimit || "none"}`);
  console.log(`total_recalls_checked=${stats.totalRecallsChecked}`);
  console.log(`skipped_unchanged=${stats.skippedUnchanged}`);
  console.log(
    `${args.dryRun ? "would_embed_new_or_changed" : "embedded_new_or_changed"}=${stats.embeddedNewOrChanged}`
  );
  console.log(`deferred_by_run_limit=${stats.deferredByRunLimit}`);
  console.log(`truncated_inputs=${stats.truncated}`);
  console.log(`failed=${stats.failed}`);
  console.log(formatCostEstimate(provider, stats.embeddingInputChars));

  if (stats.failed > 0) {
    throw new Error(`RecallGraph embedding run finished with ${stats.failed} failed record(s).`);
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message || error);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = {
  EMBEDDING_SCOPE,
  formatCostEstimate,
  main,
  parseArgs,
  prepareEmbeddingInput,
  validateCanonicalEmbeddingInput,
};
