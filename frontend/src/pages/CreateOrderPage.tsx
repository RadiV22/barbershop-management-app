import { useEffect, useState } from "react";
import api from "../lib/axios";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  membership: {
    discountPercent: number;
    isActive: boolean;
  } | null;
}

interface CustomerResponse {
  message: string;
  data: Customer[];
}

interface Kapster {
  id: number;
  name: string;
  isActive: boolean;
}

interface KapsterResponse {
  message: string;
  data: Kapster[];
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface ServiceResponse {
  message: string;
  data: Service[];
}

export default function CreateOrderPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [kapsterId, setKapsterId] = useState<number | "">("");
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [selectedItems, setSelectedItems] = useState<
    { serviceId: number; quantity: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await api.get<CustomerResponse>("/customer");
        setCustomers(response.data.data);

        const kapsterResponse = await api.get<KapsterResponse>("/kapster");
        setKapsters(
          kapsterResponse.data.data.filter((kapster) => kapster.isActive),
        );

        const serviceResponse = await api.get<ServiceResponse>("/services");
        setServices(
          serviceResponse.data.data.filter((service) => service.isActive),
        );

        setErrorMessage("");
      } catch {
        setErrorMessage(
          "Gagal mengambil data customer, kapster, atau layanan.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomers().catch(() => undefined);
  }, []);

  const subtotal = selectedItems.reduce((total, item) => {
    const service = services.find((service) => service.id === item.serviceId);

    return total + (service?.price ?? 0) * item.quantity;
  }, 0);

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );

  const discountPercent = selectedCustomer?.membership?.isActive
    ? selectedCustomer.membership.discountPercent
    : 0;

  const discount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discount;

  const totalQuantity = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const totalDuration = selectedItems.reduce((sum, item) => {
    const service = services.find((service) => service.id === item.serviceId);

    return sum + (service?.duration ?? 0) * item.quantity;
  }, 0);

  function handleAddService() {
    if (isSaving || selectedServiceId === "") return;

    setSelectedItems((current) => {
      const existingItem = current.find(
        (item) => item.serviceId === selectedServiceId,
      );

      if (existingItem) {
        return current.map((item) =>
          item.serviceId === selectedServiceId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...current,
        {
          serviceId: selectedServiceId,
          quantity,
        },
      ];
    });

    setSelectedServiceId("");
    setQuantity(1);
    setFormError("");
  }

  function handleChangeQuantity(serviceId: number, change: number) {
    if (isSaving) return;

    setSelectedItems((current) =>
      current.map((item) =>
        item.serviceId === serviceId
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + change),
            }
          : item,
      ),
    );
  }

  function handleReset() {
    if (isSaving) return;

    setCustomerId("");
    setKapsterId("");
    setSelectedServiceId("");
    setQuantity(1);
    setSelectedItems([]);
    setNotes("");
    setFormError("");
  }

  async function handleCreateOrder() {
    if (isSaving) return;

    setFormError("");

    if (customerId === "") {
      setFormError("Pilih customer terlebih dahulu.");
      return;
    }

    if (kapsterId === "") {
      setFormError("Pilih kapster terlebih dahulu.");
      return;
    }

    if (selectedItems.length === 0) {
      setFormError("Tambahkan minimal satu layanan.");
      return;
    }

    if (selectedServiceId !== "") {
      setFormError(
        "Klik Tambah Layanan untuk memasukkan layanan yang masih dipilih.",
      );
      return;
    }

    setIsSaving(true);

    try {
      await api.post("/order", {
        customerId,
        kapsterId,
        items: selectedItems,
        notes: notes.trim(),
      });

      navigate("/order", { replace: true });
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
            "Tidak dapat menyimpan order. Pastikan backend berjalan.",
        );
      } else {
        setFormError("Terjadi kesalahan saat menyimpan order.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate("/order")}
          disabled={isSaving}
          aria-label="Kembali ke daftar order"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Order</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pilih customer, kapster, dan layanan untuk kunjungan baru.
          </p>
        </div>
      </div>

      {isLoading && (
        <p
          role="status"
          className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500"
        >
          Memuat customer, kapster, dan layanan...
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateOrder();
          }}
          className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <fieldset
            disabled={isSaving}
            className="min-w-0 space-y-7 p-4 sm:p-6"
          >
            <legend className="sr-only">Data order baru</legend>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="customer"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Customer <span className="text-red-500">*</span>
                </label>

                <select
                  id="customer"
                  required
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Pilih customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` — ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>

                {customers.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    Belum ada customer. Tambahkan melalui menu Customer.
                  </p>
                )}

                {selectedCustomer?.membership?.isActive && (
                  <p className="mt-2 text-sm font-medium text-green-700">
                    Membership aktif · Diskon {discountPercent}%
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="kapster"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Kapster <span className="text-red-500">*</span>
                </label>

                <select
                  id="kapster"
                  required
                  value={kapsterId}
                  onChange={(event) =>
                    setKapsterId(
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Pilih kapster</option>

                  {kapsters.map((kapster) => (
                    <option key={kapster.id} value={kapster.id}>
                      {kapster.name}
                    </option>
                  ))}
                </select>

                {kapsters.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    Belum ada kapster aktif yang tersedia.
                  </p>
                )}
              </div>
            </div>

            <section className="min-w-0" aria-labelledby="services-title">
              <h2
                id="services-title"
                className="text-base font-semibold text-gray-900"
              >
                Rincian layanan <span className="text-red-500">*</span>
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Tambahkan layanan, lalu atur jumlahnya di tabel.
              </p>

              <div className="mt-4 grid items-end gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="min-w-0">
                  <label
                    htmlFor="service"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Pilih layanan
                  </label>

                  <select
                    id="service"
                    value={selectedServiceId}
                    onChange={(event) =>
                      setSelectedServiceId(
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Pilih layanan</option>

                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} — Rp{" "}
                        {service.price.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Jumlah
                  </p>

                  <div
                    role="group"
                    aria-label="Jumlah layanan yang akan ditambahkan"
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white"
                  >
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() =>
                        setQuantity((current) => Math.max(1, current - 1))
                      }
                      aria-label="Kurangi jumlah layanan baru"
                      className="h-10 w-10 rounded-l-lg text-lg hover:bg-gray-100 disabled:opacity-40"
                    >
                      −
                    </button>

                    <span className="min-w-10 px-2 text-center text-sm font-semibold">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => setQuantity((current) => current + 1)}
                      aria-label="Tambah jumlah layanan baru"
                      className="h-10 w-10 rounded-r-lg text-lg hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={selectedServiceId === ""}
                  onClick={handleAddService}
                  className="rounded-lg border border-blue-600 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Tambah layanan
                </button>
              </div>

              {services.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  Belum ada layanan aktif yang tersedia.
                </p>
              )}

              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <caption className="sr-only">
                    Daftar layanan yang dipilih untuk order baru
                  </caption>

                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Layanan
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Durasi / unit
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-semibold"
                      >
                        Harga satuan
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center font-semibold"
                      >
                        Jumlah
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-semibold"
                      >
                        Subtotal
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center font-semibold"
                      >
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {selectedItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          Belum ada layanan. Pilih layanan di atas lalu klik
                          Tambah layanan.
                        </td>
                      </tr>
                    ) : (
                      selectedItems.map((item) => {
                        const service = services.find(
                          (service) => service.id === item.serviceId,
                        );

                        return (
                          <tr key={item.serviceId}>
                            <td className="px-4 py-4 font-medium text-gray-900">
                              {service?.name ?? "Layanan tidak tersedia"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                              {service?.duration ?? 0} menit
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right">
                              Rp {(service?.price ?? 0).toLocaleString("id-ID")}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <div
                                role="group"
                                aria-label={`Jumlah ${service?.name ?? "layanan"}`}
                                className="inline-flex items-center rounded-lg border border-gray-200"
                              >
                                <button
                                  type="button"
                                  disabled={item.quantity <= 1}
                                  onClick={() =>
                                    handleChangeQuantity(item.serviceId, -1)
                                  }
                                  aria-label={`Kurangi jumlah ${service?.name ?? "layanan"}`}
                                  className="h-9 w-9 rounded-l-lg hover:bg-gray-100 disabled:opacity-40"
                                >
                                  −
                                </button>

                                <span className="min-w-8 px-1 font-semibold">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleChangeQuantity(item.serviceId, 1)
                                  }
                                  aria-label={`Tambah jumlah ${service?.name ?? "layanan"}`}
                                  className="h-9 w-9 rounded-r-lg hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right font-semibold">
                              Rp{" "}
                              {(
                                (service?.price ?? 0) * item.quantity
                              ).toLocaleString("id-ID")}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedItems((current) =>
                                    current.filter(
                                      (selectedItem) =>
                                        selectedItem.serviceId !==
                                        item.serviceId,
                                    ),
                                  )
                                }
                                aria-label={`Hapus ${service?.name ?? "layanan"} dari pilihan`}
                                className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-600 hover:bg-red-100"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs text-gray-500 sm:hidden">
                Geser tabel ke samping untuk melihat semua kolom.
              </p>
            </section>

            <div>
              <label
                htmlFor="order-notes"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Catatan{" "}
                <span className="font-normal text-gray-400">(opsional)</span>
              </label>

              <textarea
                id="order-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contoh: bagian samping pendek, bagian atas dirapikan."
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-6 rounded-xl bg-gray-50 p-4 sm:p-5 md:grid-cols-2">
              <div className="grid grid-cols-2 content-start gap-4">
                <div>
                  <p className="text-sm text-gray-500">Jumlah layanan</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {totalQuantity} unit
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Estimasi durasi</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {totalDuration} menit
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    Rp {subtotal.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-600">
                    Diskon membership ({discountPercent}%)
                  </span>
                  <span className="whitespace-nowrap font-medium text-green-700">
                    − Rp {discount.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t border-gray-200 pt-3">
                  <span className="font-semibold text-gray-900">
                    Total estimasi
                  </span>
                  <span className="whitespace-nowrap text-xl font-bold text-blue-700">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Total akhir dikonfirmasi saat order berhasil disimpan.
                </p>
              </div>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {formError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={
                  isSaving ||
                  customers.length === 0 ||
                  kapsters.length === 0 ||
                  services.length === 0
                }
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Order"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
