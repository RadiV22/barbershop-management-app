import { useEffect, useState } from "react";
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

export default function ServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <section className="px-5 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Layanan</h1>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Temukan layanan yang sesuai untuk kebutuhanmu.
      </p>

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

      {!isLoading && !errorMessage && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {services.length === 0 ? (
            <p className="text-sm text-gray-500 sm:col-span-2">
              Belum ada layanan yang tersedia.
            </p>
          ) : (
            services.map((service) => (
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
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
