import { sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { appointees, proposals, letters, actionPlans, projects, activityLogs } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

async function countBy<T extends string>(rows: { status: T }[]) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
  return map;
}

export default async function DashboardHome() {
  const session = await getSession();

  const [appointeeRows, proposalRows, letterRows, actionPlanRows, projectRows, recentActivity] = await Promise.all([
    db.select({ status: appointees.status }).from(appointees),
    db.select({ status: proposals.status }).from(proposals),
    db.select({ status: letters.status }).from(letters),
    db.select({ status: actionPlans.status, deadline: actionPlans.deadline }).from(actionPlans),
    db.select({ status: projects.status }).from(projects),
    db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(8),
  ]);

  const appointeeCounts = await countBy(appointeeRows);
  const proposalCounts = await countBy(proposalRows);
  const letterCounts = await countBy(letterRows);
  const actionCounts = await countBy(actionPlanRows.map((r) => ({ status: r.status })));
  const projectCounts = await countBy(projectRows);

  const today = new Date().toISOString().slice(0, 10);
  const overdueActionPlans = actionPlanRows.filter(
    (r) => r.deadline && r.deadline < today && r.status !== "Completed" && r.status !== "Cancelled",
  ).length;

  const completeAppointeeProfiles =
    appointeeRows.length -
    (appointeeCounts.get("Pending") ?? 0); // "complete" here = past the initial pending intake

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-ink">Appointees</h2>
        <StatRow
          items={[
            ["Total", appointeeRows.length],
            ["Complete Profiles", completeAppointeeProfiles],
            ["Pending Profiles", appointeeCounts.get("Pending") ?? 0],
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-ink">Projects</h2>
        <StatRow
          items={[
            ["Total", projectRows.length],
            ["Planned", projectCounts.get("Planned") ?? 0],
            ["Approved", projectCounts.get("Approved") ?? 0],
            ["Ongoing", projectCounts.get("Ongoing") ?? 0],
            ["Completed", projectCounts.get("Completed") ?? 0],
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-ink">Proposals</h2>
        <StatRow
          items={[
            ["Total", proposalRows.length],
            ["Under Review", proposalCounts.get("Under Review") ?? 0],
            ["Approved", proposalCounts.get("Approved") ?? 0],
            ["Revision Required", proposalCounts.get("Revision Required") ?? 0],
            ["Rejected", proposalCounts.get("Rejected") ?? 0],
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-ink">Correspondence</h2>
        <StatRow
          items={[
            ["Total Letters", letterRows.length],
            ["Action Required", letterCounts.get("Action Required") ?? 0],
            ["Responded", letterCounts.get("Responded") ?? 0],
            ["Closed", letterCounts.get("Closed") ?? 0],
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-ink">Action Plans</h2>
        <StatRow
          items={[
            ["Submitted", actionPlanRows.length],
            ["Pending", actionCounts.get("Pending") ?? 0],
            ["In Progress", actionCounts.get("In Progress") ?? 0],
            ["Completed", actionCounts.get("Completed") ?? 0],
            ["Overdue", overdueActionPlans],
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-ink">Recent Activity</h2>
        <div className="card divide-y divide-line">
          {recentActivity.length === 0 && (
            <p className="p-4 text-sm text-ink/60">No activity recorded yet.</p>
          )}
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 text-sm">
              <span className="text-ink">{a.details}</span>
              <span className="text-ink/50">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {!canReview(session!.role) && (
        <p className="text-xs text-ink/50">Showing organization-wide totals. Use the sidebar to submit or manage your own items.</p>
      )}
    </div>
  );
}

function StatRow({ items }: { items: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="card p-4">
          <p className="text-2xl font-semibold text-forest-800">{value}</p>
          <p className="mt-1 text-xs text-ink/60">{label}</p>
        </div>
      ))}
    </div>
  );
}
