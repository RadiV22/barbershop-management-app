import { useEffect, useState } from "react";
import axios from "axios";
import api from "../lib/axios";
import type { SubmitEvent } from "react";

interface Membership {
  id: number;
  customerId: number;
  memberCode: string;
  discountPercent: number;
  isActive: boolean;
  joinedAt: string;
  updatedAt: string;
}

interface MembershipResponse {
  message: string;
  data: Membership;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  membership: Membership | null;
}

interface CustomerListResponse {
  message: string;
  data: Customer[];
}

interface CustomerResponse {
  message: string;
  data: Omit<Customer, "membership"> & {
    membership?: Membership | null;
  };
}
export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [membershipCustomerId, setMembershipCustomerId] = useState<
    number | null
  >(null);
  const [membershipError, setMembershipError] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(
    null,
  );
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    let ignore = false;

    async function fetchCustomers() {
      try {
        const response = await api.get<CustomerListResponse>("/customer");

        if (!ignore) {
          setCustomers(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (axios.isAxiosError<{ message?: string }>(error)) {
          setErrorMessage(
            error.response?.status === 401
              ? "Sesi sudah tidak valid. Silakan logout dan login kembali."
              : (error.response?.data?.message ??
                  "Tidak dapat mengambil customer. Pastikan backend berjalan."),
          );
        } else {
          setErrorMessage("Terjadi kesalahan saat mengambil customer.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void fetchCustomers();

    return () => {
      ignore = true;
    };
  }, []);

  function resetForm() {
    setName("");
    setPhone("");
    setEditingCustomerId(null);
    setFormError("");
    setShowForm(false);
  }

  function handleEditCustomer(customer: Customer) {
    if (isSaving) return;

    setEditingCustomerId(customer.id);
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setFormError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  async function handleSaveCustomer(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    setFormError("");
    setSuccessMessage("");

    if (!name.trim() || !phone.trim()) {
      setFormError("Nama dan nomor telepon wajib diisi.");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
    };

    try {
      if (editingCustomerId !== null) {
        const response = await api.put<CustomerResponse>(
          `/customer/${editingCustomerId}`,
          payload,
        );

        const updatedCustomer = response.data.data;

        setCustomers((previous) =>
          previous.map((customer) =>
            customer.id === updatedCustomer.id
              ? { ...customer, ...updatedCustomer }
              : customer,
          ),
        );

        setSuccessMessage("Customer berhasil diperbarui.");
      } else {
        const response = await api.post<CustomerResponse>("/customer", payload);

        setCustomers((previous) => [
          ...previous,
          {
            ...response.data.data,
            membership: response.data.data.membership ?? null,
          },
        ]);

        setSuccessMessage("Customer berhasil ditambahkan.");
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
            "Tidak dapat menyimpan customer. Pastikan backend berjalan.",
        );
      } else {
        setFormError("Terjadi kesalahan saat menyimpan customer.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCustomer(customer: Customer) {
    if (isSaving || deletingCustomerId !== null || showForm) return;

    const confirmed = window.confirm(
      `Hapus customer "${customer.name}"? Data yang dihapus tidak dapat dikembalikan.`,
    );

    if (!confirmed) return;

    setDeleteError("");
    setSuccessMessage("");
    setDeletingCustomerId(customer.id);

    try {
      await api.delete(`/customer/${customer.id}`);

      setCustomers((previous) =>
        previous.filter((item) => item.id !== customer.id),
      );

      setSuccessMessage("Customer berhasil dihapus.");
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setDeleteError(
          error.response?.data?.message ??
            "Tidak dapat menghapus customer. Pastikan backend berjalan.",
        );
      } else {
        setDeleteError("Terjadi kesalahan saat menghapus customer.");
      }
    } finally {
      setDeletingCustomerId(null);
    }
  }

  async function handleToggleMembership(customer: Customer) {
    if (
      isSaving ||
      showForm ||
      deletingCustomerId !== null ||
      membershipCustomerId !== null
    ) {
      return;
    }

    setMembershipError("");
    setDeleteError("");
    setSuccessMessage("");
    setMembershipCustomerId(customer.id);

    try {
      const response = customer.membership
        ? await api.patch<MembershipResponse>(
            `/customer/${customer.id}/membership`,
            {
              isActive: !customer.membership.isActive,
            },
          )
        : await api.post<MembershipResponse>(
            `/customer/${customer.id}/membership`,
          );

      const updatedMembership = response.data.data;

      setCustomers((previous) =>
        previous.map((item) =>
          item.id === customer.id
            ? { ...item, membership: updatedMembership }
            : item,
        ),
      );

      setSuccessMessage(
        updatedMembership.isActive
          ? `Membership ${customer.name} berhasil diaktifkan.`
          : `Membership ${customer.name} berhasil dinonaktifkan.`,
      );
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setMembershipError(
          error.response?.data?.message ??
            "Tidak dapat memperbarui membership. Pastikan backend berjalan.",
        );
      } else {
        setMembershipError("Terjadi kesalahan saat memperbarui membership.");
      }
    } finally {
      setMembershipCustomerId(null);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer</h1>
          <p className="mt-1 text-gray-600">Daftar customer barbershop.</p>
        </div>

        {!showForm && (
          <button
            type="button"
            disabled={
              isLoading || Boolean(errorMessage) || deletingCustomerId !== null
            }
            onClick={() => {
              resetForm();
              setDeleteError("");
              setSuccessMessage("");
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Tambah customer
          </button>
        )}
      </header>

      {membershipError && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {membershipError}
        </p>
      )}

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
          onSubmit={handleSaveCustomer}
          className="mt-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">
            {editingCustomerId !== null ? "Edit customer" : "Tambah customer"}
          </h2>

          <fieldset disabled={isSaving} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="customer-name"
                className="block text-sm font-medium"
              >
                Nama customer
              </label>
              <input
                id="customer-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="customer-phone"
                className="block text-sm font-medium"
              >
                Nomor telepon
              </label>
              <input
                id="customer-phone"
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
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
          Memuat customer...
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
          aria-label="Daftar customer"
          className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm"
        >
          {customers.length === 0 ? (
            <p className="p-6 text-gray-600">
              Belum ada customer yang terdaftar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Nama customer
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Nomor telepon
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Membership
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 font-medium">{customer.name}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {customer.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {customer.membership ? (
                          <div className="space-y-2">
                            <span
                              className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                                customer.membership.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {customer.membership.isActive
                                ? "Aktif"
                                : "Tidak aktif"}
                            </span>

                            <p className="max-w-64 break-all text-xs text-gray-500">
                              {customer.membership.memberCode}
                            </p>

                            <p className="text-sm text-gray-600">
                              Diskon: {customer.membership.discountPercent}%
                              {!customer.membership.isActive &&
                                " (tidak berlaku saat nonaktif)"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            Belum menjadi member
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={
                            showForm ||
                            isSaving ||
                            deletingCustomerId !== null ||
                            membershipCustomerId !== null
                          }
                          onClick={() => handleToggleMembership(customer)}
                          className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          {membershipCustomerId === customer.id
                            ? "Memproses..."
                            : customer.membership?.isActive
                              ? "Nonaktifkan membership"
                              : "Aktifkan membership"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={
                              isSaving ||
                              deletingCustomerId !== null ||
                              membershipCustomerId !== null
                            }
                            onClick={() => {
                              setDeleteError("");
                              handleEditCustomer(customer);
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
                              deletingCustomerId !== null
                            }
                            onClick={() => handleDeleteCustomer(customer)}
                            className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingCustomerId === customer.id
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
