import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";
import { useAuth } from "../hooks/useAuth";

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

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { user, isInitializing } = useAuth();

  useEffect(() => {
    let isActive = true;

    async function loadServices() {
      try {
        const response = await api.get<ServiceResponse>("/public/services");

        if (isActive) {
          setServices(response.data.data.slice(0, 3));
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
  return (
    <section className="px-5 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Barbershop</p>

          <h1 className="mt-1 break-words text-2xl font-bold text-gray-900">
            {user ? `Halo, ${user.name}` : "Saatnya tampil lebih rapi"}
          </h1>
        </div>

        {!isInitializing && (
          <Link
            to={user ? "/account" : "/login"}
            className="shrink-0 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-soft"
          >
            {user ? "Akun saya" : "Masuk"}
          </Link>
        )}
      </header>

      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-accent/30"
        />

        <div className="relative">
          <p className="text-xs font-semibold tracking-widest text-soft">
            TAMPIL RAPI, LEBIH PERCAYA DIRI
          </p>

          <h1 className="mt-4 text-3xl leading-tight font-bold text-white sm:text-4xl">
            Saatnya merawat
            <br />
            gaya rambutmu.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-white">
            Temukan layanan yang sesuai dan rencanakan kunjunganmu ke
            barbershop.
          </p>

          <a
            href="#layanan-beranda"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-soft"
          >
            Jelajahi layanan
          </a>
        </div>
      </div>

      <section
        id="layanan-beranda"
        aria-labelledby="layanan-title"
        className="mt-8 scroll-mt-6"
      >
        <h2
          id="layanan-title"
          className="text-xl font-bold tracking-tight text-gray-900"
        >
          Layanan kami
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Pilih perawatan yang sesuai dengan kebutuhanmu.
        </p>

        {isLoading && (
          <p role="status" className="mt-5 text-sm text-gray-500">
            Memuat layanan...
          </p>
        )}

        {!isLoading && errorMessage && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {services.length === 0 ? (
              <p className="rounded-2xl border border-soft bg-white p-5 text-sm text-gray-500 sm:col-span-2">
                Belum ada layanan yang tersedia.
              </p>
            ) : (
              services.map((service) => (
                <article
                  key={service.id}
                  className="flex flex-col rounded-2xl border border-soft bg-white p-5"
                >
                  <span
                    aria-hidden="true"
                    className="mb-4 h-1 w-10 rounded-full bg-secondary"
                  />

                  <h3 className="text-base font-bold text-gray-900">
                    {service.name}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Durasi {service.duration} menit
                  </p>

                  <div className="mt-auto pt-5">
                    <p className="border-t border-soft/60 pt-4 text-lg font-bold text-primary">
                      Rp {service.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        <Link
          to="/services"
          className="mt-5 flex min-h-12 items-center justify-center rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-soft/50"
        >
          Lihat semua layanan
        </Link>
      </section>
    </section>
  );
}
