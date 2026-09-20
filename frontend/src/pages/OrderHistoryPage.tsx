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

function formatDate(value: string | null) {
  if (!value) return "Tidak tercatat";

  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
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
        <h1 className="text-2xl font-bold">Riwayat Order</h1>
        <p className="mt-1 text-gray-600">
          Order yang sudah selesai dilayani dan lunas.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
        className="mt-6 rounded-xl bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="history-search"
              className="block text-sm font-medium"
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
              className="block text-sm font-medium"
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
            <label htmlFor="history-end" className="block text-sm font-medium">
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

        <p className="mt-3 text-sm text-gray-500">
          Filter tanggal mengikuti waktu layanan selesai dalam WIB. Tanggal
          boleh dikosongkan.
        </p>

        {filterError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {filterError}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Terapkan filter
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
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
          className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm"
        >
          {orders.length === 0 ? (
            <p className="p-6 text-gray-600">
              Tidak ada riwayat order yang sesuai dengan filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Order
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Kapster
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Layanan
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Metode bayar
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Selesai (WIB)
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 font-medium">#{order.id}</td>
                      <td className="px-6 py-4">{order.customer.name}</td>
                      <td className="px-6 py-4">{order.kapster.name}</td>

                      <td className="min-w-48 px-6 py-4">
                        {order.items.map((item) => (
                          <p key={item.id}>
                            {item.serviceName} ×{item.quantity}
                          </p>
                        ))}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        {formatRupiah(order.total)}
                      </td>

                      <td className="px-6 py-4">
                        {order.payment?.method ?? "Tidak tercatat"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        {formatDate(order.completedAt)}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          to={`/order/${order.id}`}
                          className="inline-block rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100"
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
