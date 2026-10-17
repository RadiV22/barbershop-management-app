import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";
import { socket } from "../lib/socket";

type BookingStatus =
  | "HELD"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "NO_SHOW";

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

interface CreateBookingPaymentResponse {
  message: string;
  data: {
    bookingId: number;
    merchantOrderId: string;
    amount: number;
    snapToken: string;
    redirectUrl: string;
    expiresAt: string;
  };
}

const bookingStatusLabels: Record<BookingStatus, string> = {
  HELD: "Menunggu pembayaran",
  CONFIRMED: "Booking terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  NO_SHOW: "Tidak datang",
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
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);
  const [paymentError, setPaymentError] = useState("");

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

  useEffect(() => {
    if (isInitializing || userId === undefined) return;

    function handleBookingChanged() {
      setRefreshKey((current) => current + 1);
    }

    function handleConnect() {
      // Ambil data terbaru saat koneksi pertama berhasil
      // maupun setelah tersambung kembali.
      setRefreshKey((current) => current + 1);
    }

    socket.on("booking:changed", handleBookingChanged);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("booking:changed", handleBookingChanged);
      socket.off("connect", handleConnect);
    };
  }, [userId, isInitializing]);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;

      setPayingBookingId(null);
      setPaymentError("");
      setRefreshKey((current) => current + 1);
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  async function handlePayBooking(bookingId: number) {
    if (payingBookingId !== null) return;

    setPaymentError("");
    setPayingBookingId(bookingId);

    try {
      const response = await api.post<CreateBookingPaymentResponse>(
        `/booking/${bookingId}/payment`,
      );

      window.location.assign(response.data.data.redirectUrl);
    } catch (error) {
      let message =
        "Pembayaran belum berhasil disiapkan. Silakan coba kembali.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response) {
          message = error.response.data.message || message;

          if (error.response.status === 401) {
            message = "Sesi login sudah berakhir. Silakan login kembali.";
          }
        } else {
          message =
            "Respons server belum diterima. Perbarui pesanan sebelum mencoba kembali.";
        }
      }

      setPaymentError(message);
      setPayingBookingId(null);
    }
  }

  useEffect(() => {
    if (isInitializing || userId === undefined) return;

    function refreshBookings() {
      if (document.visibilityState !== "visible") return;

      setRefreshKey((current) => current + 1);
    }

    const intervalId = window.setInterval(refreshBookings, 30_000);

    document.addEventListener("visibilitychange", refreshBookings);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshBookings);
    };
  }, [userId, isInitializing]);

  if (isInitializing) {
    return (
      <section className="px-5 py-6 sm:px-8 sm:py-8">
        <p
          role="status"
          className="rounded-2xl border border-soft bg-white p-5 text-sm text-muted"
        >
          Memeriksa sesi...
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="px-5 py-6 sm:px-8 sm:py-8">
        <header className="rounded-[2rem] bg-peach-light p-6 sm:p-8">
          <p className="text-xs font-bold tracking-[0.16em] text-primary">
            KUNJUNGANMU
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary">
            Pesanan saya
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted">
            Semua rencana perawatanmu dalam satu tempat.
          </p>
        </header>

        <div className="mt-6 rounded-3xl border border-soft bg-white p-6">
          <h2 className="text-lg font-bold text-primary">
            Masuk untuk melihat pesanan
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted">
            Lihat booking, lanjutkan pembayaran, dan pantau riwayat kunjunganmu
            melalui akun customer.
          </p>

          <Link
            to="/login"
            className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Masuk ke akun
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 py-6 sm:px-8 sm:py-8">
      <header className="rounded-[2rem] bg-peach-light p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-primary">
          KUNJUNGANMU
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary">
          Pesanan saya
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
          Pantau booking aktif, lanjutkan pembayaran, dan lihat riwayat
          kunjunganmu.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">Daftar booking</h2>

        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={isLoadingBookings}
          className="min-h-11 rounded-full border border-soft bg-white px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-peach-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingBookings ? "Memuat..." : "Perbarui pesanan"}
        </button>
      </div>

      {paymentError && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {paymentError}
        </p>
      )}

      <div
        role="group"
        aria-label="Filter booking"
        className="mt-4 flex flex-wrap gap-2"
      >
        {bookingFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setBookingFilter(option.value)}
            aria-pressed={bookingFilter === option.value}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              bookingFilter === option.value
                ? "border-primary bg-primary text-white"
                : "border-soft bg-white text-muted hover:bg-peach-light"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoadingBookings && (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-soft bg-white p-5 text-sm text-muted"
        >
          Memuat booking...
        </p>
      )}

      {!isLoadingBookings && errorMessage && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {!isLoadingBookings && !errorMessage && (
        <div className="mt-5 space-y-5">
          {filteredBookings.length === 0 ? (
            <div className="rounded-3xl border border-soft bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-primary">
                {bookings.length === 0
                  ? "Belum ada kunjungan"
                  : "Belum ada booking pada kategori ini"}
              </h3>

              <p className="mt-3 text-sm leading-6 text-muted">
                {bookings.length === 0
                  ? "Pilih perawatan favoritmu untuk membuat booking pertama."
                  : bookingFilter === "ACTIVE"
                    ? "Belum ada booking aktif."
                    : "Belum ada riwayat booking."}
              </p>

              <Link
                to="/services"
                className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Pilih layanan
              </Link>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="overflow-hidden rounded-3xl border border-soft bg-white"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-primary">
                      Booking #{booking.id}
                    </h3>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        booking.displayStatus === "CONFIRMED"
                          ? "border-green-200 bg-green-50 text-green-800"
                          : booking.displayStatus === "HELD"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : booking.displayStatus === "COMPLETED"
                              ? "border-teal-200 bg-teal-50 text-teal-800"
                              : "border-gray-200 bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bookingStatusLabels[booking.displayStatus]}
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl bg-sage-light p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted">
                      JADWAL KUNJUNGAN
                    </p>

                    <p className="mt-2 text-base font-bold leading-6 text-primary">
                      {new Date(booking.schedule.startsAt).toLocaleDateString(
                        "id-ID",
                        {
                          timeZone: "Asia/Jakarta",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-primary">
                      Pukul{" "}
                      {new Date(booking.schedule.startsAt).toLocaleTimeString(
                        "id-ID",
                        {
                          timeZone: "Asia/Jakarta",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        },
                      )}{" "}
                      WIB
                    </p>

                    <p className="mt-3 break-words border-t border-accent/25 pt-3 text-sm text-muted">
                      Kapster:{" "}
                      <span className="font-semibold text-primary">
                        {booking.schedule.kapster.name}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5">
                    <h4 className="text-sm font-semibold text-primary">
                      Layanan yang dipesan
                    </h4>

                    <ul className="mt-3 space-y-3">
                      {booking.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4"
                        >
                          <p className="min-w-0 break-words text-sm leading-6 text-muted">
                            {item.serviceName} × {item.quantity}
                          </p>

                          <p className="shrink-0 text-sm font-semibold leading-6 text-primary">
                            Rp{" "}
                            {(item.unitPrice * item.quantity).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 rounded-2xl bg-peach-light p-4">
                    <dl className="space-y-3">
                      <div className="flex justify-between gap-4 text-sm">
                        <dt className="text-muted">Subtotal</dt>
                        <dd className="shrink-0 text-primary">
                          Rp {booking.subtotal.toLocaleString("id-ID")}
                        </dd>
                      </div>

                      {booking.discountPercent > 0 && (
                        <div className="flex items-start justify-between gap-4 text-sm">
                          <dt className="text-muted">
                            Diskon membership ({booking.discountPercent}%)
                          </dt>

                          <dd className="shrink-0 font-semibold text-green-800">
                            − Rp {booking.discount.toLocaleString("id-ID")}
                          </dd>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary/20 pt-3">
                        <dt className="text-sm font-semibold text-primary">
                          Total tagihan
                        </dt>

                        <dd className="text-xl font-bold text-primary">
                          Rp {booking.total.toLocaleString("id-ID")}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {booking.notes?.trim() && (
                    <div className="mt-4 rounded-2xl border border-soft p-4">
                      <h4 className="text-sm font-semibold text-primary">
                        Catatan kamu
                      </h4>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                        {booking.notes}
                      </p>
                    </div>
                  )}

                  {booking.displayStatus === "HELD" &&
                    booking.schedule.holdExpiresAt && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <p className="text-sm font-semibold">
                          Selesaikan pembayaran sebelum
                        </p>

                        <p className="mt-1 text-sm leading-6">
                          {new Date(
                            booking.schedule.holdExpiresAt,
                          ).toLocaleString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}{" "}
                          WIB
                        </p>
                      </div>
                    )}

                  {booking.displayStatus === "HELD" && (
                    <button
                      type="button"
                      onClick={() => void handlePayBooking(booking.id)}
                      disabled={payingBookingId !== null}
                      className="mt-4 min-h-12 w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {payingBookingId === booking.id
                        ? "Menyiapkan pembayaran..."
                        : "Bayar sekarang"}
                    </button>
                  )}

                  {booking.displayStatus === "EXPIRED" && (
                    <p className="mt-4 rounded-2xl bg-background p-4 text-sm leading-6 text-muted">
                      Batas pembayaran sudah lewat. Silakan buat booking baru
                      dengan memilih jadwal yang tersedia.
                    </p>
                  )}
                </div>

                {booking.displayStatus === "NO_SHOW" && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                    Kunjungan ini ditandai tidak datang oleh pengelola.
                    Penandaan ini tidak otomatis mengembalikan pembayaran.
                    Hubungi barbershop jika membutuhkan bantuan.
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
