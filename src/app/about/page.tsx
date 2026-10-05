import Image from "next/image";
import { PublicHeader, PublicFooter } from "@/components/public-header";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="/about" />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center gap-4">
          <Image src="/ppl-seal.png" alt="" width={64} height={64} />
          <div>
            <h1 className="font-serif text-2xl font-semibold text-ink">About</h1>
            <p className="text-sm text-ink/60">Office of Programmes, Projects &amp; Logistics</p>
          </div>
        </div>

        <div className="card space-y-4 p-7 text-sm leading-relaxed text-ink/80">
          <p>
            The Office of Programmes, Projects &amp; Logistics coordinates Youth Parliament Ghana's work across
            all 16 regions — maintaining a single, accurate record of every Youth MP and their appointed
            executive teams, and overseeing the programmes and projects they undertake in their constituencies.
          </p>
          <p>
            Each Youth MP appoints a 7-member executive team: a Chairman/Constituency Coordinator, Secretary,
            Treasurer, Organizer, Women's Organizer, Communications Officer/PRO, and Research &amp; Programs
            Officer — each playing a distinct role in constituency-level youth governance.
          </p>
          <p>
            This site shares that record publicly. Internally, the Office also runs a dedicated system for
            submissions, approvals, project tracking, and correspondence — accessible to Youth MPs and
            directorate staff via the Staff Login above.
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
