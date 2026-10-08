interface PlaceholderProps {
  title: string;
}

/** Sonraki fazlarda dolacak sayfalar için yer tutucu. */
export default function PlaceholderPage({ title }: PlaceholderProps) {
  return (
    <div className="border border-line border-t-2 border-t-accent bg-panel p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">{title}</p>
      <h1 className="mt-3 text-2xl font-bold uppercase text-ink">Bu bölüm yakında</h1>
      <p className="mt-2 text-sm text-muted">Sonraki geliştirme fazında aktif olacak.</p>
    </div>
  );
}
