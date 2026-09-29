import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import api from "../lib/axios";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { OrderStackParamList } from "../navigation/OrderNavigator";

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  membership: {
    isActive: boolean;
    discountPercent: number;
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

interface SelectedOrderItem {
  serviceId: number;
  quantity: number;
}

interface CreateOrderResponse {
  message: string;
  data: {
    id: number;
  };
}

type Props = NativeStackScreenProps<OrderStackParamList, "CreateOrder">;

export default function CreateOrderScreen({ navigation }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [kapsterId, setKapsterId] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadFormData() {
      try {
        const [customerResponse, kapsterResponse, serviceResponse] =
          await Promise.all([
            api.get<CustomerResponse>("/customer"),
            api.get<KapsterResponse>("/kapster"),
            api.get<ServiceResponse>("/services"),
          ]);

        if (isActive) {
          setCustomers(customerResponse.data.data);

          setKapsters(
            kapsterResponse.data.data.filter((kapster) => kapster.isActive),
          );

          setServices(
            serviceResponse.data.data.filter((service) => service.isActive),
          );

          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage(
            "Gagal mengambil data customer, kapster, atau layanan.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      isActive = false;
    };
  }, []);

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );

  const customerKeyword = customerSearch.trim().toLowerCase();

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerKeyword) ||
      (customer.phone ?? "").includes(customerKeyword),
  );

  function handleAddService(serviceId: number) {
    setSelectedItems((current) => {
      const alreadySelected = current.some(
        (item) => item.serviceId === serviceId,
      );

      if (alreadySelected) {
        return current;
      }

      return [...current, { serviceId, quantity: 1 }];
    });
  }

  function handleChangeQuantity(serviceId: number, change: number) {
    setSelectedItems((current) =>
      current.map((item) => {
        if (item.serviceId !== serviceId) {
          return item;
        }

        const nextQuantity = item.quantity + change;

        if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 1) {
          return item;
        }

        return {
          ...item,
          quantity: nextQuantity,
        };
      }),
    );
  }

  function handleRemoveService(serviceId: number) {
    setSelectedItems((current) =>
      current.filter((item) => item.serviceId !== serviceId),
    );
  }

  const totalQuantity = selectedItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const totalDuration = selectedItems.reduce((total, item) => {
    const service = services.find((service) => service.id === item.serviceId);

    return total + (service?.duration ?? 0) * item.quantity;
  }, 0);

  const subtotal = selectedItems.reduce((total, item) => {
    const service = services.find((service) => service.id === item.serviceId);

    return total + (service?.price ?? 0) * item.quantity;
  }, 0);

  const discountPercent = selectedCustomer?.membership?.isActive
    ? selectedCustomer.membership.discountPercent
    : 0;

  const discount = Math.round((subtotal * discountPercent) / 100);

  const total = subtotal - discount;

  async function handleSaveOrder() {
    if (isSaving || isLoading || errorMessage !== "") {
      return;
    }

    if (customerId === null) {
      Alert.alert("Data belum lengkap", "Pilih customer terlebih dahulu.");
      return;
    }

    if (kapsterId === null) {
      Alert.alert("Data belum lengkap", "Pilih kapster terlebih dahulu.");
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert("Data belum lengkap", "Pilih minimal satu layanan.");
      return;
    }

    const invalidItem = selectedItems.some(
      (item) =>
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        !services.some((service) => service.id === item.serviceId),
    );

    if (invalidItem) {
      Alert.alert("Data tidak valid", "Periksa kembali layanan dan jumlahnya.");
      return;
    }

    const payload = {
      customerId,
      kapsterId,
      items: selectedItems.map((item) => ({
        serviceId: item.serviceId,
        quantity: item.quantity,
      })),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    setIsSaving(true);

    try {
      const response = await api.post<CreateOrderResponse>("/order", payload);

      navigation.replace("OrderDetail", {
        orderId: response.data.data.id,
      });
    } catch (error) {
      let message = "Order belum berhasil disimpan.";

      if (
        axios.isAxiosError<{
          message?: string;
          errors?: { field: string; message: string }[];
        }>(error)
      ) {
        const responseData = error.response?.data;

        message =
          responseData?.errors?.map((item) => item.message).join("\n") ||
          responseData?.message ||
          "Respons server belum diterima. Periksa daftar order sebelum mencoba menyimpan lagi agar tidak membuat order ganda.";
      }

      Alert.alert("Periksa order", message);
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-6 pt-6 pb-10">
        <Text className="text-2xl font-bold text-gray-900">Buat order</Text>

        <Text className="mt-2 text-sm text-gray-600">
          Pilih customer, kapster, dan layanan untuk membuat order baru.
        </Text>

        {!isLoading && !errorMessage && (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Customer
            </Text>

            {customers.length === 0 ? (
              <Text className="text-sm text-gray-500">
                Belum ada customer. Tambahkan melalui tab Customer terlebih
                dahulu.
              </Text>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setCustomerSearch("");
                    setShowCustomerOptions((current) => !current);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showCustomerOptions }}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                >
                  <Text className="text-base text-gray-900">
                    {selectedCustomer?.name ?? "Pilih customer"}
                  </Text>

                  <Text className="mt-1 text-xs text-blue-600">
                    {showCustomerOptions
                      ? "Tutup pilihan"
                      : "Ketuk untuk memilih"}
                  </Text>
                </Pressable>

                {selectedCustomer && (
                  <View className="mt-3">
                    <Text className="text-sm text-gray-600">
                      {selectedCustomer.phone || "Nomor telepon belum diisi"}
                    </Text>

                    <Text className="mt-1 text-sm text-gray-600">
                      {selectedCustomer.membership?.isActive
                        ? `Member aktif · Diskon ${selectedCustomer.membership.discountPercent}%`
                        : "Tidak ada diskon membership aktif"}
                    </Text>
                  </View>
                )}

                {showCustomerOptions && (
                  <View className="mt-4">
                    <TextInput
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      editable={!isSaving}
                      placeholder="Cari nama atau nomor telepon..."
                      placeholderTextColor="#9ca3af"
                      accessibilityLabel="Cari customer untuk order"
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                    />

                    {filteredCustomers.length === 0 ? (
                      <Text className="text-sm text-gray-500">
                        Customer tidak ditemukan.
                      </Text>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <Pressable
                          key={customer.id}
                          onPress={() => {
                            setCustomerId(customer.id);
                            setShowCustomerOptions(false);
                            setCustomerSearch("");
                          }}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: customerId === customer.id,
                          }}
                          className={`mb-2 rounded-xl border p-3 ${
                            customerId === customer.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <Text className="font-semibold text-gray-900">
                            {customer.name}
                          </Text>

                          <Text className="mt-1 text-sm text-gray-600">
                            {customer.phone || "Nomor telepon belum diisi"}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {!isLoading && !errorMessage && (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-3 text-sm font-semibold text-gray-700">
              Kapster
            </Text>

            {kapsters.length === 0 ? (
              <Text className="text-sm text-gray-500">
                Belum ada kapster aktif. Aktifkan atau tambahkan kapster melalui
                menu Lainnya.
              </Text>
            ) : (
              kapsters.map((kapster) => (
                <Pressable
                  key={kapster.id}
                  onPress={() => setKapsterId(kapster.id)}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: kapsterId === kapster.id,
                  }}
                  className={`mb-2 rounded-xl border p-3 ${
                    kapsterId === kapster.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      kapsterId === kapster.id
                        ? "text-blue-700"
                        : "text-gray-900"
                    }`}
                  >
                    {kapster.name}
                  </Text>

                  {kapsterId === kapster.id && (
                    <Text className="mt-1 text-xs text-blue-600">Dipilih</Text>
                  )}
                </Pressable>
              ))
            )}

            {!isLoading && !errorMessage && (
              <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="mb-3 text-sm font-semibold text-gray-700">
                  Pilih layanan
                </Text>

                {services.length === 0 ? (
                  <Text className="text-sm text-gray-500">
                    Belum ada layanan aktif. Hubungi admin untuk menambahkan
                    atau mengaktifkan layanan.
                  </Text>
                ) : (
                  services.map((service) => {
                    const isSelected = selectedItems.some(
                      (item) => item.serviceId === service.id,
                    );

                    return (
                      <View
                        key={service.id}
                        className="mb-3 rounded-xl border border-gray-200 p-3"
                      >
                        <Text className="font-semibold text-gray-900">
                          {service.name}
                        </Text>

                        <Text className="mt-1 text-sm text-gray-600">
                          Rp {service.price.toLocaleString("id-ID")} ·{" "}
                          {service.duration} menit
                        </Text>

                        <Pressable
                          onPress={() => handleAddService(service.id)}
                          disabled={isSelected}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: isSelected }}
                          className={`mt-3 self-start rounded-lg px-4 py-2 ${
                            isSelected
                              ? "bg-gray-100"
                              : "bg-blue-50 active:opacity-80"
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              isSelected ? "text-gray-500" : "text-blue-700"
                            }`}
                          >
                            {isSelected ? "Sudah dipilih" : "+ Tambah"}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}

                <Text className="mt-2 text-sm text-gray-600">
                  {selectedItems.length} jenis layanan dipilih.
                </Text>
                {!isLoading && !errorMessage && selectedItems.length > 0 && (
                  <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <Text className="mb-3 text-base font-bold text-gray-900">
                      Layanan yang dipilih
                    </Text>

                    {selectedItems.map((item) => {
                      const service = services.find(
                        (service) => service.id === item.serviceId,
                      );

                      if (!service) {
                        return null;
                      }

                      const itemSubtotal = service.price * item.quantity;

                      return (
                        <View
                          key={item.serviceId}
                          className="mb-3 rounded-xl border border-gray-200 p-3"
                        >
                          <Text className="font-semibold text-gray-900">
                            {service.name}
                          </Text>

                          <Text className="mt-1 text-sm text-gray-600">
                            Harga satuan: Rp{" "}
                            {service.price.toLocaleString("id-ID")}
                          </Text>

                          <Text className="mt-1 text-sm text-gray-500">
                            Durasi per layanan: {service.duration} menit
                          </Text>

                          <View className="mt-3 flex-row items-center">
                            <Pressable
                              onPress={() =>
                                handleChangeQuantity(item.serviceId, -1)
                              }
                              disabled={item.quantity <= 1}
                              accessibilityRole="button"
                              accessibilityLabel={`Kurangi jumlah ${service.name}`}
                              className={`h-10 w-10 items-center justify-center rounded-lg bg-gray-100 ${
                                item.quantity <= 1
                                  ? "opacity-40"
                                  : "active:opacity-80"
                              }`}
                            >
                              <Text className="text-xl font-bold text-gray-700">
                                −
                              </Text>
                            </Pressable>

                            <Text className="mx-4 text-base font-semibold text-gray-900">
                              {item.quantity}
                            </Text>

                            <Pressable
                              onPress={() =>
                                handleChangeQuantity(item.serviceId, 1)
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Tambah jumlah ${service.name}`}
                              className="h-10 w-10 items-center justify-center rounded-lg bg-blue-50 active:opacity-80"
                            >
                              <Text className="text-xl font-bold text-blue-700">
                                +
                              </Text>
                            </Pressable>
                          </View>

                          <Text className="mt-3 font-semibold text-gray-900">
                            Subtotal: Rp {itemSubtotal.toLocaleString("id-ID")}
                          </Text>

                          <Pressable
                            onPress={() => handleRemoveService(item.serviceId)}
                            accessibilityRole="button"
                            accessibilityLabel={`Hapus ${service.name} dari order`}
                            className="mt-3 self-start rounded-lg bg-red-50 px-4 py-2 active:opacity-80"
                          >
                            <Text className="text-sm font-semibold text-red-700">
                              Hapus
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            {!isLoading && !errorMessage && (
              <>
                <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="mb-3 text-base font-bold text-gray-900">
                    Catatan (opsional)
                  </Text>

                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    editable={!isSaving}
                    multiline
                    textAlignVertical="top"
                    placeholder="Contoh: bagian samping jangan terlalu pendek."
                    placeholderTextColor="#9ca3af"
                    accessibilityLabel="Catatan order"
                    className="min-h-28 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>

                <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="mb-3 text-base font-bold text-gray-900">
                    Ringkasan order
                  </Text>

                  <Text className="text-sm text-gray-600">
                    Jenis layanan: {selectedItems.length}
                  </Text>

                  <Text className="mt-2 text-sm text-gray-600">
                    Total jumlah layanan: {totalQuantity}
                  </Text>

                  <Text className="mt-2 text-sm text-gray-600">
                    Estimasi durasi: {totalDuration} menit
                  </Text>

                  <View className="mt-4 border-t border-gray-200 pt-4">
                    <Text className="text-sm text-gray-700">
                      Subtotal: Rp {subtotal.toLocaleString("id-ID")}
                    </Text>

                    <Text className="mt-2 text-sm text-gray-700">
                      Diskon membership ({discountPercent}%): Rp{" "}
                      {discount.toLocaleString("id-ID")}
                    </Text>

                    <Text className="mt-3 text-lg font-bold text-blue-600">
                      Total: Rp {total.toLocaleString("id-ID")}
                    </Text>
                  </View>

                  <Text className="mt-3 text-xs text-gray-500">
                    Total akhir dihitung oleh server saat order disimpan.
                  </Text>

                  <Pressable
                    onPress={handleSaveOrder}
                    disabled={isSaving}
                    accessibilityRole="button"
                    className={`mt-4 items-center rounded-xl bg-blue-600 px-4 py-3 ${
                      isSaving ? "opacity-50" : "active:opacity-80"
                    }`}
                  >
                    <Text className="text-base font-semibold text-white">
                      {isSaving ? "Menyimpan..." : "Simpan order"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
        <View
          className="px-6 pt-6 pb-10"
          pointerEvents={isSaving ? "none" : "auto"}
        ></View>
      </View>
    </ScrollView>
  );
}
