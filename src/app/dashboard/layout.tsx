import { redirect } from "next/navigation";
import { getSession, ROLE_LABELS } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} fullName={session.fullName} roleLabel={ROLE_LABELS[session.role]} />
      <div className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
          <div>
            <h1 className="font-serif text-lg font-semibold text-ink">Youth Parliament Ghana</h1>
            <p className="text-sm text-ink/60">Office of Programmes, Projects &amp; Logistics</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-ink">{session.fullName}</p>
            <p className="text-ink/60">{ROLE_LABELS[session.role]}</p>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
