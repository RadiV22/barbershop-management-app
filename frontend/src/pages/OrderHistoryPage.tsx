import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../lib/axios";

interface HistoryOrder {
  id: number;
  total: number;
  completedAt: string | null;
  customer: {
    id: number;
    name: string;
  };
  kapster: {
    id: number;
    name: string;
  };
  items: {
    id: number;
    serviceName: string;
    quantity: number;
  }[];
  payment: {
    method: string;
  } | null;
}

interface HistoryResponse {
  message: string;
  data: HistoryOrder[];
}

interface HistoryFilters {
  search: string;
  startDate: string;
  endDate: string;
}

const emptyFilters: HistoryFilters = {
  search: "",
  startDate: "",
  endDate: "",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filterError, setFilterError] = useState("");

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get<HistoryResponse>("/order/history", {
          params: {
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.startDate ? { startDate: filters.startDate } : {}),
            ...(filters.endDate ? { endDate: filters.endDate } : {}),
          },
        });

        if (!ignore) {
          setOrders(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (axios.isAxiosError<{ message?: string }>(error)) {
          setErrorMessage(
            error.response?.status === 401
              ? "Sesi sudah tidak valid. Silakan logout dan login kembali."
              : (error.response?.data?.message ??
                  "Tidak dapat mengambil riwayat order."),
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil riwayat order.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, [filters]);

  function handleApplyFilters() {
    setFilterError("");

    if (startDate && endDate && startDate > endDate) {
      setFilterError("Tanggal mulai tidak boleh melewati tanggal akhir.");
      return;
    }

    setFilters({
      search: search.trim(),
      startDate,
      endDate,
    });
  }

  function handleResetFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setFilterError("");
    setFilters({ ...emptyFilters });
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold text-primary">Riwayat Order</h1>
        <p className="mt-1 text-muted">
          Order yang sudah selesai dilayani dan lunas.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
        className="mt-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="history-search"
              className="block text-sm font-medium text-primary"
            >
              Nama customer
            </label>
            <input
              id="history-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari customer..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="history-start"
              className="block text-sm font-medium text-primary"
            >
              Tanggal mulai
            </label>
            <input
              id="history-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="history-end"
              className="block text-sm font-medium text-primary"
            >
              Tanggal akhir
            </label>
            <input
              id="history-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted">
          Filter tanggal mengikuti waktu layanan selesai dalam WIB. Tanggal
          boleh dikosongkan.
        </p>

        {filterError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {filterError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary"
          >
            Terapkan filter
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="min-h-11 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-soft/30"
          >
            Reset
          </button>
        </div>
      </form>

      {isLoading && (
        <p role="status" className="mt-6 text-gray-600">
          Memuat riwayat order...
        </p>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 p-4 text-red-700"
        >
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => setFilters((previous) => ({ ...previous }))}
            className="mt-2 font-medium underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && (
        <section
          aria-label="Daftar riwayat order"
          className="mt-6 overflow-hidden rounded-xl border border-border bg-white shadow-sm"
        >
          {orders.length === 0 ? (
            <p className="p-6 text-gray-600">
              Tidak ada riwayat order yang sesuai dengan filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-border bg-soft/30 text-primary">
                  <tr>
                    <th scope="col" className="px-4 py-4">
                      Order
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Customer
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Kapster
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Layanan
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Metode bayar
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Selesai (WIB)
                    </th>
                    <th scope="col" className="px-4 py-4">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-background"
                    >
                      <td className="px-4 py-4 font-medium">#{order.id}</td>
                      <td className="px-4 py-4">{order.customer.name}</td>
                      <td className="px-4 py-4">{order.kapster.name}</td>

                      <td className="min-w-52 max-w-72 px-4 py-4">
                        <div className="space-y-2">
                          {order.items.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2"
                            >
                              <span className="min-w-0 break-words text-stone-800">
                                {item.serviceName}
                              </span>

                              <span className="shrink-0 text-xs leading-5 text-muted">
                                ×{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.items.length > 2 && (
                          <Link
                            to={`/order/${order.id}`}
                            className="mt-2 inline-flex min-h-8 items-center text-xs font-semibold text-primary hover:underline"
                            aria-label={`Lihat semua layanan order #${order.id}`}
                          >
                            +{order.items.length - 2} layanan lainnya
                          </Link>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {formatRupiah(order.total)}
                      </td>

                      <td className="px-4 py-4">
                        {order.payment?.method ?? "Tidak tercatat"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {order.completedAt ? (
                          <>
                            <p className="text-stone-800">
                              {new Date(order.completedAt).toLocaleDateString(
                                "id-ID",
                                {
                                  timeZone: "Asia/Jakarta",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              {new Date(order.completedAt).toLocaleTimeString(
                                "id-ID",
                                {
                                  timeZone: "Asia/Jakarta",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}{" "}
                              WIB
                            </p>
                          </>
                        ) : (
                          <span className="text-muted">Belum selesai</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          to={`/order/${order.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-soft bg-soft/30 px-3 py-2 font-semibold text-primary transition-colors hover:bg-soft/60"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
