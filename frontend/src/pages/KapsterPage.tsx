import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";
import type { SubmitEvent } from "react";

interface Kapster {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KapsterListResponse {
  message: string;
  data: Kapster[];
}

interface KapsterResponse {
  message: string;
  data: Kapster;
}

export default function KapsterPage() {
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingKapsterId, setEditingKapsterId] = useState<number | null>(null);

  const [deletingKapsterId, setDeletingKapsterId] = useState<number | null>(
    null,
  );

  const [deleteError, setDeleteError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchKapsters() {
      try {
        const response = await api.get<KapsterListResponse>("/kapster");

        if (!ignore) {
          setKapsters(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (axios.isAxiosError<{ message?: string }>(error)) {
          setErrorMessage(
            error.response?.status === 401
              ? "Sesi sudah tidak valid. Silakan logout dan login kembali."
              : (error.response?.data?.message ??
                  "Tidak dapat mengambil kapster. Pastikan backend berjalan."),
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil kapster.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void fetchKapsters();

    return () => {
      ignore = true;
    };
  }, []);

  function resetForm() {
    setName("");
    setEditingKapsterId(null);
    setFormError("");
    setShowForm(false);
  }

  function handleEditKapster(kapster: Kapster) {
    if (isSaving) return;

    setEditingKapsterId(kapster.id);
    setName(kapster.name);
    setFormError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  async function handleSaveKapster(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    setFormError("");
    setSuccessMessage("");

    if (!name.trim()) {
      setFormError("Nama kapster wajib diisi.");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
    };

    try {
      if (editingKapsterId !== null) {
        const response = await api.put<KapsterResponse>(
          `/kapster/${editingKapsterId}`,
          payload,
        );

        const updatedKapster = response.data.data;

        setKapsters((previous) =>
          previous.map((kapster) =>
            kapster.id === updatedKapster.id ? updatedKapster : kapster,
          ),
        );

        setSuccessMessage("Kapster berhasil diperbarui.");
      } else {
        const response = await api.post<KapsterResponse>("/kapster", payload);

        setKapsters((previous) => [...previous, response.data.data]);

        setSuccessMessage("Kapster berhasil ditambahkan.");
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
            "Tidak dapat menyimpan kapster. Pastikan backend berjalan.",
        );
      } else {
        setFormError("Terjadi kesalahan saat menyimpan kapster.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteKapster(kapster: Kapster) {
    if (isSaving || deletingKapsterId !== null || showForm) return;

    const confirmed = window.confirm(
      `Hapus kapster "${kapster.name}"? Data yang dihapus tidak dapat dikembalikan.`,
    );

    if (!confirmed) return;

    setDeleteError("");
    setSuccessMessage("");
    setDeletingKapsterId(kapster.id);

    try {
      await api.delete(`/kapster/${kapster.id}`);

      setKapsters((previous) =>
        previous.filter((item) => item.id !== kapster.id),
      );

      setSuccessMessage("Kapster berhasil dihapus.");
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setDeleteError(
          error.response?.data?.message ??
            "Tidak dapat menghapus kapster. Pastikan backend berjalan.",
        );
      } else {
        setDeleteError("Terjadi kesalahan saat menghapus kapster.");
      }
    } finally {
      setDeletingKapsterId(null);
    }
  }

  async function handleToggleStatus(kapster: Kapster) {
    if (isSaving || deletingKapsterId !== null || updatingStatusId !== null) {
      return;
    }

    setUpdatingStatusId(kapster.id);
    setDeleteError("");
    setSuccessMessage("");

    try {
      const response = await api.put<KapsterResponse>(
        `/kapster/${kapster.id}`,
        {
          isActive: !kapster.isActive,
        },
      );

      const updatedKapster = response.data.data;

      setKapsters((previous) =>
        previous.map((item) =>
          item.id === updatedKapster.id ? updatedKapster : item,
        ),
      );

      setSuccessMessage(
        updatedKapster.isActive
          ? "Kapster berhasil diaktifkan."
          : "Kapster berhasil dinonaktifkan.",
      );
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setDeleteError(
          error.response?.data?.message ??
            "Tidak dapat mengubah status kapster.",
        );
      } else {
        setDeleteError("Terjadi kesalahan saat mengubah status kapster.");
      }
    } finally {
      setUpdatingStatusId(null);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kapster</h1>
          <p className="mt-1 text-gray-600">Daftar kapster barbershop.</p>
        </div>

        {!showForm && (
          <button
            type="button"
            disabled={
              isLoading || Boolean(errorMessage) || deletingKapsterId !== null
            }
            onClick={() => {
              resetForm();
              setDeleteError("");
              setSuccessMessage("");
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Tambah kapster
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

      {showForm && (
        <form
          onSubmit={handleSaveKapster}
          className="mt-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">
            {editingKapsterId !== null ? "Edit kapster" : "Tambah kapster"}
          </h2>

          <fieldset disabled={isSaving} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="kapster-name"
                className="block text-sm font-medium"
              >
                Nama kapster
              </label>

              <input
                id="kapster-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

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
          Memuat kapster...
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
          aria-label="Daftar kapster"
          className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm"
        >
          {kapsters.length === 0 ? (
            <p className="p-6 text-gray-600">
              Belum ada kapster yang terdaftar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Nama kapster
                    </th>

                    <th scope="col" className="px-6 py-4">
                      Status
                    </th>

                    <th scope="col" className="px-6 py-4">
                      Dibuat
                    </th>

                    <th scope="col" className="px-6 py-4">
                      Diperbarui
                    </th>

                    <th scope="col" className="px-6 py-4">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {kapsters.map((kapster) => (
                    <tr key={kapster.id}>
                      <td className="px-6 py-4 font-medium">{kapster.name}</td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={
                            isSaving ||
                            deletingKapsterId !== null ||
                            updatingStatusId !== null ||
                            showForm
                          }
                          onClick={() => handleToggleStatus(kapster)}
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                            kapster.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {updatingStatusId === kapster.id
                            ? "Mengubah..."
                            : kapster.isActive
                              ? "Aktif"
                              : "Tidak aktif"}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        {new Date(kapster.createdAt).toLocaleString("id-ID")}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        {new Date(kapster.updatedAt).toLocaleString("id-ID")}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isSaving || deletingKapsterId !== null}
                            onClick={() => {
                              setDeleteError("");
                              handleEditKapster(kapster);
                            }}
                            className="rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={
                              showForm || isSaving || deletingKapsterId !== null
                            }
                            onClick={() => handleDeleteKapster(kapster)}
                            className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingKapsterId === kapster.id
                              ? "Menghapus..."
                              : "Hapus"}
                          </button>
                        </div>
                      </td>
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
