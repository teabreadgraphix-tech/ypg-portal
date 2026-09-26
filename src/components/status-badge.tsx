const COLORS: Record<string, string> = {
  Pending: "bg-gold-100 text-gold-600",
  Active: "bg-forest-800 text-paper",
  Inactive: "bg-line text-ink/60",
  Resigned: "bg-line text-ink/60",
  Removed: "bg-red-100 text-red-700",
  Draft: "bg-line text-ink/60",
  Submitted: "bg-gold-100 text-gold-600",
  "Under Review": "bg-gold-100 text-gold-600",
  "Revision Required": "bg-red-100 text-red-700",
  Approved: "bg-forest-800 text-paper",
  Rejected: "bg-red-100 text-red-700",
  Ongoing: "bg-forest-700 text-paper",
  Completed: "bg-forest-800 text-paper",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${COLORS[status] ?? "bg-line text-ink/60"}`}>{status}</span>;
}
