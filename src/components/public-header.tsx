import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/mps", label: "Youth MPs" },
  { href: "/appointees", label: "Appointees" },
  { href: "/about", label: "About" },
];

export function PublicHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={36} height={36} />
          <div className="leading-tight">
            <p className="font-serif text-sm font-semibold text-ink">Youth Parliament Ghana</p>
            <p className="text-[11px] text-ink/50">Programmes, Projects &amp; Logistics</p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                active === l.href ? "bg-forest-800 text-paper" : "text-ink/70 hover:bg-forest-950/5 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="btn-secondary ml-1 !px-3 !py-1.5 text-sm">
            Staff Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white py-8">
      <div className="mx-auto max-w-6xl px-5 text-center text-xs text-ink/50">
        <p>Youth Parliament Ghana — Office of Programmes, Projects &amp; Logistics</p>
        <p className="mt-1">Data shown here is updated directly from the Office's records.</p>
      </div>
    </footer>
  );
}
