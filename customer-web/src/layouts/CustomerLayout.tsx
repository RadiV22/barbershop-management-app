import { NavLink, Outlet } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Beranda" },
  { to: "/services", label: "Layanan" },
  { to: "/orders", label: "Pesanan saya" },
  { to: "/account", label: "Akun" },
];

export default function CustomerLayout() {
  return (
    <div className="min-h-dvh bg-gray-100">
      <main className="mx-auto max-w-3xl pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 py-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex min-h-12 items-center justify-center rounded-xl px-2 py-3 text-center text-xs font-semibold sm:text-sm ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
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
