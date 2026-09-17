import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 lg:flex">
      <aside className="flex flex-col bg-gray-900 p-6 text-white lg:min-h-screen lg:w-64 lg:shrink-0">
        <div>
          <h1 className="text-xl font-bold">Barbershop</h1>
          <p className="mt-1 text-sm text-gray-400">Management App</p>
        </div>

        <nav aria-label="Menu utama" className="mt-8 space-y-2">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/services"
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            Layanan
          </NavLink>
        </nav>

        <div className="mt-8 border-t border-gray-700 pt-6 lg:mt-auto">
          <p className="font-medium">{user?.name}</p>
          <p className="mt-1 text-sm text-gray-400">{user?.role}</p>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
