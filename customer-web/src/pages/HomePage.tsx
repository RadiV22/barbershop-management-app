import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";

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
    <section className="px-5 py-6">
      <div className="rounded-3xl bg-gray-900 px-6 py-8 text-white sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-blue-300">
          BARBERSHOP
        </p>

        <h1 className="mt-3 text-3xl leading-tight font-bold sm:text-4xl">
          Saatnya tampil
          <br />
          lebih rapi.
        </h1>

        <p className="mt-4 max-w-md text-sm leading-6 text-gray-300">
          Temukan layanan perawatan rambut dan pilih gaya yang sesuai dengan
          dirimu.
        </p>

        <a
          href="#layanan-beranda"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Jelajahi layanan
        </a>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900">Layanan kami</h2>

        <p className="mt-2 text-sm text-gray-600">
          Pilihan perawatan untuk kunjunganmu.
        </p>

        {isLoading && (
          <p role="status" className="mt-4 text-sm text-gray-500">
            Memuat layanan...
          </p>
        )}

        {!isLoading && errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada layanan yang tersedia.
              </p>
            ) : (
              services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <h3 className="font-bold text-gray-900">{service.name}</h3>

                  <p className="mt-2 text-sm text-gray-500">
                    {service.duration} menit
                  </p>

                  <p className="mt-3 font-bold text-blue-600">
                    Rp {service.price.toLocaleString("id-ID")}
                  </p>
                </article>
              ))
            )}
          </div>
        )}

        <Link
          to="/services"
          className="mt-4 inline-block py-2 text-sm font-semibold text-blue-600"
        >
          Lihat semua layanan →
        </Link>
      </div>
    </section>
  );
}
