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
          <p className="text-xs font-bold tracking-[0.18em] text-primary">
            BARBERBRO
          </p>

          <h1 className="mt-2 break-words text-xl font-bold text-primary sm:text-2xl">
            {user ? `Halo, ${user.name}` : "Selamat datang di BarberBro"}
          </h1>

          <p className="mt-1 text-sm text-muted">
            Perawatan yang pas untuk gayamu.
          </p>
        </div>

        {!isInitializing && (
          <Link
            to={user ? "/account" : "/login"}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-soft bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-peach-light"
          >
            {user ? "Akun saya" : "Masuk"}
          </Link>
        )}
      </header>

      <div className="relative overflow-hidden rounded-[2rem] bg-peach-strong px-6 py-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[32px] border-white/20"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-secondary/15"
        />

        <div className="relative">
          <p className="inline-flex rounded-full bg-white/60 px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-primary sm:text-xs">
            TAMPIL RAPI, LEBIH PERCAYA DIRI
          </p>

          <h2 className="mt-5 max-w-sm text-3xl font-bold leading-tight tracking-tight text-primary sm:text-4xl">
            Gaya baru.
            <br />
            Semangat baru.
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-6 text-primary">
            Luangkan waktu untuk merawat diri. Pilih layanan favorit dan
            rencanakan kunjunganmu ke BarberBro.
          </p>

          <a
            href="#layanan-beranda"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Jelajahi layanan
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-soft bg-white p-4">
          <p className="text-xs text-muted">Pilihan perawatan</p>
          <p className="mt-1 text-sm font-bold text-primary">
            Sesuai kebutuhanmu
          </p>
        </div>

        <div className="rounded-2xl bg-sage-light p-4">
          <p className="text-xs text-muted">Rencanakan kunjungan</p>
          <p className="mt-1 text-sm font-bold text-primary">
            Pilih jam tersedia
          </p>
        </div>
      </div>

      <section
        id="layanan-beranda"
        aria-labelledby="layanan-title"
        className="mt-9 scroll-mt-6"
      >
        <p className="text-xs font-semibold tracking-[0.14em] text-muted">
          PERAWATAN UNTUKMU
        </p>

        <h2
          id="layanan-title"
          className="mt-2 text-2xl font-bold tracking-tight text-primary"
        >
          Mau perawatan apa?
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Temukan layanan yang sesuai dengan kebutuhanmu.
        </p>

        {isLoading && (
          <p role="status" className="mt-5 text-sm text-muted">
            Memuat layanan...
          </p>
        )}

        {!isLoading && errorMessage && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {services.length === 0 ? (
              <p className="rounded-2xl border border-soft bg-white p-5 text-sm text-muted sm:col-span-2">
                Belum ada layanan yang tersedia.
              </p>
            ) : (
              services.map((service) => (
                <article
                  key={service.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-soft bg-white"
                >
                  <div aria-hidden="true" className="h-2 bg-accent" />

                  <div className="flex flex-1 flex-col p-5">
                    <div>
                      <span className="inline-flex rounded-full bg-peach-light px-3 py-1 text-xs font-semibold text-primary">
                        {service.duration} menit
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold leading-snug text-primary">
                      {service.name}
                    </h3>

                    <div className="mt-auto pt-5">
                      <div className="border-t border-soft pt-4">
                        <p className="text-xs text-muted">Harga layanan</p>

                        <p className="mt-1 text-xl font-bold text-primary">
                          Rp {service.price.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        <Link
          to="/services"
          className="mt-5 flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-primary bg-transparent px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-peach-light"
        >
          Lihat semua layanan
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </section>
  );
}
