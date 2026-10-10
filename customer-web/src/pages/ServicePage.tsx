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
    <section className="px-5 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Layanan</h1>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Temukan layanan yang sesuai untuk kebutuhanmu.
      </p>

      <div className="mt-5">
        <label
          htmlFor="service-search"
          className="mb-2 block text-sm font-semibold text-muted"
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
          className="w-full rounded-xl border border-soft bg-white px-4 py-3 text-base text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {isLoading && (
        <p role="status" className="mt-6 text-sm text-gray-600">
          Memuat layanan...
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

      {!isLoading && !errorMessage && filteredServices.length === 0 && (
        <div className="mt-5 rounded-2xl border border-soft bg-white p-5">
          <p className="text-center text-sm text-muted">
            {keyword
              ? "Tidak ada layanan yang sesuai pencarian."
              : "Belum ada layanan yang tersedia."}
          </p>
        </div>
      )}

      {!isLoading && !errorMessage && filteredServices.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredServices.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-soft bg-white p-5"
            >
              <h2 className="text-lg font-bold text-gray-900">
                {service.name}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Durasi: {service.duration} menit
              </p>

              <p className="mt-4 text-lg font-bold text-primary">
                Rp {service.price.toLocaleString("id-ID")}
              </p>

              <button
                type="button"
                onClick={() => handleToggleService(service.id)}
                aria-pressed={selectedServiceIds.includes(service.id)}
                aria-label={`Pilih layanan ${service.name}`}
                className={`mt-4 min-h-12 w-full rounded-xl border px-4 py-3 text-sm font-semibold ${
                  selectedServiceIds.includes(service.id)
                    ? "border-primary bg-primary text-white"
                    : "border-primary bg-white text-primary hover:bg-soft"
                }`}
              >
                {selectedServiceIds.includes(service.id)
                  ? "✓ Dipilih — klik untuk batal"
                  : "Pilih layanan"}
              </button>
            </article>
          ))}
        </div>
      )}

      {!isLoading && !errorMessage && selectedServices.length > 0 && (
        <div className="mt-6 rounded-2xl border border-soft bg-white p-5">
          <h2 className="text-lg font-bold text-primary">Layanan pilihanmu</h2>

          <ul className="mt-4 space-y-3">
            {selectedServices.map((service) => (
              <li
                key={service.id}
                className="flex items-start justify-between gap-4"
              >
                <span className="text-sm text-muted">{service.name}</span>

                <span className="shrink-0 text-sm font-semibold text-primary">
                  Rp {service.price.toLocaleString("id-ID")}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-soft pt-4">
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

          <p className="mt-3 text-xs leading-5 text-muted">
            Harga belum termasuk potongan membership. Total akhir akan dihitung
            saat proses booking.
          </p>

          <Link
            to={`/booking?services=${selectedServiceIds.join(",")}`}
            className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
          >
            Lanjut booking
          </Link>

          <button
            type="button"
            onClick={() => setSelectedServiceIds([])}
            className="mt-4 min-h-11 text-sm font-semibold text-primary underline"
          >
            Hapus semua pilihan
          </button>
        </div>
      )}
    </section>
  );
}
