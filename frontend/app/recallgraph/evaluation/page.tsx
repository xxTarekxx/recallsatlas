import type { Metadata } from "next";
import EvaluationSummary from "@/components/recallgraph/EvaluationSummary";
import { getRecallGraphEvaluation } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "RecallGraph Evaluation",
  description: "RecallGraph search quality evaluation report and starter query set.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecallGraphEvaluationPage() {
  const { report, markdown } = await getRecallGraphEvaluation();

  return (
    <div className="recallgraph-page">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Evaluation</span>
        <h1>Search quality report</h1>
        <p>Tracks starter query coverage, latency, zero-result cases, and relevance metrics.</p>
      </div>
      <EvaluationSummary report={report} markdown={markdown} />
    </div>
  );
}
