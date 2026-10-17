import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import api from "../lib/axios";
import { socket } from "../lib/socket";
import type {
  KapsterScheduleData,
  KapsterScheduleResponse,
} from "../types/kapster-schedule";

interface Props {
  kapsterId: number;
  onClose: () => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusLabels = {
  HELD: "Menunggu pembayaran",
  CONFIRMED: "Terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  NO_SHOW: "Tidak datang",
};

export default function KapsterSchedulePanel({ kapsterId, onClose }: Props) {
  const [date, setDate] = useState(() =>
    new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  const [refreshKey, setRefreshKey] = useState(0);

  const [result, setResult] = useState<{
    key: string;
    data: KapsterScheduleData | null;
    error: string;
  } | null>(null);

  const requestKey = `${kapsterId}|${date}|${refreshKey}`;
  const currentResult = result?.key === requestKey ? result : null;
  const data = currentResult?.data;
  const errorMessage = currentResult?.error ?? "";
  const isLoading = Boolean(date) && currentResult === null;

  useEffect(() => {
    if (!date) return;

    let ignore = false;

    async function loadSchedule() {
      try {
        const response = await api.get<KapsterScheduleResponse>(
          `/kapster/${kapsterId}/schedule`,
          { params: { date } },
        );

        if (ignore) return;

        setResult({
          key: requestKey,
          data: response.data.data,
          error: "",
        });
      } catch (error) {
        if (ignore) return;

        let message = "Gagal mengambil jadwal kapster.";

        if (axios.isAxiosError<{ message?: string }>(error)) {
          message = error.response?.data?.message || message;
        }

        setResult({
          key: requestKey,
          data: null,
          error: message,
        });
      }
    }

    void loadSchedule();

    return () => {
      ignore = true;
    };
  }, [kapsterId, date, requestKey]);

  useEffect(() => {
    function refreshSchedule() {
      setRefreshKey((current) => current + 1);
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refreshSchedule();
      }
    }

    socket.on("availability:changed", refreshSchedule);
    socket.on("booking:changed", refreshSchedule);
    socket.on("orders:changed", refreshSchedule);
    socket.on("connect", refreshSchedule);

    const interval = window.setInterval(refreshWhenVisible, 30_000);

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      socket.off("availability:changed", refreshSchedule);
      socket.off("booking:changed", refreshSchedule);
      socket.off("orders:changed", refreshSchedule);
      socket.off("connect", refreshSchedule);

      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return (
    <section className="mt-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Jadwal kapster{data ? ` — ${data.kapster.name}` : ""}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Waktu ditampilkan dalam WIB, termasuk jeda setelah layanan.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Tutup
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="kapster-schedule-date"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Tanggal jadwal
          </label>

          <input
            id="kapster-schedule-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={isLoading || !date}
          className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Perbarui jadwal
        </button>
      </div>

      {!date && (
        <p className="mt-4 text-sm text-gray-600">
          Pilih tanggal untuk melihat jadwal.
        </p>
      )}

      {isLoading && (
        <p role="status" className="mt-5 text-sm text-gray-600">
          Memuat jadwal...
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {date && data && (
        <div className="mt-5 space-y-4">
          {!data.kapster.isActive && (
            <p className="rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
              Kapster sedang nonaktif.
            </p>
          )}

          {data.unscheduledOrders.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900">
                Ada order aktif tanpa jadwal
              </h3>

              <p className="mt-1 text-sm text-amber-800">
                Order berikut perlu diperiksa karena dapat menghalangi booking.
              </p>

              <ul className="mt-3 space-y-2">
                {data.unscheduledOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/order/${order.id}`}
                      className="text-sm font-semibold text-amber-900 underline"
                    >
                      Order #{order.id} — {order.customer.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.overdueOrders.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-800">
                Layanan melewati perkiraan selesai
              </h3>

              <p className="mt-1 text-sm text-red-700">
                Order berikut masih berstatus sedang dilayani. Daftar ini juga
                dapat mencakup order dari tanggal sebelumnya.
              </p>

              <ul className="mt-3 space-y-2">
                {data.overdueOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/order/${order.id}`}
                      className="text-sm font-semibold text-red-800 underline"
                    >
                      Order #{order.id} — {order.customer.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.schedules.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Belum ada jadwal tercatat pada tanggal ini. Perhatikan peringatan
              order aktif di atas jika tersedia.
            </p>
          ) : (
            data.schedules.map((schedule) => {
              const isReleased =
                schedule.displayStatus === "CANCELLED" ||
                schedule.displayStatus === "EXPIRED" ||
                schedule.displayStatus === "NO_SHOW";

              const label =
                !isReleased && schedule.serviceStatus === "IN_SERVICE"
                  ? "Sedang dilayani"
                  : !isReleased && schedule.serviceStatus === "WAITING"
                    ? "Customer sudah datang — menunggu layanan"
                    : statusLabels[schedule.displayStatus];

              return (
                <article
                  key={schedule.id}
                  className={`rounded-xl border p-4 ${
                    isReleased
                      ? "border-gray-200 bg-gray-50"
                      : schedule.isOverdue
                        ? "border-red-200 bg-red-50"
                        : "border-blue-100 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-gray-900">
                      {formatTime(schedule.startsAt)}–
                      {formatTime(schedule.endsAt)}
                    </h3>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {label}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-gray-800">
                    {schedule.customer.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {schedule.source === "ONLINE"
                      ? `Booking online #${schedule.bookingId ?? "—"}`
                      : "Order langsung"}
                  </p>

                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {schedule.items.map((item, index) => (
                      <li key={`${schedule.id}-${index}`}>
                        {item.serviceName} × {item.quantity}
                      </li>
                    ))}
                  </ul>

                  {schedule.isOverdue && !isReleased ? (
                    <div
                      role="status"
                      className="mt-3 rounded-lg border border-red-200 bg-red-100 p-3"
                    >
                      <p className="text-sm font-semibold text-red-800">
                        Layanan melewati perkiraan selesai
                      </p>

                      <p className="mt-1 text-sm leading-6 text-red-700">
                        Perkiraan selesai pukul {formatTime(schedule.endsAt)}{" "}
                        WIB, tetapi order masih sedang dilayani. Waktu buffer
                        akan diperbarui setelah layanan dinyatakan selesai.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-600">
                      {isReleased
                        ? "Jadwal ini sudah tidak menahan waktu kapster."
                        : `Jeda setelah layanan sampai ${formatTime(schedule.blockedUntil)} WIB.`}
                    </p>
                  )}

                  {schedule.displayStatus === "HELD" &&
                    schedule.holdExpiresAt && (
                      <p className="mt-2 text-sm text-amber-800">
                        Batas pembayaran:{" "}
                        {new Date(schedule.holdExpiresAt).toLocaleString(
                          "id-ID",
                          { timeZone: "Asia/Jakarta" },
                        )}{" "}
                        WIB.
                      </p>
                    )}

                  {schedule.orderId !== null && (
                    <Link
                      to={`/order/${schedule.orderId}`}
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline"
                    >
                      Lihat order #{schedule.orderId}
                    </Link>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
