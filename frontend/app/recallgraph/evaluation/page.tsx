import type { Metadata } from "next";
import EvaluationSummary from "@/components/recallgraph/EvaluationSummary";
import RuntimeStatus from "@/components/recallgraph/RuntimeStatus";
import { getRecallGraphEvaluation, getRecallGraphStats } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "Search Quality Evaluation | RecallGraph",
  description:
    "RecallGraph search-quality reporting for starter query coverage, zero-result analysis, latency, limitations, and the path to real embedding evaluation.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecallGraphEvaluationPage() {
  const [stats, evaluation] = await Promise.all([getRecallGraphStats(), getRecallGraphEvaluation()]);
  const { report, markdown } = evaluation;

  return (
    <div className="recallgraph-page">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Search Quality Evaluation</span>
        <h1>Search Quality Evaluation</h1>
        <p>
          Search evaluation shows why results can be trusted, where the retrieval layer is thin,
          and what needs real embeddings plus expected IDs next.
        </p>
      </div>
      <RuntimeStatus stats={stats} compact />
      <EvaluationSummary report={report} markdown={markdown} />
    </div>
  );
}
