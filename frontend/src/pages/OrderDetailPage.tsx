import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import api from "../lib/axios";

type ServiceStatus = "WAITING" | "IN_SERVICE" | "COMPLETED";
type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "CARD" | "OTHER";

interface Officer {
  id: number;
  name: string;
}

interface OrderItem {
  id: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  duration: number;
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  amountReceived: number;
  change: number;
  paidAt: string;
  receivedBy: Officer | null;
}

interface StatusHistory {
  id: number;
  fromStatus: ServiceStatus | null;
  toStatus: ServiceStatus;
  changedAt: string;
  changedBy: Officer;
}

interface OrderDetail {
  id: number;
  serviceStatus: ServiceStatus;
  paymentStatus: "UNPAID" | "PAID";
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
  notes: string | null;
  checkInAt: string;
  completedAt: string | null;
  customer: {
    id: number;
    name: string;
  };
  kapster: {
    id: number;
    name: string;
  };
  createdBy: Officer | null;
  items: OrderItem[];
  payment: Payment | null;
  statusHistories: StatusHistory[];
}

interface OrderDetailResponse {
  message: string;
  data: OrderDetail;
}

const serviceStatusLabels: Record<ServiceStatus, string> = {
  WAITING: "Menunggu",
  IN_SERVICE: "Sedang dilayani",
  COMPLETED: "Selesai",
};

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

export default function OrderDetailPage() {
  const { id } = useParams();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentNeedsReload, setPaymentNeedsReload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadOrder() {
      setIsLoading(true);
      setErrorMessage("");
      setOrder(null);

      const orderId = Number(id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        setErrorMessage("ID order tidak valid.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<OrderDetailResponse>(
          `/order/${orderId}`,
        );

        if (!ignore) {
          setOrder(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (axios.isAxiosError<{ message?: string }>(error)) {
          setErrorMessage(
            error.response?.status === 401
              ? "Sesi sudah tidak valid. Silakan logout dan login kembali."
              : (error.response?.data?.message ??
                  "Tidak dapat mengambil detail order."),
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil detail order.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleUpdateStatus() {
    if (!order || isUpdatingStatus) return;

    const nextStatus =
      order.serviceStatus === "WAITING"
        ? "IN_SERVICE"
        : order.serviceStatus === "IN_SERVICE"
          ? "COMPLETED"
          : null;

    if (!nextStatus) return;

    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusMessage("");

    try {
      await api.patch(`/order/${order.id}/status`, {
        serviceStatus: nextStatus,
      });
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setStatusError(
          error.response?.data?.message ??
            "Tidak dapat memperbarui status. Muat ulang untuk memeriksa status terbaru.",
        );
      } else {
        setStatusError("Terjadi kesalahan saat memperbarui status.");
      }

      setIsUpdatingStatus(false);
      return;
    }

    // Ambil detail lengkap agar riwayat dan waktu selesai ikut diperbarui.
    try {
      const response = await api.get<OrderDetailResponse>(`/order/${order.id}`);

      setOrder(response.data.data);
      setStatusMessage("Status layanan berhasil diperbarui.");
    } catch {
      setStatusError(
        "Status berhasil diperbarui, tetapi detail terbaru gagal dimuat. Muat ulang halaman sebelum melanjutkan.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handlePayment() {
    if (
      !order ||
      isPaying ||
      isUpdatingStatus ||
      paymentNeedsReload ||
      order.paymentStatus === "PAID" ||
      order.payment
    ) {
      return;
    }

    setPaymentError("");
    setPaymentMessage("");

    const received =
      paymentMethod === "CASH" ? Number(amountReceived) : order.total;

    if (
      (paymentMethod === "CASH" && !amountReceived.trim()) ||
      !Number.isSafeInteger(received) ||
      received < 0
    ) {
      setPaymentError(
        "Masukkan uang diterima berupa bilangan bulat yang valid.",
      );
      return;
    }

    if (received < order.total) {
      setPaymentError("Uang diterima belum mencukupi total pembayaran.");
      return;
    }

    setIsPaying(true);

    try {
      await api.post(`/order/${order.id}/payment`, {
        method: paymentMethod,
        amountReceived: received,
      });
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setPaymentError(
          error.response?.data?.message ??
            "Pembayaran belum dapat dipastikan. Muat ulang untuk memeriksa sebelum mencoba lagi.",
        );

        // Jika respons tidak jelas atau terjadi konflik, periksa data terbaru.
        if (
          !error.response ||
          error.response.status >= 500 ||
          error.response.status === 409
        ) {
          setPaymentNeedsReload(true);
        }
      } else {
        setPaymentError(
          "Pembayaran belum dapat dipastikan. Muat ulang untuk memeriksa data terbaru.",
        );
        setPaymentNeedsReload(true);
      }

      setIsPaying(false);
      return;
    }

    try {
      const response = await api.get<OrderDetailResponse>(`/order/${order.id}`);

      setOrder(response.data.data);
      setAmountReceived("");
      setPaymentMessage("Pembayaran berhasil dicatat.");
    } catch {
      setPaymentNeedsReload(true);
      setPaymentError(
        "Pembayaran berhasil dicatat, tetapi detail terbaru gagal dimuat. Muat ulang halaman.",
      );
    } finally {
      setIsPaying(false);
    }
  }

  async function handleDownloadInvoice() {
    if (!order || isDownloading || isPaying || isUpdatingStatus) return;

    setIsDownloading(true);
    setInvoiceError("");

    try {
      const response = await api.get<Blob>(`/order/${order.id}/invoice`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = `nota-order-${order.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      setInvoiceError(
        "Gagal mengunduh nota. Pastikan koneksi dan sesi login masih aktif, lalu coba lagi.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Detail Order {order ? `#${order.id}` : ""}
          </h1>
          <p className="mt-1 text-gray-600">
            Rincian layanan, pembayaran, dan riwayat order.
          </p>
        </div>

        <Link
          to="/order"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Kembali ke daftar
        </Link>
      </header>

      {order && (
        <div className="mt-4">
          <button
            type="button"
            disabled={isDownloading || isPaying || isUpdatingStatus}
            onClick={handleDownloadInvoice}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isDownloading ? "Mengunduh..." : "Unduh Nota PDF"}
          </button>
        </div>
      )}

      {invoiceError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
          {invoiceError}
        </p>
      )}

      {isLoading && (
        <p role="status" className="mt-6 text-gray-600">
          Memuat detail order...
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
            onClick={() => window.location.reload()}
            className="mt-2 font-medium underline"
          >
            Muat ulang
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && order && (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Informasi order</h2>

            {statusMessage && (
              <p
                role="status"
                className="mt-4 rounded-lg bg-green-50 p-3 text-green-700"
              >
                {statusMessage}
              </p>
            )}

            {statusError && (
              <div
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"
              >
                <p>{statusError}</p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 font-medium underline"
                >
                  Muat ulang
                </button>
              </div>
            )}

            {order.serviceStatus !== "COMPLETED" && (
              <button
                type="button"
                disabled={
                  isUpdatingStatus ||
                  isPaying ||
                  paymentNeedsReload ||
                  Boolean(statusError)
                }
                onClick={handleUpdateStatus}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdatingStatus
                  ? "Memperbarui..."
                  : order.serviceStatus === "WAITING"
                    ? "Mulai layanan"
                    : "Selesaikan layanan"}
              </button>
            )}

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500">Customer</dt>
                <dd className="font-medium">{order.customer.name}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Kapster</dt>
                <dd className="font-medium">{order.kapster.name}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Status layanan</dt>
                <dd>{serviceStatusLabels[order.serviceStatus]}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Pembayaran</dt>
                <dd>
                  {order.paymentStatus === "PAID" ? "Lunas" : "Belum bayar"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Waktu masuk (WIB)</dt>
                <dd>{formatDate(order.checkInAt)}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Waktu selesai (WIB)</dt>
                <dd>
                  {order.completedAt
                    ? formatDate(order.completedAt)
                    : "Belum selesai"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Petugas pembuat</dt>
                <dd>{order.createdBy?.name ?? "Tidak tercatat"}</dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Catatan</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {order.notes || "Tidak ada catatan"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <h2 className="px-6 py-4 text-lg font-semibold">Rincian layanan</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Layanan
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Harga satuan
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Jumlah
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Subtotal
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">{item.serviceName}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="px-6 py-4">{item.quantity}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formatRupiah(item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 border-t border-gray-100 p-6 text-right">
              <p>Subtotal: {formatRupiah(order.subtotal)}</p>
              <p>
                Diskon ({order.discountPercent}%):{" "}
                {formatRupiah(order.discount)}
              </p>
              <p className="text-xl font-bold">
                Total: {formatRupiah(order.total)}
              </p>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Pembayaran</h2>

            {paymentMessage && (
              <p
                role="status"
                className="mt-4 rounded-lg bg-green-50 p-3 text-green-700"
              >
                {paymentMessage}
              </p>
            )}

            {paymentError && (
              <div
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"
              >
                <p>{paymentError}</p>

                {paymentNeedsReload && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-2 font-medium underline"
                  >
                    Muat ulang
                  </button>
                )}
              </div>
            )}

            {order.payment ? (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-gray-500">Metode</dt>
                  <dd>{order.payment.method}</dd>
                </div>

                <div>
                  <dt className="text-sm text-gray-500">Jumlah pembayaran</dt>
                  <dd>{formatRupiah(order.payment.amount)}</dd>
                </div>

                <div>
                  <dt className="text-sm text-gray-500">Uang diterima</dt>
                  <dd>{formatRupiah(order.payment.amountReceived)}</dd>
                </div>

                <div>
                  <dt className="text-sm text-gray-500">Kembalian</dt>
                  <dd>{formatRupiah(order.payment.change)}</dd>
                </div>

                <div>
                  <dt className="text-sm text-gray-500">Waktu bayar (WIB)</dt>
                  <dd>{formatDate(order.payment.paidAt)}</dd>
                </div>

                <div>
                  <dt className="text-sm text-gray-500">Petugas penerima</dt>
                  <dd>{order.payment.receivedBy?.name ?? "Tidak tercatat"}</dd>
                </div>
              </dl>
            ) : order.paymentStatus === "UNPAID" ? (
              <form
                className="mt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handlePayment();
                }}
              >
                <fieldset
                  disabled={
                    isPaying ||
                    isUpdatingStatus ||
                    paymentNeedsReload ||
                    Boolean(statusError)
                  }
                  className="space-y-4"
                >
                  <p className="font-semibold">
                    Total tagihan: {formatRupiah(order.total)}
                  </p>

                  <div>
                    <label
                      htmlFor="payment-method"
                      className="block text-sm font-medium"
                    >
                      Metode pembayaran
                    </label>

                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(event.target.value as PaymentMethod);
                        setAmountReceived("");
                        setPaymentError("");
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="CASH">Tunai</option>
                      <option value="TRANSFER">Transfer</option>
                      <option value="QRIS">QRIS</option>
                      <option value="CARD">Kartu</option>
                      <option value="OTHER">Lainnya</option>
                    </select>
                  </div>

                  {paymentMethod === "CASH" ? (
                    <div>
                      <label
                        htmlFor="amount-received"
                        className="block text-sm font-medium"
                      >
                        Uang diterima (Rp)
                      </label>

                      <input
                        id="amount-received"
                        type="number"
                        required
                        min={order.total}
                        step="1"
                        value={amountReceived}
                        onChange={(event) =>
                          setAmountReceived(event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                      />

                      {amountReceived !== "" &&
                        Number.isSafeInteger(Number(amountReceived)) &&
                        Number(amountReceived) >= order.total && (
                          <p className="mt-2 text-sm text-gray-600">
                            Estimasi kembalian:{" "}
                            {formatRupiah(Number(amountReceived) - order.total)}
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Pastikan pembayaran sebesar {formatRupiah(order.total)}{" "}
                      sudah diterima sebelum mencatatnya.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPaying ? "Mencatat pembayaran..." : "Catat pembayaran"}
                  </button>
                </fieldset>
              </form>
            ) : (
              <p className="mt-4 text-gray-600">
                Order ditandai lunas, tetapi rincian pembayaran tidak tersedia.
              </p>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Riwayat status layanan</h2>

            {order.statusHistories.length === 0 ? (
              <p className="mt-4 text-gray-600">
                Belum ada riwayat status yang tercatat.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {order.statusHistories.map((history) => (
                  <li
                    key={history.id}
                    className="border-l-2 border-blue-200 pl-4"
                  >
                    <p className="font-medium">
                      {history.fromStatus
                        ? serviceStatusLabels[history.fromStatus]
                        : "Order dibuat"}
                      {" → "}
                      {serviceStatusLabels[history.toStatus]}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Oleh {history.changedBy.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {formatDate(history.changedAt)} WIB
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
