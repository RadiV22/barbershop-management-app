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
    <div>
      <h1>Buat Order</h1>

      {isLoading && <p>Memuat customer...</p>}

      {errorMessage && <p>{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <fieldset disabled={isSaving} className="space-y-4">
          <label htmlFor="customer">Customer</label>

          <select
            id="customer"
            value={customerId}
            onChange={(event) => setCustomerId(Number(event.target.value))}
          >
            <option value="" disabled>
              Pilih customer
            </option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <div>
            <label htmlFor="kapster">Kapster</label>

            <select
              id="kapster"
              value={kapsterId}
              onChange={(event) => setKapsterId(Number(event.target.value))}
            >
              <option value="" disabled>
                Pilih kapster
              </option>

              {kapsters.map((kapster) => (
                <option key={kapster.id} value={kapster.id}>
                  {kapster.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="service">Layanan</label>

            <select
              id="service"
              value={selectedServiceId}
              onChange={(event) =>
                setSelectedServiceId(Number(event.target.value))
              }
            >
              <option value="" disabled>
                Pilih layanan
              </option>

              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - Rp {service.price.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quantity">Quantity</label>

            <div>
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
              >
                -
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
              >
                +
              </button>
            </div>
            {selectedServiceId !== "" && (
              <div>
                <p>Subtotal layanan ini</p>

                <p>
                  Rp{" "}
                  {(
                    (services.find(
                      (service) => service.id === selectedServiceId,
                    )?.price ?? 0) * quantity
                  ).toLocaleString("id-ID")}
                </p>
              </div>
            )}
            <button
              type="button"
              disabled={selectedServiceId === ""}
              onClick={() => {
                if (selectedServiceId === "") return;

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
              }}
            >
              Tambah Layanan
            </button>
            {selectedItems.length > 0 && (
              <div>
                <h3>Layanan yang dipilih</h3>

                <p>
                  Subtotal seluruh layanan: Rp{" "}
                  {subtotal.toLocaleString("id-ID")}
                </p>

                {selectedItems.map((item) => {
                  const service = services.find(
                    (service) => service.id === item.serviceId,
                  );

                  return (
                    <div key={item.serviceId}>
                      <p>{service?.name}</p>

                      <p>Quantity: {item.quantity}</p>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedItems((current) =>
                            current.filter(
                              (selectedItem) =>
                                selectedItem.serviceId !== item.serviceId,
                            ),
                          )
                        }
                      >
                        Hapus dari pilihan
                      </button>

                      <p>
                        Subtotal: Rp{" "}
                        {((service?.price ?? 0) * item.quantity).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="order-notes" className="block font-medium">
              Catatan (opsional)
            </label>

            <textarea
              id="order-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="space-y-2 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Ringkasan estimasi</h2>

            <p>Subtotal: Rp {subtotal.toLocaleString("id-ID")}</p>

            <p>
              Diskon membership ({discountPercent}%): Rp{" "}
              {discount.toLocaleString("id-ID")}
            </p>

            <p className="text-xl font-bold">
              Total: Rp {total.toLocaleString("id-ID")}
            </p>

            <p className="text-sm text-gray-500">
              Total akhir dikonfirmasi saat order berhasil disimpan.
            </p>
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCreateOrder}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Order"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/order")}
              className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
