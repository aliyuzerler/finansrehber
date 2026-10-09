import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Ana Sayfa", end: true },
  { to: "/hisseler", label: "Hisseler" },
  { to: "/abd-borsa", label: "ABD Borsası" },
  { to: "/endeksler", label: "Endeksler" },
  { to: "/doviz", label: "Döviz & Altın" },
  { to: "/kripto", label: "Kripto" },
  { to: "/fonlar", label: "Fonlar" },
  { to: "/tarama", label: "Tarama" },
  { to: "/portfoy", label: "Portföy" },
  { to: "/makro", label: "Makro" },
  { to: "/viop", label: "VIOP" },
  { to: "/takvim", label: "Takvim" },
  { to: "/ai", label: "AI Analist" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* üst kırmızı şerit */}
      <div className="h-1 w-full bg-accent" />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-8 w-8 items-center justify-center bg-accent font-mono text-lg font-extrabold text-white">
              F
            </span>
            <span className="text-lg font-extrabold uppercase tracking-tight text-ink">
              Finans<span className="text-accent">Rehber</span>
            </span>
          </NavLink>

          <nav className="flex flex-wrap items-center gap-x-1 gap-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `border-b-2 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] no-underline transition-colors ${
                    isActive
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:border-line hover:text-ink"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <p className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-faint lg:block">
            ~15 dk gecikmeli veri
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
            FinansRehber — borsapy verileriyle
          </p>
          <p className="font-mono text-[11px] text-faint">
            Kişisel / eğitim amaçlı · Yatırım tavsiyesi değildir
          </p>
        </div>
      </footer>
    </div>
  );
}
