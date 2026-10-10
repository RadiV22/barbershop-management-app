import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface ServiceResponse {
  message: string;
  data: Service[];
}

interface Kapster {
  id: number;
  name: string;
}

interface KapsterResponse {
  message: string;
  data: Kapster[];
}

interface AvailableSlot {
  time: string;
  startsAt: string;
  endsAt: string;
  blockedUntil: string;
}

interface AvailabilityResponse {
  message: string;
  data: {
    date: string;
    timezone: string;
    kapster: {
      id: number;
      name: string;
    };
    totalDuration: number;
    bufferMinutes: number;
    slots: AvailableSlot[];
  };
}

interface CreateBookingResponse {
  message: string;
  data: {
    id: number;
    subtotal: number;
    discountPercent: number;
    discount: number;
    total: number;
    schedule: {
      startsAt: string;
      holdExpiresAt: string | null;
    };
  };
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const serviceIdsParam = searchParams.get("services") ?? "";
  const { user, isInitializing } = useAuth();
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [selectedKapsterId, setSelectedKapsterId] = useState("");
  const [isLoadingKapsters, setIsLoadingKapsters] = useState(true);
  const [kapsterError, setKapsterError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartsAt, setSelectedStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [createdBooking, setCreatedBooking] = useState<
    CreateBookingResponse["data"] | null
  >(null);

  const [slotsResult, setSlotsResult] = useState<{
    key: string;
    slots: AvailableSlot[];
    error: string;
  } | null>(null);

  const [servicesResult, setServicesResult] = useState<{
    key: string;
    services: Service[];
    error: string;
  } | null>(null);

  const serviceIdParts = serviceIdsParam.split(",");

  const invalidServiceIds =
    !serviceIdsParam ||
    serviceIdParts.some(
      (part) =>
        !/^[1-9]\d*$/.test(part) ||
        !Number.isSafeInteger(Number(part)) ||
        Number(part) > 2147483647,
    );

  const currentServicesResult =
    servicesResult?.key === serviceIdsParam ? servicesResult : null;

  const selectedServices = invalidServiceIds
    ? []
    : (currentServicesResult?.services ?? []);

  const errorMessage = invalidServiceIds
    ? "Pilihan layanan tidak valid. Silakan pilih kembali dari halaman Layanan."
    : (currentServicesResult?.error ?? "");

  const isLoading = !invalidServiceIds && currentServicesResult === null;

  const canLoadSlots =
    !isInitializing &&
    Boolean(user) &&
    !isLoading &&
    !errorMessage &&
    selectedServices.length > 0 &&
    Boolean(selectedKapsterId) &&
    Boolean(selectedDate);

  const slotsKey = canLoadSlots
    ? `${selectedKapsterId}|${selectedDate}|${serviceIdsParam}`
    : "";

  const currentSlotsResult =
    slotsKey && slotsResult?.key === slotsKey ? slotsResult : null;

  const [showAllSlots, setShowAllSlots] = useState(false);
  const availableSlots = currentSlotsResult?.slots ?? [];
  const recommendedSlot = availableSlots[0];
  const slotsError = currentSlotsResult?.error ?? "";

  const isLoadingSlots = Boolean(slotsKey) && currentSlotsResult === null;

  useEffect(() => {
    if (invalidServiceIds) return;

    let isActive = true;

    async function loadSelectedServices() {
      try {
        const selectedIds = [
          ...new Set(serviceIdsParam.split(",").map(Number)),
        ];

        const response = await api.get<ServiceResponse>("/public/services");

        if (!isActive) return;

        const services = response.data.data.filter((service) =>
          selectedIds.includes(service.id),
        );

        if (services.length !== selectedIds.length) {
          setServicesResult({
            key: serviceIdsParam,
            services: [],
            error:
              "Ada layanan yang sudah tidak tersedia. Silakan pilih kembali dari halaman Layanan.",
          });
          return;
        }

        setServicesResult({
          key: serviceIdsParam,
          services,
          error: "",
        });
      } catch {
        if (isActive) {
          setServicesResult({
            key: serviceIdsParam,
            services: [],
            error: "Gagal mengambil layanan. Silakan muat ulang halaman.",
          });
        }
      }
    }

    void loadSelectedServices();

    return () => {
      isActive = false;
    };
  }, [serviceIdsParam, invalidServiceIds]);

  const subtotal = selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );

  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );

  useEffect(() => {
    let isActive = true;

    async function loadKapsters() {
      try {
        const response = await api.get<KapsterResponse>("/public/kapster");

        if (isActive) {
          setKapsters(response.data.data);
          setKapsterError("");
        }
      } catch {
        if (isActive) {
          setKapsterError(
            "Gagal mengambil daftar kapster. Silakan muat ulang halaman.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingKapsters(false);
        }
      }
    }

    void loadKapsters();

    return () => {
      isActive = false;
    };
  }, []);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const todayWib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const maxBookingDate = new Date(
    new Date(`${todayWib}T00:00:00.000Z`).getTime() + 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  useEffect(() => {
    if (!slotsKey) return;

    let isActive = true;

    async function loadAvailability() {
      try {
        const response = await api.get<AvailabilityResponse>(
          "/public/availability",
          {
            params: {
              date: selectedDate,
              kapsterId: selectedKapsterId,
              serviceIds: serviceIdsParam,
            },
          },
        );

        if (isActive) {
          setSlotsResult({
            key: slotsKey,
            slots: response.data.data.slots,
            error: "",
          });
        }
      } catch (error) {
        if (!isActive) return;

        let message = "Gagal mengambil jadwal. Silakan coba kembali.";

        if (
          axios.isAxiosError<{
            message?: string;
            errors?: { field: string; message: string }[];
          }>(error)
        ) {
          const data = error.response?.data;

          message =
            data?.errors?.map((issue) => issue.message).join(" ") ||
            data?.message ||
            message;
        }

        setSlotsResult({
          key: slotsKey,
          slots: [],
          error: message,
        });
      }
    }

    void loadAvailability();

    return () => {
      isActive = false;
    };
  }, [slotsKey, selectedDate, selectedKapsterId, serviceIdsParam]);

  const selectedSlot = availableSlots.find(
    (slot) => slot.startsAt === selectedStartsAt,
  );

  const selectedKapster = kapsters.find(
    (kapster) => kapster.id === Number(selectedKapsterId),
  );

  async function handleCreateBooking() {
    if (isSubmitting || createdBooking) return;

    setBookingError("");

    if (
      isInitializing ||
      !user ||
      !canLoadSlots ||
      isLoadingSlots ||
      slotsError ||
      !selectedSlot ||
      !selectedKapster
    ) {
      setBookingError("Lengkapi pilihan layanan, kapster, dan jadwal dahulu.");
      return;
    }
    if (new Date(selectedSlot.startsAt).getTime() <= now.getTime()) {
      setBookingError("Jam yang dipilih sudah terlewati. Pilih jadwal lain.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post<CreateBookingResponse>("/booking", {
        kapsterId: selectedKapster.id,
        serviceIds: selectedServices.map((service) => service.id),
        date: selectedDate,
        time: selectedSlot.time,
        notes: notes.trim(),
      });

      setCreatedBooking(response.data.data);
    } catch (error) {
      let message = "Booking belum berhasil dibuat. Silakan coba kembali.";

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

          if (error.response.status === 401) {
            message = "Sesi login sudah berakhir. Silakan login kembali.";
          }
        } else {
          message =
            "Respons server belum diterima. Booking mungkin sudah tersimpan. Periksa daftar booking sebelum mencoba kembali.";
        }
      }

      setBookingError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="px-5 py-6">
      <Link to="/services" className="text-sm font-semibold text-primary">
        ← Kembali ke layanan
      </Link>

      <h1 className="mt-5 text-2xl font-bold text-primary">Booking</h1>

      <p className="mt-2 text-sm leading-6 text-muted">
        Periksa layanan pilihanmu sebelum menentukan kapster dan jadwal.
      </p>

      {isLoading && (
        <p role="status" className="mt-6 text-sm text-muted">
          Memuat layanan pilihan...
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

      {!isLoading && !errorMessage && selectedServices.length > 0 && (
        <div className="mt-6 rounded-2xl border border-soft bg-white p-5">
          <h2 className="text-lg font-bold text-primary">Layanan pilihanmu</h2>

          <ul className="mt-4 divide-y divide-soft">
            {selectedServices.map((service) => (
              <li key={service.id} className="py-3 first:pt-0">
                <p className="font-semibold text-primary">{service.name}</p>

                <div className="mt-2 flex justify-between gap-4 text-sm text-muted">
                  <span>{service.duration} menit</span>
                  <span>Rp {service.price.toLocaleString("id-ID")}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-3 border-t border-soft pt-4">
            <div className="flex justify-between gap-4 text-sm text-muted">
              <span>Jumlah layanan</span>
              <span>{selectedServices.length} layanan</span>
            </div>

            <div className="flex justify-between gap-4 text-sm text-muted">
              <span>Total durasi</span>
              <span>{totalDuration} menit</span>
            </div>

            <div className="flex justify-between gap-4 font-bold text-primary">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            Belum termasuk potongan membership. Total akhir akan dihitung oleh
            sistem saat booking dibuat.
          </p>

          {isInitializing ? (
            <p role="status" className="mt-5 text-sm text-muted">
              Memeriksa sesi...
            </p>
          ) : !user ? (
            <div className="mt-5 border-t border-soft pt-4">
              <p className="text-sm text-muted">
                Silakan masuk untuk melanjutkan booking.
              </p>

              <Link
                to={`/login?services=${encodeURIComponent(serviceIdsParam)}`}
                className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
              >
                Masuk untuk melanjutkan
              </Link>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">
              Booking atas nama{" "}
              <span className="font-semibold text-primary">{user.name}</span>.
            </p>
          )}
        </div>
      )}

      {!isInitializing &&
        user &&
        !isLoading &&
        !errorMessage &&
        selectedServices.length > 0 && (
          <div className="mt-6 rounded-2xl border border-soft bg-white p-5">
            <h2 className="text-lg font-bold text-primary">Pilih kapster</h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              Pilih kapster yang kamu inginkan untuk kunjungan ini.
            </p>

            {isLoadingKapsters && (
              <p role="status" className="mt-4 text-sm text-muted">
                Memuat kapster...
              </p>
            )}

            {!isLoadingKapsters && kapsterError && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {kapsterError}
              </p>
            )}

            {!isLoadingKapsters &&
              !kapsterError &&
              (kapsters.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Belum ada kapster aktif yang dapat dipilih.
                </p>
              ) : (
                <div className="mt-4">
                  <label
                    htmlFor="kapster"
                    className="mb-2 block text-sm font-semibold text-muted"
                  >
                    Kapster
                  </label>

                  <select
                    id="kapster"
                    value={selectedKapsterId}
                    disabled={isSubmitting || createdBooking !== null}
                    onChange={(event) => {
                      setSelectedKapsterId(event.target.value);
                      setSelectedStartsAt("");
                      setSlotsResult(null);
                      setShowAllSlots(false);
                    }}
                    className="min-h-12 w-full rounded-xl border border-soft bg-white px-4 py-3 text-base text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Pilih kapster</option>

                    {kapsters.map((kapster) => (
                      <option key={kapster.id} value={String(kapster.id)}>
                        {kapster.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-5">
                    <label
                      htmlFor="booking-date"
                      className="mb-2 block text-sm font-semibold text-muted"
                    >
                      Tanggal kunjungan
                    </label>

                    <input
                      id="booking-date"
                      type="date"
                      value={selectedDate}
                      onChange={(event) => {
                        setSelectedDate(event.target.value);
                        setSelectedStartsAt("");
                        setSlotsResult(null);
                        setShowAllSlots(false);
                      }}
                      min={todayWib}
                      max={maxBookingDate}
                      disabled={
                        !selectedKapsterId ||
                        isSubmitting ||
                        createdBooking !== null
                      }
                      className="min-h-12 w-full rounded-xl border border-soft bg-white px-4 py-3 text-base text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <p className="mt-2 text-xs leading-5 text-muted">
                      Pilih tanggal hari ini sampai 7 hari ke depan. Jam
                      operasional 10.00–21.00 WIB.
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

      {canLoadSlots && (
        <div className="mt-6 rounded-2xl border border-soft bg-white p-5">
          <h2 className="text-lg font-bold text-primary">
            Pilih jam kunjungan
          </h2>

          <p className="mt-2 text-sm text-muted">Semua jam menggunakan WIB.</p>

          {isLoadingSlots && (
            <p role="status" className="mt-4 text-sm text-muted">
              Memuat jam tersedia...
            </p>
          )}

          {!isLoadingSlots && slotsError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {slotsError}
            </p>
          )}

          {!isLoadingSlots && !slotsError && availableSlots.length === 0 && (
            <p className="mt-4 text-sm text-muted">
              Tidak ada jam tersedia. Silakan pilih tanggal atau kapster lain.
            </p>
          )}

          {!isLoadingSlots && !slotsError && recommendedSlot && (
            <div className="mt-4">
              <div className="rounded-xl border border-soft bg-background p-4">
                <p className="text-sm font-semibold text-muted">
                  Jadwal tersedia paling awal
                </p>

                <p className="mt-2 text-xl font-bold text-primary">
                  {recommendedSlot.time} WIB
                </p>

                <p className="mt-1 text-sm text-muted">
                  Perkiraan selesai{" "}
                  {new Date(recommendedSlot.endsAt).toLocaleTimeString(
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

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStartsAt(recommendedSlot.startsAt);
                    setShowAllSlots(false);
                    setBookingError("");
                  }}
                  disabled={isSubmitting || createdBooking !== null}
                  aria-pressed={selectedStartsAt === recommendedSlot.startsAt}
                  className="mt-4 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedStartsAt === recommendedSlot.startsAt
                    ? "Jam ini dipilih"
                    : "Gunakan jam ini"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAllSlots((current) => !current)}
                disabled={isSubmitting || createdBooking !== null}
                aria-expanded={showAllSlots}
                aria-controls="booking-time-options"
                className="mt-3 min-h-12 w-full rounded-xl border border-soft bg-white px-4 py-3 font-semibold text-primary hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showAllSlots ? "Tutup pilihan jam" : "Pilih jam lain"}
              </button>

              {showAllSlots && (
                <div
                  id="booking-time-options"
                  className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4"
                >
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => {
                        setSelectedStartsAt(slot.startsAt);
                        setShowAllSlots(false);
                        setBookingError("");
                      }}
                      disabled={isSubmitting || createdBooking !== null}
                      aria-pressed={selectedStartsAt === slot.startsAt}
                      className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                        selectedStartsAt === slot.startsAt
                          ? "border-primary bg-primary text-white"
                          : "border-soft bg-white text-primary hover:bg-soft"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}

              {selectedSlot && (
                <p className="mt-4 text-sm font-semibold text-primary">
                  Jam pilihanmu: {selectedSlot.time} WIB
                </p>
              )}
            </div>
          )}

          {selectedStartsAt && !createdBooking && (
            <p className="mt-4 text-xs leading-5 text-muted">
              Jam sudah dipilih, tetapi belum dipesan. Ketersediaan akan
              diperiksa kembali saat kamu mengirim booking.
            </p>
          )}
        </div>
      )}

      {canLoadSlots &&
        !isLoadingSlots &&
        !slotsError &&
        selectedSlot &&
        selectedKapster && (
          <div className="mt-6 rounded-2xl border border-soft bg-white p-5">
            <h2 className="text-lg font-bold text-primary">
              Ringkasan kunjungan
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Customer</dt>
                <dd className="text-right font-semibold text-primary">
                  {user?.name}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-muted">Kapster</dt>
                <dd className="text-right font-semibold text-primary">
                  {selectedKapster.name}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-muted">Tanggal</dt>
                <dd className="text-right font-semibold text-primary">
                  {new Date(selectedSlot.startsAt).toLocaleDateString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-muted">Jam mulai</dt>
                <dd className="font-semibold text-primary">
                  {selectedSlot.time} WIB
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-muted">Perkiraan selesai</dt>
                <dd className="font-semibold text-primary">
                  {new Date(selectedSlot.endsAt).toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}{" "}
                  WIB
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-t border-soft pt-3">
                <dt className="text-muted">Subtotal layanan</dt>
                <dd className="font-bold text-primary">
                  Rp {subtotal.toLocaleString("id-ID")}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-5 text-muted">
              {createdBooking
                ? "Rincian harga booking yang tersimpan ditampilkan di bawah."
                : "Subtotal belum termasuk diskon membership. Jadwal belum dipesan sampai proses booking berhasil."}
            </p>
            <div className="mt-5 border-t border-soft pt-5">
              <label
                htmlFor="booking-notes"
                className="mb-2 block text-sm font-semibold text-primary"
              >
                Catatan (opsional)
              </label>

              <textarea
                id="booking-notes"
                value={notes}
                disabled={isSubmitting || createdBooking !== null}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tuliskan catatan untuk kunjunganmu..."
                aria-describedby="booking-notes-help"
                className="w-full resize-y rounded-xl border border-soft bg-white px-4 py-3 text-base text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <p id="booking-notes-help" className="mt-2 text-xs text-muted">
                Maksimal 500 karakter · {notes.length}/500
              </p>

              {bookingError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  {bookingError}
                </p>
              )}

              {!createdBooking && (
                <button
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={isSubmitting}
                  className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Membuat booking..." : "Buat booking"}
                </button>
              )}

              {createdBooking && (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-soft bg-background p-4"
                >
                  <h3 className="font-bold text-primary">
                    Booking #{createdBooking.id} berhasil dibuat
                  </h3>

                  <p className="mt-2 text-sm text-muted">
                    Subtotal: Rp{" "}
                    {createdBooking.subtotal.toLocaleString("id-ID")}
                  </p>

                  <p className="mt-2 text-sm text-muted">
                    Diskon membership ({createdBooking.discountPercent}%): Rp{" "}
                    {createdBooking.discount.toLocaleString("id-ID")}
                  </p>

                  <p className="mt-3 font-bold text-primary">
                    Total: Rp {createdBooking.total.toLocaleString("id-ID")}
                  </p>

                  {createdBooking.schedule.holdExpiresAt && (
                    <p className="mt-3 text-sm text-muted">
                      Batas pembayaran:{" "}
                      {new Date(
                        createdBooking.schedule.holdExpiresAt,
                      ).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta",
                      })}{" "}
                      WIB
                    </p>
                  )}

                  <p className="mt-3 text-sm leading-6 text-muted">
                    Booking belum terkonfirmasi. Fitur pembayaran sedang
                    disiapkan; jadwal akan dilepas jika batas pembayaran
                    terlewati.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
    </section>
  );
}
