import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";

interface DashboardSummary {
  date: string;
  timezone: string;
  ordersToday: number;
  waitingOrders: number;
  inServiceOrders: number;
  revenueToday: number;
}

interface DashboardResponse {
  message: string;
  data: DashboardSummary;
}

function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchSummary = async () => {
      try {
        const response = await api.get<DashboardResponse>("/dashboard/summary");

        if (!ignore) {
          setSummary(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (axios.isAxiosError(error)) {
          setErrorMessage(
            error.response?.status === 401
              ? "Sesi sudah tidak valid. Silakan logout dan login kembali."
              : "Gagal mengambil ringkasan dashboard. Coba muat ulang halaman.",
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil dashboard.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchSummary();

    return () => {
      ignore = true;
    };
  }, []);

  const rupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <header>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-gray-600">Ringkasan aktivitas barbershop.</p>
        </header>
        {isLoading && (
          <p role="status" className="mt-8">
            Memuat ringkasan...
          </p>
        )}

        {errorMessage && (
          <div className="mt-8 rounded-lg bg-red-50 p-4">
            <p role="alert" className="text-red-700">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-white"
            >
              Muat ulang
            </button>
          </div>
        )}

        {summary && (
          <>
            <p className="mt-8 text-sm text-gray-600">
              Tanggal: {summary.date} — {summary.timezone}
            </p>

            <section
              aria-label="Ringkasan operasional"
              className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <article className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-sm text-gray-600">Order hari ini</h2>
                <p className="mt-3 text-3xl font-bold">{summary.ordersToday}</p>
              </article>

              <article className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-sm text-gray-600">Menunggu layanan</h2>
                <p className="mt-3 text-3xl font-bold text-amber-600">
                  {summary.waitingOrders}
                </p>
              </article>

              <article className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-sm text-gray-600">Sedang dikerjakan</h2>
                <p className="mt-3 text-3xl font-bold text-blue-600">
                  {summary.inServiceOrders}
                </p>
              </article>

              <article className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-sm text-gray-600">Pendapatan hari ini</h2>
                <p className="mt-3 break-words text-2xl font-bold text-green-700">
                  {rupiah(summary.revenueToday)}
                </p>
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
