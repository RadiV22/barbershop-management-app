import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../lib/axios";

type ServiceStatus = "WAITING" | "IN_SERVICE" | "COMPLETED";
type PaymentStatus = "UNPAID" | "PAID";
type SortOrder = "asc" | "desc";

interface OrderItem {
  id: number;
  serviceId: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  duration: number;
}

interface OrderCustomer {
  id: number;
  name: string;
}

interface OrderKapster {
  id: number;
  name: string;
}

interface Order {
  id: number;
  customerId: number;
  kapsterId: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  customer: OrderCustomer;
  kapster: OrderKapster;
  items: OrderItem[];
}

interface OrderListResponse {
  message: string;
  data: Order[];
}

interface ErrorResponse {
  message?: string;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}

function getServiceStatusLabel(status: ServiceStatus) {
  switch (status) {
    case "WAITING":
      return "Menunggu";

    case "IN_SERVICE":
      return "Sedang dilayani";

    case "COMPLETED":
      return "Selesai";
  }
}

function getPaymentStatusLabel(status: PaymentStatus) {
  return status === "PAID" ? "Lunas" : "Belum bayar";
}

export default function OrderPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const response = await api.get<OrderListResponse>("/order", {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(serviceStatus ? { serviceStatus } : {}),
            ...(paymentStatus ? { paymentStatus } : {}),
            sortOrder,
          },
        });

        if (cancelled) {
          return;
        }

        setOrders(response.data.data);
        setErrorMessage("");
        setIsLoading(false);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (axios.isAxiosError<ErrorResponse>(error)) {
          setErrorMessage(
            error.response?.data?.message ??
              "Tidak dapat mengambil daftar order.",
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil daftar order.");
        }

        setIsLoading(false);
      }
    }

    loadOrders().catch(() => {
      // Error sudah ditangani di dalam loadOrders.
    });

    return () => {
      cancelled = true;
    };
  }, [search, serviceStatus, paymentStatus, sortOrder]);

  async function handleDeleteOrder(order: Order) {
    if (deletingOrderId !== null) {
      return;
    }

    if (order.serviceStatus !== "WAITING" || order.paymentStatus !== "UNPAID") {
      return;
    }

    const confirmed = window.confirm(
      `Hapus order #${order.id} untuk customer "${order.customer.name}"? Data yang dihapus tidak dapat dikembalikan.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingOrderId(order.id);
    setDeleteError("");

    try {
      await api.delete(`/order/${order.id}`);

      setOrders((previous) => previous.filter((item) => item.id !== order.id));
    } catch (error) {
      if (axios.isAxiosError<ErrorResponse>(error)) {
        setDeleteError(
          error.response?.data?.message ?? "Tidak dapat menghapus order.",
        );
      } else {
        setDeleteError("Terjadi kesalahan saat menghapus order.");
      }
    } finally {
      setDeletingOrderId(null);
    }
  }

  function handleResetFilter() {
    setSearch("");
    setServiceStatus("");
    setPaymentStatus("");
    setSortOrder("desc");
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Order</h1>

          <p className="mt-1 text-gray-600">
            Daftar order customer dan status pembayarannya.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/order/create")}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Buat order
        </button>
      </header>

      {deleteError && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {deleteError}
        </p>
      )}

      <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="order-search"
              className="block text-sm font-medium text-gray-700"
            >
              Cari customer
            </label>

            <input
              id="order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama customer..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="service-status"
              className="block text-sm font-medium text-gray-700"
            >
              Status layanan
            </label>

            <select
              id="service-status"
              value={serviceStatus}
              onChange={(event) =>
                setServiceStatus(event.target.value as ServiceStatus | "")
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">Semua status</option>
              <option value="WAITING">Menunggu</option>
              <option value="IN_SERVICE">Sedang dilayani</option>
              <option value="COMPLETED">Selesai</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-status"
              className="block text-sm font-medium text-gray-700"
            >
              Status pembayaran
            </label>

            <select
              id="payment-status"
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as PaymentStatus | "")
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">Semua pembayaran</option>
              <option value="UNPAID">Belum bayar</option>
              <option value="PAID">Lunas</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sort-order"
              className="block text-sm font-medium text-gray-700"
            >
              Urutan
            </label>

            <select
              id="sort-order"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as SortOrder)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleResetFilter}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Reset filter
          </button>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 p-4 text-red-700"
        >
          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 font-medium underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {isLoading && (
        <p role="status" className="mt-6 text-gray-600">
          Memuat order...
        </p>
      )}

      {!isLoading && !errorMessage && (
        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-gray-700">
                Tidak ada order ditemukan.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Coba ubah pencarian atau filter yang digunakan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Order
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Customer
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Kapster
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Layanan
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Total
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Status layanan
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Pembayaran
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Dibuat
                    </th>

                    <th scope="col" className="whitespace-nowrap px-6 py-4">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const canDelete =
                      order.serviceStatus === "WAITING" &&
                      order.paymentStatus === "UNPAID";

                    return (
                      <tr key={order.id}>
                        <td className="whitespace-nowrap px-6 py-4 font-medium">
                          #{order.id}
                        </td>

                        <td className="px-6 py-4">{order.customer.name}</td>

                        <td className="px-6 py-4">{order.kapster.name}</td>

                        <td className="min-w-52 px-6 py-4">
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id}>
                                <span className="font-medium">
                                  {item.serviceName}
                                </span>

                                <span className="ml-2 text-gray-500">
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 font-medium">
                          {formatRupiah(order.total)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                              order.serviceStatus === "WAITING"
                                ? "bg-yellow-100 text-yellow-700"
                                : order.serviceStatus === "IN_SERVICE"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {getServiceStatusLabel(order.serviceStatus)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                              order.paymentStatus === "PAID"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {getPaymentStatusLabel(order.paymentStatus)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/order/${order.id}`)}
                              className="rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              disabled={!canDelete || deletingOrderId !== null}
                              onClick={() => void handleDeleteOrder(order)}
                              title={
                                !canDelete
                                  ? "Hanya order WAITING dan belum dibayar yang dapat dihapus"
                                  : undefined
                              }
                              className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingOrderId === order.id
                                ? "Menghapus..."
                                : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
