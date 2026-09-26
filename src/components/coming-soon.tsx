export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-gold-500" />
      <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink/60">
        Coming soon — this module's database tables already exist; the screen isn't built yet.
      </p>
      {note && <p className="mt-2 text-xs text-ink/40">{note}</p>}
    </div>
  );
}
