import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type BookingStatus =
  | "HELD"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

type BookingFilter = "ALL" | BookingStatus;

const bookingFilterOptions: {
  value: BookingFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Semua" },
  { value: "HELD", label: "Menunggu pembayaran" },
  { value: "CONFIRMED", label: "Terkonfirmasi" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
];

type BookingPaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "REVIEW";

interface BookingPayment {
  id: number;
  amount: number;
  status: BookingPaymentStatus;
  paymentType: string | null;
  paidAt: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  reviews: {
    id: number;
    reason: string;
    previousReason: string | null;
    createdAt: string;
    reviewedBy: {
      id: number;
      name: string;
    };
  }[];
}

interface Booking {
  id: number;
  total: number;
  displayStatus: BookingStatus;
  payments: BookingPayment[];
  notes: string | null;
  subtotal: number;
  discountPercent: number;
  discount: number;
  items: {
    id: number;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    duration: number;
  }[];
  schedule: {
    startsAt: string;
    endsAt: string;
    orderId: number | null;
    customer: {
      id: number;
      name: string;
      phone: string | null;
    };
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

interface CheckInResponse {
  message: string;
  data: {
    id: number;
    schedule: {
      id: number;
      orderId: number | null;
    };
  };
}

interface CheckPaymentResponse {
  message: string;
  data: {
    paymentId: number;
    status: BookingPaymentStatus;
    needsReview: boolean;
  };
}

const bookingStatusLabels: Record<BookingStatus, string> = {
  HELD: "Menunggu pembayaran",
  CONFIRMED: "Terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

const paymentStatusLabels: Record<BookingPaymentStatus, string> = {
  CREATED: "Transaksi disiapkan",
  PENDING: "Menunggu pembayaran",
  PAID: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
  REFUNDED: "Dana dikembalikan",
  PARTIALLY_REFUNDED: "Dana dikembalikan sebagian",
  REVIEW: "Perlu pemeriksaan",
};

const bookingStatusClasses: Record<BookingStatus, string> = {
  HELD: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-600",
};

export default function BookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [checkInError, setCheckInError] = useState("");
  const [checkInSuccess, setCheckInSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("ALL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkingPaymentId, setCheckingPaymentId] = useState<number | null>(
    null,
  );
  const [paymentCheckError, setPaymentCheckError] = useState("");
  const [paymentCheckSuccess, setPaymentCheckSuccess] = useState("");

  const { user } = useAuth();

  const [reviewingPaymentId, setReviewingPaymentId] = useState<number | null>(
    null,
  );
  const [reviewReason, setReviewReason] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadBookings() {
      try {
        const response = await api.get<BookingResponse>("/booking/all");

        if (!isActive) return;

        setBookings(response.data.data);
        setErrorMessage("");
      } catch (error) {
        if (!isActive) return;

        let message = "Gagal mengambil daftar booking.";

        if (axios.isAxiosError<{ message?: string }>(error)) {
          message = error.response?.data?.message || message;
        }

        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadBookings();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  async function handleCheckIn(bookingId: number) {
    if (checkingInId !== null || checkingPaymentId !== null || isLoading) {
      return;
    }

    setCheckingInId(bookingId);
    setCheckInError("");
    setCheckInSuccess("");

    try {
      const response = await api.post<CheckInResponse>(
        `/booking/${bookingId}/check-in`,
      );

      const order = response.data.data;

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                schedule: {
                  ...booking.schedule,
                  orderId: order.id,
                },
              }
            : booking,
        ),
      );

      setCheckInSuccess(
        `Kedatangan untuk booking #${bookingId} berhasil dicatat. Order #${order.id} sudah dibuat.`,
      );
    } catch (error) {
      let message = "Kedatangan belum berhasil dicatat. Silakan coba kembali.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response) {
          message = error.response.data.message || message;
        } else {
          message =
            "Respons server belum diterima. Muat ulang daftar booking untuk memastikan apakah kedatangan sudah tercatat sebelum mencoba kembali.";
        }
      }

      setCheckInError(message);
    } finally {
      setCheckingInId(null);
    }
  }

  const keyword = search.trim().toLowerCase();

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.schedule.customer.name
      .toLowerCase()
      .includes(keyword);

    const matchesStatus =
      bookingFilter === "ALL" || booking.displayStatus === bookingFilter;

    return matchesSearch && matchesStatus;
  });

  function handleRefreshBookings() {
    if (isLoading || checkingInId !== null || checkingPaymentId !== null) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setCheckInError("");
    setCheckInSuccess("");
    setRefreshKey((current) => current + 1);
  }

  async function handleCheckPayment(paymentId: number) {
    if (checkingPaymentId !== null || checkingInId !== null || isLoading) {
      return;
    }

    setCheckingPaymentId(paymentId);
    setPaymentCheckError("");
    setPaymentCheckSuccess("");

    try {
      const response = await api.post<CheckPaymentResponse>(
        `/booking/payments/${paymentId}/check`,
      );

      setPaymentCheckSuccess(response.data.message);

      // Ambil ulang pembayaran dan status booking setelah sinkronisasi.
      setIsLoading(true);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      let message =
        "Pembayaran belum berhasil diperiksa. Silakan coba kembali.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message =
          error.response?.data?.message ||
          (error.response
            ? message
            : "Respons server belum diterima. Perbarui daftar booking untuk melihat kondisi terbaru.");
      }

      setPaymentCheckError(message);
    } finally {
      setCheckingPaymentId(null);
    }
  }

  async function handleConfirmReview() {
    if (
      user?.role !== "ADMIN" ||
      reviewingPaymentId === null ||
      isSubmittingReview ||
      isLoading ||
      checkingInId !== null ||
      checkingPaymentId !== null
    ) {
      return;
    }

    setReviewError("");
    setReviewSuccess("");

    const reason = reviewReason.trim();

    if (reason.length < 10 || reason.length > 500) {
      setReviewError("Alasan pemeriksaan harus berisi 10–500 karakter.");
      return;
    }

    setIsSubmittingReview(true);

    try {
      const response = await api.post<{ message: string }>(
        `/booking/payments/${reviewingPaymentId}/confirm-review`,
        { reason },
      );

      setReviewSuccess(response.data.message);
      setReviewingPaymentId(null);
      setReviewReason("");

      // Ambil kembali status booking dan pembayaran dari backend.
      setIsLoading(true);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      let message = "Persetujuan belum berhasil. Silakan coba kembali.";

      if (
        axios.isAxiosError<{
          message?: string;
          errors?: { field: string; message: string }[];
        }>(error)
      ) {
        if (error.response) {
          message =
            error.response.data.errors
              ?.map((issue) => issue.message)
              .join(" ") ||
            error.response.data.message ||
            message;
        } else {
          message =
            "Respons server belum diterima. Perbarui daftar booking untuk memastikan hasil persetujuan sebelum mencoba kembali.";
        }
      }

      setReviewError(message);
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-900">Booking customer</h1>

      <p className="mt-2 text-sm text-gray-600">
        Pantau jadwal booking dan catat kedatangan customer.
      </p>

      <button
        type="button"
        onClick={handleRefreshBookings}
        disabled={
          isLoading ||
          checkingInId !== null ||
          checkingPaymentId !== null ||
          isSubmittingReview
        }
        className="mt-4 min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Memuat..." : "Perbarui booking"}
      </button>

      <div className="mt-5">
        <label
          htmlFor="booking-search"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Cari customer
        </label>

        <input
          id="booking-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama customer..."
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div
        role="group"
        aria-label="Filter status booking"
        className="mt-4 flex flex-wrap gap-2"
      >
        {bookingFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setBookingFilter(option.value)}
            aria-pressed={bookingFilter === option.value}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${
              bookingFilter === option.value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {checkInError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {checkInError}
        </p>
      )}

      {checkInSuccess && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {checkInSuccess}
        </p>
      )}

      {paymentCheckError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {paymentCheckError}
        </p>
      )}

      {paymentCheckSuccess && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
        >
          {paymentCheckSuccess}
        </p>
      )}

      {isLoading && (
        <p role="status" className="mt-6 text-sm text-gray-600">
          Memuat booking...
        </p>
      )}

      {!isLoading && errorMessage && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {reviewError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {reviewError}
        </p>
      )}

      {reviewSuccess && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700"
        >
          {reviewSuccess}
        </p>
      )}

      {!isLoading && !errorMessage && (
        <div className="mt-6">
          <p className="mb-4 text-sm text-gray-600">
            {filteredBookings.length} booking ditampilkan dari {bookings.length}{" "}
            booking.
          </p>

          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-center text-sm text-gray-500">
                {keyword || bookingFilter !== "ALL"
                  ? "Tidak ada booking yang sesuai pencarian atau filter."
                  : "Belum ada booking customer."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-bold text-gray-900">
                      Booking #{booking.id}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        bookingStatusClasses[booking.displayStatus]
                      }`}
                    >
                      {bookingStatusLabels[booking.displayStatus]}
                    </span>
                  </div>

                  <p className="mt-4 break-words text-lg font-semibold text-gray-900">
                    {booking.schedule.customer.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {booking.schedule.customer.phone ||
                      "Nomor telepon belum diisi"}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-700">
                      Kapster: {booking.schedule.kapster.name}
                    </p>

                    <p className="text-sm text-gray-700">
                      Jadwal:{" "}
                      {new Date(booking.schedule.startsAt).toLocaleString(
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
                      WIB
                    </p>

                    <p className="text-sm text-gray-500">
                      Perkiraan selesai:{" "}
                      {new Date(booking.schedule.endsAt).toLocaleTimeString(
                        "id-ID",
                        {
                          timeZone: "Asia/Jakarta",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}{" "}
                      WIB
                    </p>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Layanan yang dipesan
                    </h3>

                    <div className="mt-3 space-y-3">
                      {booking.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm text-gray-700">
                              {item.serviceName} × {item.quantity}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {item.duration} menit per layanan
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-semibold text-gray-900">
                            Rp{" "}
                            {(item.unitPrice * item.quantity).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {booking.notes?.trim() && (
                    <div className="mt-4 rounded-xl bg-gray-50 p-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Catatan customer
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                        {booking.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-600">Subtotal</p>

                      <p className="text-sm text-gray-900">
                        Rp {booking.subtotal.toLocaleString("id-ID")}
                      </p>
                    </div>

                    {booking.discountPercent > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-gray-600">
                          Diskon membership ({booking.discountPercent}%)
                        </p>

                        <p className="text-sm font-semibold text-green-700">
                          − Rp {booking.discount.toLocaleString("id-ID")}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-2">
                      <p className="font-semibold text-gray-900">
                        Total tagihan
                      </p>

                      <p className="text-lg font-bold text-blue-600">
                        Rp {booking.total.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Pembayaran
                    </h3>

                    {booking.payments.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Belum ada transaksi pembayaran.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {booking.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-xl bg-gray-50 p-3"
                          >
                            <p
                              className={`text-sm font-semibold ${
                                payment.needsReview
                                  ? "text-amber-800"
                                  : payment.status === "PAID"
                                    ? "text-green-700"
                                    : "text-gray-700"
                              }`}
                            >
                              {paymentStatusLabels[payment.status]}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              Nominal: Rp{" "}
                              {payment.amount.toLocaleString("id-ID")}
                            </p>
                            Metode:{" "}
                            {payment.paymentType === "bank_transfer"
                              ? "Virtual Account (Midtrans)"
                              : payment.paymentType || "Belum tersedia"}
                            {payment.paidAt && (
                              <p className="mt-2 text-xs text-gray-500">
                                Pembayaran tercatat:{" "}
                                {new Date(payment.paidAt).toLocaleString(
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
                                WIB
                              </p>
                            )}
                            {payment.needsReview && (
                              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                Perlu pemeriksaan:{" "}
                                {payment.reviewReason ||
                                  "Hubungi pengelola untuk memeriksa pembayaran ini."}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                void handleCheckPayment(payment.id)
                              }
                              disabled={
                                isLoading ||
                                checkingInId !== null ||
                                checkingPaymentId !== null ||
                                isSubmittingReview
                              }
                              className="mt-3 min-h-11 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {checkingPaymentId === payment.id
                                ? "Memeriksa pembayaran..."
                                : "Periksa pembayaran"}
                            </button>
                            {user?.role === "ADMIN" &&
                              payment.status === "PAID" &&
                              payment.needsReview && (
                                <div className="mt-4 border-t border-gray-200 pt-4">
                                  {reviewingPaymentId === payment.id ? (
                                    <form
                                      onSubmit={(event) => {
                                        event.preventDefault();
                                        void handleConfirmReview();
                                      }}
                                    >
                                      <label
                                        htmlFor={`review-reason-${payment.id}`}
                                        className="mb-2 block text-sm font-semibold text-gray-700"
                                      >
                                        Alasan persetujuan
                                      </label>

                                      <textarea
                                        id={`review-reason-${payment.id}`}
                                        value={reviewReason}
                                        onChange={(event) =>
                                          setReviewReason(event.target.value)
                                        }
                                        disabled={isSubmittingReview}
                                        minLength={10}
                                        maxLength={500}
                                        rows={3}
                                        required
                                        placeholder="Jelaskan hasil pemeriksaan pembayaran..."
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                                      />

                                      <p className="mt-2 text-xs text-gray-500">
                                        Isi 10–500 karakter. Backend akan
                                        memeriksa kembali pembayaran dan
                                        ketersediaan jadwal sebelum
                                        mengonfirmasi booking.
                                      </p>

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="submit"
                                          disabled={
                                            isSubmittingReview ||
                                            isLoading ||
                                            checkingInId !== null ||
                                            checkingPaymentId !== null
                                          }
                                          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {isSubmittingReview
                                            ? "Menyetujui..."
                                            : "Setujui dan konfirmasi booking"}
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isSubmittingReview}
                                          onClick={() => {
                                            setReviewingPaymentId(null);
                                            setReviewReason("");
                                            setReviewError("");
                                          }}
                                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                          Tutup
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={
                                        isSubmittingReview ||
                                        isLoading ||
                                        checkingInId !== null ||
                                        checkingPaymentId !== null
                                      }
                                      onClick={() => {
                                        setReviewingPaymentId(payment.id);
                                        setReviewReason("");
                                        setReviewError("");
                                        setReviewSuccess("");
                                      }}
                                      className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-50"
                                    >
                                      Tinjau persetujuan
                                    </button>
                                  )}
                                </div>
                              )}
                            {payment.reviews.length > 0 && (
                              <div className="mt-4 border-t border-gray-200 pt-4">
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Riwayat pemeriksaan pembayaran
                                </h3>

                                <div className="mt-3 space-y-3">
                                  {payment.reviews.map((review) => (
                                    <div
                                      key={review.id}
                                      className="rounded-xl bg-gray-50 p-3"
                                    >
                                      <p className="text-sm font-semibold text-gray-900">
                                        Disetujui oleh {review.reviewedBy.name}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-500">
                                        {new Date(
                                          review.createdAt,
                                        ).toLocaleString("id-ID", {
                                          timeZone: "Asia/Jakarta",
                                          day: "numeric",
                                          month: "long",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}{" "}
                                        WIB
                                      </p>

                                      <p className="mt-3 text-xs font-semibold text-gray-500">
                                        Alasan persetujuan
                                      </p>

                                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                                        {review.reason}
                                      </p>

                                      {review.previousReason && (
                                        <>
                                          <p className="mt-3 text-xs font-semibold text-gray-500">
                                            Kondisi sebelum persetujuan
                                          </p>

                                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                                            {review.previousReason}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {booking.schedule.orderId !== null ? (
                    <div className="mt-4 rounded-xl bg-blue-50 p-4">
                      <p className="text-sm text-blue-700">
                        Kedatangan sudah dicatat · Order #
                        {booking.schedule.orderId}
                      </p>

                      <Link
                        to={`/order/${booking.schedule.orderId}`}
                        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Lihat order
                      </Link>
                    </div>
                  ) : booking.displayStatus === "CONFIRMED" ? (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        Kedatangan customer belum dicatat.
                      </p>

                      {booking.payments.some(
                        (payment) => payment.needsReview,
                      ) ||
                      booking.payments.filter(
                        (payment) => payment.status === "PAID",
                      ).length !== 1 ? (
                        <p className="mt-3 text-sm text-amber-800">
                          Periksa pembayaran sebelum mencatat kedatangan.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Catat kedatangan ${booking.schedule.customer.name} untuk booking #${booking.id}?`,
                            );

                            if (confirmed) {
                              void handleCheckIn(booking.id);
                            }
                          }}
                          disabled={
                            isLoading ||
                            checkingInId !== null ||
                            checkingPaymentId !== null ||
                            isSubmittingReview
                          }
                          className="mt-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {checkingInId === booking.id
                            ? "Mencatat kedatangan..."
                            : "Customer datang"}
                        </button>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
