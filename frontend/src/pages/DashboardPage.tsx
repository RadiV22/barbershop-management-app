import { useAuth } from "../hooks/useAuth";

function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <p className="mt-4">Selamat datang, {user?.name}</p>
      <p className="mt-2">Role: {user?.role}</p>

      <button
        type="button"
        onClick={logout}
        className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Logout
      </button>
    </main>
  );
}

export default DashboardPage;
