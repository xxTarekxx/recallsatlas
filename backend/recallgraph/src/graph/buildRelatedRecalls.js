function tokenSet(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
  );
}

function jaccard(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / (left.size + right.size - overlap);
}

function sharedHazardScore(a, b) {
  const left = new Set((a.hazards || []).map((value) => String(value).toLowerCase()));
  const right = new Set((b.hazards || []).map((value) => String(value).toLowerCase()));
  if (!left.size || !right.size) return 0;
  for (const hazard of left) {
    for (const other of right) {
      if (hazard.includes(other) || other.includes(hazard) || jaccard(hazard, other) > 0.3) return 0.78;
    }
  }
  return 0;
}

function linkCandidates(records, limitPerRecall = 8) {
  const links = [];
  for (let i = 0; i < records.length; i += 1) {
    const source = records[i];
    const candidates = [];

    for (let j = 0; j < records.length; j += 1) {
      if (i === j) continue;
      const target = records[j];
      let best = { score: 0, linkType: "", reason: "" };

      if (source.sourceUrl && source.sourceUrl === target.sourceUrl) {
        best = { score: 1, linkType: "duplicate_candidate", reason: "Same source URL" };
      }

      const titleScore = jaccard(source.title, target.title);
      const sameCompany =
        source.normalizedCompanyName &&
        target.normalizedCompanyName &&
        source.normalizedCompanyName === target.normalizedCompanyName;
      const productScore = jaccard(source.productName || source.productDescription, target.productName || target.productDescription);
      const hazardScore = sharedHazardScore(source, target);

      if (sameCompany && Math.max(productScore, hazardScore, titleScore) > 0.2 && best.score < 0.82) {
        best = {
          score: Number((0.65 + Math.max(productScore, hazardScore, titleScore) * 0.25).toFixed(4)),
          linkType: "same_company",
          reason: "Same normalized company with similar product, hazard, or title",
        };
      }

      if (hazardScore && best.score < hazardScore) {
        best = { score: hazardScore, linkType: "same_hazard", reason: "Similar hazard or recall reason" };
      }

      if (productScore > 0.45 && best.score < productScore) {
        best = { score: productScore, linkType: "same_product", reason: "Similar product wording" };
      }

      if (titleScore > 0.55 && best.score < titleScore) {
        best = { score: titleScore, linkType: "semantic_related", reason: "Similar recall title wording" };
      }

      if (best.score >= 0.55) {
        candidates.push({
          sourceRecallId: source.id,
          targetRecallId: target.id,
          linkType: best.linkType,
          score: best.score,
          reason: best.reason,
          method: "recallgraph-mvp-rules-v1",
        });
      }
    }

    links.push(...candidates.sort((a, b) => b.score - a.score).slice(0, limitPerRecall));
  }

  const seen = new Set();
  return links.filter((link) => {
    const key = `${link.sourceRecallId}:${link.targetRecallId}:${link.linkType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { jaccard, linkCandidates };
