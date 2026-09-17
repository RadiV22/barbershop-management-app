import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";
import type { FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface ServiceListResponse {
  message: string;
  data: Service[];
}

interface ServiceResponse {
  message: string;
  data: Service;
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function ServicePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchServices() {
      try {
        const response = await api.get<ServiceListResponse>("/services");

        if (!ignore) {
          setServices(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (axios.isAxiosError<{ message?: string }>(error)) {
          setErrorMessage(
            error.response?.status === 401
              ? "Sesi sudah tidak valid. Silakan logout dan login kembali."
              : (error.response?.data?.message ??
                  "Tidak dapat mengambil layanan. Pastikan backend berjalan."),
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil layanan.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void fetchServices();

    return () => {
      ignore = true;
    };
  }, []);

  function resetForm() {
    setName("");
    setPrice("");
    setDuration("");
    setIsActive(true);
    setEditingServiceId(null);
    setFormError("");
    setShowForm(false);
  }

  function handleEditService(service: Service) {
    if (isSaving) return;

    setEditingServiceId(service.id);
    setName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration));
    setIsActive(service.isActive);
    setFormError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  async function handleSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving || !isAdmin) return;

    setFormError("");
    setSuccessMessage("");
    setIsSaving(true);

    const payload = {
      name: name.trim(),
      price: Number(price),
      duration: Number(duration),
    };

    try {
      if (editingServiceId !== null) {
        const response = await api.put<ServiceResponse>(
          `/services/${editingServiceId}`,
          {
            ...payload,
            isActive,
          },
        );

        const updatedService = response.data.data;

        setServices((previous) =>
          previous.map((service) =>
            service.id === updatedService.id ? updatedService : service,
          ),
        );

        setSuccessMessage("Layanan berhasil diperbarui.");
      } else {
        const response = await api.post<ServiceResponse>("/services", payload);

        setServices((previous) => [...previous, response.data.data]);

        setSuccessMessage("Layanan berhasil ditambahkan.");
      }

      resetForm();
    } catch (error) {
      if (
        axios.isAxiosError<{
          message?: string;
          errors?: { field: string; message: string }[];
        }>(error)
      ) {
        const responseData = error.response?.data;

        setFormError(
          responseData?.errors?.map((issue) => issue.message).join(" ") ||
            responseData?.message ||
            "Tidak dapat menyimpan layanan. Pastikan backend berjalan.",
        );
      } else {
        setFormError("Terjadi kesalahan saat menyimpan layanan.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteService(service: Service) {
    if (!isAdmin || isSaving || deletingServiceId !== null || showForm) return;

    const confirmed = window.confirm(
      `Hapus layanan "${service.name}"? Data yang dihapus tidak dapat dikembalikan.`,
    );

    if (!confirmed) return;

    setDeleteError("");
    setSuccessMessage("");
    setDeletingServiceId(service.id);

    try {
      await api.delete(`/services/${service.id}`);

      setServices((previous) =>
        previous.filter((item) => item.id !== service.id),
      );

      setSuccessMessage("Layanan berhasil dihapus.");
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setDeleteError(
          error.response?.data?.message ??
            "Tidak dapat menghapus layanan. Pastikan backend berjalan.",
        );
      } else {
        setDeleteError("Terjadi kesalahan saat menghapus layanan.");
      }
    } finally {
      setDeletingServiceId(null);
    }
  }
  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Layanan</h1>
          <p className="mt-1 text-gray-600">
            Daftar layanan yang tersedia di barbershop.
          </p>
        </div>

        {isAdmin && !showForm && (
          <button
            type="button"
            disabled={
              isLoading || Boolean(errorMessage) || deletingServiceId !== null
            }
            onClick={() => {
              resetForm();
              setDeleteError("");
              setSuccessMessage("");
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tambah layanan
          </button>
        )}
      </header>

      {deleteError && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {deleteError}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="mt-6 rounded-lg bg-green-50 p-4 text-green-700"
        >
          {successMessage}
        </p>
      )}

      {isAdmin && showForm && (
        <form
          onSubmit={handleSaveService}
          className="mt-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">
            {editingServiceId !== null ? "Edit layanan" : "Tambah layanan"}
          </h2>

          <fieldset disabled={isSaving} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="service-name"
                className="block text-sm font-medium"
              >
                Nama layanan
              </label>
              <input
                id="service-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="service-price"
                className="block text-sm font-medium"
              >
                Harga (Rp)
              </label>
              <input
                id="service-price"
                type="number"
                required
                min="1"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="service-duration"
                className="block text-sm font-medium"
              >
                Durasi (menit)
              </label>
              <input
                id="service-duration"
                type="number"
                required
                min="1"
                step="1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            {editingServiceId !== null && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4"
                />
                Layanan aktif
              </label>
            )}

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {isLoading && (
        <p role="status" className="mt-6 text-gray-600">
          Memuat layanan...
        </p>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 p-4 text-red-700"
        >
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 font-medium underline"
          >
            Muat ulang
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && (
        <section
          aria-label="Daftar layanan"
          className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm"
        >
          {services.length === 0 ? (
            <p className="p-6 text-gray-600">
              Belum ada layanan yang tersedia.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Nama layanan
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Harga
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Durasi
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Status
                    </th>
                    {isAdmin && (
                      <th scope="col" className="px-6 py-4">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 font-medium">{service.name}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {rupiah.format(service.price)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {service.duration} menit
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                            service.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {service.isActive ? "Aktif" : "Tidak aktif"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving || deletingServiceId !== null}
                              onClick={() => {
                                setDeleteError("");
                                handleEditService(service);
                              }}
                              className="rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={
                                showForm ||
                                isSaving ||
                                deletingServiceId !== null
                              }
                              onClick={() => handleDeleteService(service)}
                              className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingServiceId === service.id
                                ? "Menghapus..."
                                : "Hapus"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
