import { NavLink, Outlet } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Beranda" },
  { to: "/services", label: "Layanan" },
  { to: "/orders", label: "Pesanan saya" },
  { to: "/account", label: "Akun" },
];

export default function CustomerLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-soft bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,48,64,0.06)] backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2 px-4 py-3">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex min-h-12 items-center justify-center rounded-2xl px-2 py-3 text-center text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:bg-peach-light hover:text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
