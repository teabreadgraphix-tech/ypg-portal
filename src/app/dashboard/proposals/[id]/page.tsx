"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

type Proposal = {
  id: number; reference: string; title: string; status: string;
  problemStatement: string | null; background: string | null; objectives: string | null;
  beneficiaries: string | null; activities: string | null; expectedOutcomes: string | null;
  methodology: string | null; location: string | null; startDate: string | null; endDate: string | null;
  budget: string | null; fundingSource: string | null; partners: string | null;
  sustainabilityPlan: string | null; mePlan: string | null; updatedAt: string;
  youthMpName: string | null; constituencyName: string | null; regionName: string | null; categoryName: string | null;
};
type Comment = { id: number; authorId: number; action: string; body: string; createdAt: string };

const ACTION_LABEL: Record<string, string> = {
  comment: "Comment", approved: "Approved", rejected: "Rejected", revision_requested: "Revision Requested",
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/proposals/${id}`).then((r) => r.json()).then(setRecord);
    fetch(`/api/proposals/${id}/comments`).then((r) => r.json()).then((d) => setComments(Array.isArray(d) ? d : []));
  }
  useEffect(load, [id]);

  async function act(action: "comment" | "approved" | "rejected" | "revision_requested") {
    if (!newComment.trim() && action !== "comment") {
      setError(`A comment explaining the ${action === "approved" ? "approval" : action === "rejected" ? "rejection" : "requested revision"} is required.`);
      return;
    }
    if (!newComment.trim()) {
      setError("Write a comment first.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/proposals/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, body: newComment }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Something went wrong.");
    else {
      setNewComment("");
      load();
    }
    setBusy(false);
  }

  async function resubmit() {
    setBusy(true);
    await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resubmit: true }),
    });
    load();
    setBusy(false);
  }

  if (!record) return <p className="text-sm text-ink/60">Loading…</p>;

  const canReviewNow = ["Submitted", "Under Review", "Revision Required"].includes(record.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50">{record.reference}</p>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">{record.title}</h2>
          <StatusBadge status={record.status} />
        </div>
        <p className="text-sm text-ink/60">
          {record.youthMpName} · {record.constituencyName}, {record.regionName}
          {record.categoryName && ` · ${record.categoryName}`}
        </p>
      </div>

      {record.status === "Approved" && (
        <div className="rounded border border-forest-700/30 bg-forest-800/5 p-4">
          <p className="text-sm font-medium text-ink">This proposal is approved and ready to become a project.</p>
          <Link href={`/dashboard/projects/new?fromProposal=${record.id}`} className="btn-primary mt-3 inline-block">
            Create Project
          </Link>
        </div>
      )}

      {record.status === "Revision Required" && (
        <div className="rounded border border-gold-500/40 bg-gold-100 p-4">
          <p className="text-sm font-medium text-ink">Revision requested — see comments below for details.</p>
          <button onClick={resubmit} disabled={busy} className="btn-primary mt-3">Resubmit for Review</button>
        </div>
      )}

      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <Info label="Location" value={record.location} />
        <Info label="Budget" value={record.budget ? `GH₵ ${Number(record.budget).toLocaleString()}` : null} />
        <Info label="Start Date" value={record.startDate} />
        <Info label="End Date" value={record.endDate} />
        <Info label="Funding Source" value={record.fundingSource} />
        <Info label="Partners" value={record.partners} />
      </div>

      {[
        ["Problem Statement", record.problemStatement], ["Background", record.background],
        ["Objectives", record.objectives], ["Beneficiaries", record.beneficiaries],
        ["Activities", record.activities], ["Expected Outcomes", record.expectedOutcomes],
        ["Methodology", record.methodology], ["Sustainability Plan", record.sustainabilityPlan],
        ["M&E Plan", record.mePlan],
      ].map(([label, value]) =>
        value ? (
          <div key={label} className="card p-6">
            <h3 className="mb-2 text-sm font-medium text-ink">{label}</h3>
            <p className="whitespace-pre-wrap text-sm text-ink/80">{value}</p>
          </div>
        ) : null,
      )}

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-medium text-ink">Review &amp; Comments</h3>

        {comments.length === 0 ? (
          <p className="text-sm text-ink/60">No comments yet.</p>
        ) : (
          <ul className="mb-5 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className={`badge ${c.action === "comment" ? "bg-line text-ink/60" : c.action === "approved" ? "bg-forest-800 text-paper" : c.action === "rejected" ? "bg-red-100 text-red-700" : "bg-gold-100 text-gold-600"}`}>
                    {ACTION_LABEL[c.action]}
                  </span>
                  <span className="text-xs text-ink/50">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-ink/80">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        <textarea
          className="field-input"
          rows={3}
          placeholder="Write a comment…"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => act("comment")} disabled={busy} className="btn-secondary">Add Comment</button>
          {canReviewNow && (
            <>
              <button onClick={() => act("approved")} disabled={busy} className="btn-primary">Approve</button>
              <button onClick={() => act("revision_requested")} disabled={busy} className="rounded border border-gold-500 px-4 py-2.5 text-sm font-medium text-gold-600 hover:bg-gold-100">Request Revision</button>
              <button onClick={() => act("rejected")} disabled={busy} className="rounded border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50">Reject</button>
            </>
          )}
        </div>
        {!canReviewNow && (
          <p className="mt-2 text-xs text-ink/50">Approve/Reject/Request Revision are only available for Submitted, Under Review, or Revision Required proposals, for admin accounts.</p>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink/50">{label}</p>
      <p className="text-sm text-ink">{value || "—"}</p>
    </div>
  );
}
