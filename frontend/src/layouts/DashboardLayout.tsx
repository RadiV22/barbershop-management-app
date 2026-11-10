import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navigationItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    adminOnly: true,
    end: true,
  },
  {
    to: "/staff/create",
    label: "Tambah Staff",
    adminOnly: true,
    end: false,
  },
  {
    to: "/services",
    label: "Layanan",
    adminOnly: false,
    end: false,
  },
  {
    to: "/customer",
    label: "Customer",
    adminOnly: false,
    end: false,
  },
  {
    to: "/kapster",
    label: "Kapster",
    adminOnly: false,
    end: false,
  },
  {
    to: "/booking",
    label: "Booking",
    adminOnly: false,
    end: false,
  },
  {
    to: "/order",
    label: "Order",
    adminOnly: false,
    end: true,
  },
  {
    to: "/order/history",
    label: "Riwayat",
    adminOnly: false,
    end: false,
  },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const visibleNavigation = navigationItems.filter(
    (item) => !item.adminOnly || user?.role === "ADMIN",
  );

  const userInitial = user?.name?.trim().charAt(0).toUpperCase() || "B";

  return (
    <div className="min-h-dvh bg-background text-stone-800 lg:flex">
      <aside className="flex flex-col bg-primary text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="border-b border-white/15 px-6 py-7">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-lg font-bold text-primary"
            >
              B
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight">BarberBro</p>
              <p className="mt-1 text-xs text-white/75">Management App</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold tracking-[0.18em] text-soft">
            MENU UTAMA
          </p>

          <nav
            aria-label="Menu utama"
            className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
          >
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-12 items-center border-l-2 px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soft ${
                    isActive
                      ? "border-soft bg-white/8 font-semibold text-soft"
                      : "border-transparent font-medium text-white/75 hover:border-white/30 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-2 px-4 pb-5 lg:mt-auto lg:pt-6">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary"
              >
                {userInitial}
              </div>

              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">
                  {user?.name}
                </p>

                <p className="mt-1 text-xs text-soft">
                  {user?.role === "ADMIN"
                    ? "Administrator"
                    : user?.role === "STAFF"
                      ? "Staff"
                      : user?.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-4 min-h-11 w-full rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soft"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1440px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
