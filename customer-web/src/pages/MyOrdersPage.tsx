import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";

type BookingStatus =
  | "HELD"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

interface BookingItem {
  id: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  duration: number;
}

interface Booking {
  id: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
  notes: string | null;
  createdAt: string;
  displayStatus: BookingStatus;
  items: BookingItem[];
  schedule: {
    id: number;
    status: BookingStatus;
    startsAt: string;
    endsAt: string;
    blockedUntil: string;
    holdExpiresAt: string | null;
    kapster: {
      id: number;
      name: string;
    };
  };
}

interface BookingResponse {
  message: string;
  data: Booking[];
}

const bookingStatusLabels: Record<BookingStatus, string> = {
  HELD: "Menunggu pembayaran",
  CONFIRMED: "Booking terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

const bookingFilterOptions = [
  { value: "ALL", label: "Semua" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "HISTORY", label: "Riwayat" },
] as const;

export default function MyOrdersPage() {
  const { user, isInitializing } = useAuth();
  const userId = user?.id;
  const [bookingFilter, setBookingFilter] = useState<
    "ALL" | "ACTIVE" | "HISTORY"
  >("ALL");
  const [refreshKey, setRefreshKey] = useState(0);

  const [bookingsResult, setBookingsResult] = useState<{
    userId: number;
    refreshKey: number;
    bookings: Booking[];
    error: string;
  } | null>(null);

  const currentResult =
    userId !== undefined &&
    bookingsResult?.userId === userId &&
    bookingsResult.refreshKey === refreshKey
      ? bookingsResult
      : null;

  const bookings = currentResult?.bookings ?? [];

  const filteredBookings = bookings.filter((booking) => {
    const isActive =
      booking.displayStatus === "HELD" || booking.displayStatus === "CONFIRMED";

    if (bookingFilter === "ACTIVE") return isActive;
    if (bookingFilter === "HISTORY") return !isActive;

    return true;
  });

  const errorMessage = currentResult?.error ?? "";

  const isLoadingBookings =
    !isInitializing && Boolean(user) && currentResult === null;

  useEffect(() => {
    if (isInitializing || userId === undefined) return;

    let isActive = true;

    async function loadBookings(accountId: number) {
      try {
        const response = await api.get<BookingResponse>("/booking");

        if (!isActive) return;

        setBookingsResult({
          userId: accountId,
          refreshKey,
          bookings: response.data.data,
          error: "",
        });
      } catch (error) {
        if (!isActive) return;

        let message = "Gagal mengambil daftar booking. Silakan muat ulang.";

        if (axios.isAxiosError<{ message?: string }>(error)) {
          message = error.response?.data?.message || message;

          if (error.response?.status === 401) {
            message = "Sesi login sudah berakhir. Silakan login kembali.";
          }
        }

        setBookingsResult({
          userId: accountId,
          refreshKey,
          bookings: [],
          error: message,
        });
      }
    }

    void loadBookings(userId);

    return () => {
      isActive = false;
    };
  }, [userId, isInitializing, refreshKey]);
  if (isInitializing) {
    return (
      <section className="px-5 py-6">
        <p role="status" className="text-sm text-muted">
          Memeriksa sesi...
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="px-5 py-6">
        <h1 className="text-2xl font-bold text-primary">Pesanan saya</h1>

        <div className="mt-5 rounded-2xl border border-soft bg-white p-5">
          <p className="text-sm leading-6 text-muted">
            Masuk terlebih dahulu untuk melihat booking dan riwayat kunjunganmu.
          </p>

          <Link
            to="/login"
            className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
          >
            Masuk ke akun
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 py-6">
      <h1 className="text-2xl font-bold text-primary">Pesanan saya</h1>

      <p className="mt-2 text-sm leading-6 text-muted">
        Pantau booking aktif dan lihat riwayat kunjunganmu.
      </p>

      <button
        type="button"
        onClick={() => setRefreshKey((current) => current + 1)}
        disabled={isLoadingBookings}
        className="mt-4 min-h-11 rounded-xl border border-soft bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-soft/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoadingBookings ? "Memuat..." : "Perbarui pesanan"}
      </button>

      <div
        role="group"
        aria-label="Filter booking"
        className="mt-5 flex flex-wrap gap-2"
      >
        {bookingFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setBookingFilter(option.value)}
            aria-pressed={bookingFilter === option.value}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${
              bookingFilter === option.value
                ? "border-primary bg-primary text-white"
                : "border-soft bg-white text-muted hover:bg-soft/30"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoadingBookings && (
        <p role="status" className="mt-5 text-sm text-muted">
          Memuat booking...
        </p>
      )}

      {!isLoadingBookings && errorMessage && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {!isLoadingBookings && !errorMessage && (
        <div className="mt-5 space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-soft bg-white p-5">
              <p className="text-center text-sm text-muted">
                {bookings.length === 0
                  ? "Kamu belum memiliki booking."
                  : bookingFilter === "ACTIVE"
                    ? "Belum ada booking aktif."
                    : "Belum ada riwayat booking."}
              </p>

              <Link
                to="/services"
                className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
              >
                Pilih layanan
              </Link>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-2xl border border-soft bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-primary">
                    Booking #{booking.id}
                  </h2>

                  <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
                    {bookingStatusLabels[booking.displayStatus]}
                  </span>
                </div>

                <p className="mt-4 text-sm font-semibold text-primary">
                  {new Date(booking.schedule.startsAt).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </p>

                <p className="mt-2 text-sm text-muted">
                  Kapster: {booking.schedule.kapster.name}
                </p>

                <div className="mt-4 border-t border-soft pt-4">
                  {booking.items.map((item) => (
                    <div
                      key={item.id}
                      className="mb-2 flex items-start justify-between gap-4"
                    >
                      <p className="text-sm text-muted">
                        {item.serviceName} × {item.quantity}
                      </p>

                      <p className="shrink-0 text-sm font-semibold text-primary">
                        Rp{" "}
                        {(item.unitPrice * item.quantity).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2 border-t border-soft pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted">Subtotal</p>

                    <p className="text-sm text-primary">
                      Rp {booking.subtotal.toLocaleString("id-ID")}
                    </p>
                  </div>

                  {booking.discountPercent > 0 && (
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted">
                        Diskon membership ({booking.discountPercent}%)
                      </p>

                      <p className="text-sm font-semibold text-green-700">
                        − Rp {booking.discount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <p className="text-sm font-semibold text-primary">
                      Total tagihan
                    </p>

                    <p className="text-lg font-bold text-primary">
                      Rp {booking.total.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {booking.notes?.trim() && (
                  <div className="mt-4 rounded-xl bg-soft/30 p-3">
                    <p className="text-sm font-semibold text-primary">
                      Catatan kamu
                    </p>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                      {booking.notes}
                    </p>
                  </div>
                )}

                {booking.displayStatus === "HELD" &&
                  booking.schedule.holdExpiresAt && (
                    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                      Batas pembayaran:{" "}
                      {new Date(booking.schedule.holdExpiresAt).toLocaleString(
                        "id-ID",
                        {
                          timeZone: "Asia/Jakarta",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}{" "}
                      WIB.
                    </p>
                  )}

                {booking.displayStatus === "EXPIRED" && (
                  <p className="mt-4 text-sm leading-6 text-muted">
                    Batas pembayaran sudah lewat. Silakan buat booking baru
                    dengan memilih jadwal yang tersedia.
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
