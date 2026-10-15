import { useEffect, useState } from "react";
import api from "../lib/axios";
import { Link } from "react-router-dom";

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

export default function ServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadServices() {
      try {
        const response = await api.get<ServiceResponse>("/public/services");

        if (isActive) {
          setServices(response.data.data);
          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage("Gagal mengambil daftar layanan.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      isActive = false;
    };
  }, []);

  const keyword = search.trim().toLowerCase();

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(keyword),
  );

  function handleToggleService(serviceId: number) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id),
  );

  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );

  const subtotal = selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );

  return (
    <section className="px-5 py-6 sm:px-8 sm:py-8">
      <header className="rounded-[2rem] bg-peach-light p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-primary">
          PERAWATAN UNTUKMU
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary">
          Pilih layananmu.
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
          Pilih satu atau beberapa layanan, lalu tentukan kapster dan waktu
          kunjungan yang cocok.
        </p>
      </header>

      <div className="mt-6">
        <label
          htmlFor="service-search"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Cari layanan
        </label>

        <input
          id="service-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama layanan..."
          autoComplete="off"
          className="min-h-12 w-full rounded-2xl border border-soft bg-white px-4 py-3 text-base text-primary outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {isLoading && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-soft bg-white p-5 text-sm text-muted"
        >
          Memuat layanan...
        </p>
      )}

      {!isLoading && errorMessage && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && filteredServices.length === 0 && (
        <div className="mt-6 rounded-2xl border border-soft bg-white px-5 py-8">
          <p className="text-center text-sm leading-6 text-muted">
            {keyword
              ? "Tidak ada layanan yang sesuai pencarian."
              : "Belum ada layanan yang tersedia."}
          </p>
        </div>
      )}

      {!isLoading && !errorMessage && filteredServices.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-primary">Daftar layanan</h2>

            <span className="rounded-full bg-sage-light px-3 py-1 text-xs font-semibold text-primary">
              {filteredServices.length} layanan
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);

              return (
                <article
                  key={service.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border transition-colors ${
                    isSelected
                      ? "border-primary bg-white ring-1 ring-primary"
                      : "border-soft bg-white"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`h-2 ${isSelected ? "bg-primary" : "bg-accent"}`}
                  />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-peach-light px-3 py-1 text-xs font-semibold text-primary">
                        {service.duration} menit
                      </span>

                      {isSelected && (
                        <span className="text-xs font-semibold text-primary">
                          ✓ Dipilih
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 break-words text-lg font-bold leading-snug text-primary">
                      {service.name}
                    </h3>

                    <div className="mt-auto pt-5">
                      <div className="border-t border-soft pt-4">
                        <p className="text-xs text-muted">Harga layanan</p>

                        <p className="mt-1 text-xl font-bold text-primary">
                          Rp {service.price.toLocaleString("id-ID")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleService(service.id)}
                        aria-pressed={isSelected}
                        aria-label={`Pilih layanan ${service.name}`}
                        className={`mt-4 min-h-12 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          isSelected
                            ? "border-primary bg-primary text-white hover:bg-primary/90"
                            : "border-soft bg-peach-light text-primary hover:bg-accent/40"
                        }`}
                      >
                        {isSelected
                          ? "✓ Dipilih · Batalkan"
                          : "+ Pilih layanan"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {!isLoading && !errorMessage && selectedServices.length > 0 && (
        <section
          aria-labelledby="selected-services-title"
          className="mt-8 overflow-hidden rounded-[2rem] border border-soft bg-peach-light"
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted">
                  RINGKASAN PILIHAN
                </p>

                <h2
                  id="selected-services-title"
                  className="mt-2 text-xl font-bold text-primary"
                >
                  Layanan pilihanmu
                </h2>
              </div>

              <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary">
                {selectedServices.length} layanan
              </span>
            </div>

            <ul className="mt-5 divide-y divide-soft rounded-2xl bg-white px-4">
              {selectedServices.map((service) => (
                <li
                  key={service.id}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <span className="min-w-0 break-words text-sm text-primary">
                    {service.name}
                  </span>

                  <span className="shrink-0 text-sm font-semibold text-primary">
                    Rp {service.price.toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-3">
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-muted">Total durasi</dt>
                <dd className="font-semibold text-primary">
                  {totalDuration} menit
                </dd>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary/25 pt-4">
                <dt className="font-semibold text-primary">Subtotal</dt>
                <dd className="text-2xl font-bold text-primary">
                  Rp {subtotal.toLocaleString("id-ID")}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs leading-5 text-muted">
              Harga belum termasuk potongan membership. Total akhir akan
              dihitung saat proses booking.
            </p>

            <Link
              to={`/booking?services=${selectedServiceIds.join(",")}`}
              className="mt-5 flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Lanjut booking
              <span aria-hidden="true">→</span>
            </Link>

            <button
              type="button"
              onClick={() => setSelectedServiceIds([])}
              className="mt-2 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:bg-white/50"
            >
              Hapus semua pilihan
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
