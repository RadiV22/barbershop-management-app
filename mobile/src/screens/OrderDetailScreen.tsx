import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { OrderStackParamList } from "../navigation/OrderNavigator";
import { useEffect, useState } from "react";
import api from "../lib/axios";
import axios from "axios";

type ServiceStatus = "WAITING" | "IN_SERVICE" | "COMPLETED";
type PaymentStatus = "UNPAID" | "PAID";
type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "CARD" | "OTHER";

interface PersonSummary {
  id: number;
  name: string;
}

interface OrderItem {
  id: number;
  serviceId: number | null;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  duration: number;
}

interface OrderPayment {
  id: number;
  amount: number;
  method: PaymentMethod;
  amountReceived: number;
  change: number;
  paidAt: string;
  receivedBy: PersonSummary | null;
}

interface OrderStatusHistory {
  id: number;
  fromStatus: ServiceStatus | null;
  toStatus: ServiceStatus;
  changedAt: string;
  changedBy: PersonSummary | null;
}

interface OrderDetail {
  id: number;
  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
  notes: string | null;
  checkInAt: string;
  completedAt: string | null;
  customer: PersonSummary;
  kapster: PersonSummary;
  items: OrderItem[];
  createdBy: PersonSummary | null;
  payment: OrderPayment | null;
  statusHistories: OrderStatusHistory[];
}

interface OrderDetailResponse {
  message: string;
  data: OrderDetail;
}

interface CreatePaymentResponse {
  message: string;
  data: OrderPayment;
}

const serviceStatusLabels: Record<ServiceStatus, string> = {
  WAITING: "Menunggu",
  IN_SERVICE: "Sedang dikerjakan",
  COMPLETED: "Selesai",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Belum bayar",
  PAID: "Lunas",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  CARD: "Kartu",
  OTHER: "Lainnya",
};

const paymentMethodOptions: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "CASH", label: "Tunai" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "QRIS", label: "QRIS" },
  { value: "CARD", label: "Kartu" },
  { value: "OTHER", label: "Lainnya" },
];

type Props = Pick<
  NativeStackScreenProps<OrderStackParamList, "OrderDetail">,
  "route"
>;

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const cashInput = amountReceived.trim();
  const cashAmount = Number(cashInput);
  const isCashAmountValid =
    /^\d+$/.test(cashInput) &&
    Number.isSafeInteger(cashAmount) &&
    cashAmount >= 0;
  const cashDifference =
    order && isCashAmountValid ? cashAmount - order.total : null;

  useEffect(() => {
    let isActive = true;

    async function loadOrderDetail() {
      setIsLoading(true);
      setErrorMessage("");
      setOrder(null);

      try {
        const response = await api.get<OrderDetailResponse>(
          `/order/${orderId}`,
        );

        if (isActive) {
          setOrder(response.data.data);
        }
      } catch {
        if (isActive) {
          setErrorMessage("Gagal mengambil detail order.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOrderDetail();

    return () => {
      isActive = false;
    };
  }, [orderId]);

  async function handleUpdateStatus() {
    if (!order || isLoading || isUpdatingStatus || isSavingPayment) {
      return;
    }

    if (order.serviceStatus === "COMPLETED") {
      return;
    }

    const nextStatus: ServiceStatus =
      order.serviceStatus === "WAITING" ? "IN_SERVICE" : "COMPLETED";

    setIsUpdatingStatus(true);

    try {
      const response = await api.patch<{
        message: string;
        data: {
          serviceStatus: ServiceStatus;
          completedAt: string | null;
        };
      }>(`/order/${orderId}/status`, {
        serviceStatus: nextStatus,
      });

      // Perbarui status tanpa menghilangkan data detail lainnya.
      const updatedOrder = response.data.data;

      setOrder((current) =>
        current
          ? {
              ...current,
              serviceStatus: updatedOrder.serviceStatus,
              completedAt: updatedOrder.completedAt,
            }
          : current,
      );

      try {
        // Ambil detail lengkap, termasuk riwayat status terbaru.
        const detailResponse = await api.get<OrderDetailResponse>(
          `/order/${orderId}`,
        );

        setOrder(detailResponse.data.data);

        Alert.alert("Berhasil", response.data.message);
      } catch {
        Alert.alert(
          "Status sudah diperbarui",
          "Namun rincian terbaru belum berhasil dimuat. Kembali ke daftar order, lalu buka detail ini lagi.",
        );
      }
    } catch (error) {
      let message = "Status order belum berhasil diperbarui.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal mengubah status", message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleSavePayment() {
    if (!order || isLoading || isSavingPayment || isUpdatingStatus) {
      return;
    }

    if (order.paymentStatus === "PAID" || order.payment) {
      Alert.alert("Sudah lunas", "Pembayaran order ini sudah tercatat.");
      return;
    }

    const input = amountReceived.trim();
    const cashReceived = Number(input);

    if (paymentMethod === "CASH") {
      if (
        !/^\d+$/.test(input) ||
        !Number.isSafeInteger(cashReceived) ||
        cashReceived < 0
      ) {
        Alert.alert(
          "Nominal tidak valid",
          "Masukkan uang diterima berupa angka bulat tanpa titik atau koma.",
        );
        return;
      }

      if (cashReceived < order.total) {
        Alert.alert(
          "Uang belum cukup",
          "Uang diterima kurang dari total tagihan.",
        );
        return;
      }
    }

    const received = paymentMethod === "CASH" ? cashReceived : order.total;

    setIsSavingPayment(true);

    try {
      const response = await api.post<CreatePaymentResponse>(
        `/order/${orderId}/payment`,
        {
          method: paymentMethod,
          amountReceived: received,
        },
      );

      const payment = response.data.data;

      // Gunakan data pembayaran yang sudah disimpan oleh backend.
      setOrder((current) =>
        current
          ? {
              ...current,
              paymentStatus: "PAID",
              payment,
            }
          : current,
      );

      setShowPaymentForm(false);
      setAmountReceived("");
      setPaymentMethod("CASH");

      Alert.alert("Berhasil", response.data.message);
    } catch (error) {
      let message = "Pembayaran belum berhasil dicatat.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message =
          error.response?.data?.message ??
          "Respons server belum diterima. Buka ulang detail order untuk memeriksa apakah pembayaran sudah tercatat sebelum mencoba lagi.";
      }

      Alert.alert("Periksa pembayaran", message);
    } finally {
      setIsSavingPayment(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-6 pt-6 pb-10">
        <Text className="text-2xl font-bold text-gray-900">
          Order #{orderId}
        </Text>

        <Text className="mt-2 text-sm text-gray-600">
          Rincian layanan, status pengerjaan, dan pembayaran order.
        </Text>

        {isLoading && (
          <Text className="mt-4 text-sm text-gray-600">
            Memuat detail order...
          </Text>
        )}

        {!isLoading && errorMessage !== "" && (
          <Text className="mt-4 text-sm text-red-700">{errorMessage}</Text>
        )}

        {!isLoading && !errorMessage && order && (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
            <Text className="text-lg font-bold text-gray-900">
              {order.customer.name}
            </Text>

            <Text className="mt-2 text-sm text-gray-600">
              Kapster: {order.kapster.name}
            </Text>

            <View className="mt-3">
              <Text className="text-sm font-semibold text-gray-700">
                Status layanan: {serviceStatusLabels[order.serviceStatus]}
              </Text>

              <Text
                className={`mt-2 text-sm font-semibold ${
                  order.paymentStatus === "PAID"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                Pembayaran: {paymentStatusLabels[order.paymentStatus]}
              </Text>

              <Text className="mt-2 text-xs text-gray-500">
                Masuk:{" "}
                {new Date(order.checkInAt).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB
              </Text>

              {order.serviceStatus !== "COMPLETED" && (
                <Pressable
                  onPress={handleUpdateStatus}
                  disabled={isUpdatingStatus || isSavingPayment}
                  accessibilityRole="button"
                  className={`mt-4 items-center rounded-xl bg-blue-600 px-4 py-3 ${
                    isUpdatingStatus ? "opacity-50" : "active:opacity-80"
                  }`}
                >
                  <Text className="text-base font-semibold text-white">
                    {isUpdatingStatus
                      ? "Memperbarui..."
                      : order.serviceStatus === "WAITING"
                        ? "Mulai layanan"
                        : "Selesaikan layanan"}
                  </Text>
                </Pressable>
              )}
            </View>

            <View className="mt-4 border-t border-gray-200 pt-4">
              <Text className="mb-3 text-base font-bold text-gray-900">
                Rincian layanan
              </Text>

              {order.items.map((item) => (
                <View
                  key={item.id}
                  className="mb-3 border-b border-gray-100 pb-3"
                >
                  <Text className="font-semibold text-gray-900">
                    {item.serviceName}
                  </Text>

                  <Text className="mt-1 text-sm text-gray-600">
                    {item.quantity} × Rp{" "}
                    {item.unitPrice.toLocaleString("id-ID")}
                  </Text>

                  <Text className="mt-1 text-sm text-gray-500">
                    Durasi per layanan: {item.duration} menit
                  </Text>

                  <Text className="mt-2 font-semibold text-gray-900">
                    Subtotal: Rp{" "}
                    {(item.quantity * item.unitPrice).toLocaleString("id-ID")}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-2">
              <Text className="text-sm text-gray-600">
                Subtotal order: Rp {order.subtotal.toLocaleString("id-ID")}
              </Text>

              <Text className="mt-2 text-sm text-gray-600">
                Diskon ({order.discountPercent}%): Rp{" "}
                {order.discount.toLocaleString("id-ID")}
              </Text>

              <Text className="mt-3 text-lg font-bold text-blue-600">
                Total: Rp {order.total.toLocaleString("id-ID")}
              </Text>
            </View>

            <View className="mt-4 border-t border-gray-200 pt-4">
              <Text className="font-semibold text-gray-900">Catatan</Text>

              <Text className="mt-2 text-sm text-gray-600">
                {order.notes?.trim() || "Tidak ada catatan."}
              </Text>
            </View>

            {order.paymentStatus === "UNPAID" && !order.payment && (
              <View className="mt-4 border-t border-gray-200 pt-4">
                <Pressable
                  onPress={() => {
                    setPaymentMethod("CASH");
                    setAmountReceived("");
                    setShowPaymentForm((current) => !current);
                  }}
                  disabled={isSavingPayment || isUpdatingStatus}
                  accessibilityRole="button"
                  className={`items-center rounded-xl bg-green-600 px-4 py-3 ${
                    isSavingPayment || isUpdatingStatus
                      ? "opacity-50"
                      : "active:opacity-80"
                  }`}
                >
                  <Text className="text-base font-semibold text-white">
                    {showPaymentForm ? "Tutup form pembayaran" : "Bayar order"}
                  </Text>
                </Pressable>

                {showPaymentForm && (
                  <View className="mt-4 rounded-xl border border-gray-200 p-4">
                    <Text className="text-lg font-bold text-gray-900">
                      Pembayaran order
                    </Text>

                    <Text className="mt-2 text-base font-semibold text-blue-600">
                      Total tagihan: Rp {order.total.toLocaleString("id-ID")}
                    </Text>

                    <Text className="mt-4 mb-2 text-sm font-semibold text-gray-700">
                      Metode pembayaran
                    </Text>

                    <View className="flex-row flex-wrap gap-2">
                      {paymentMethodOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => setPaymentMethod(option.value)}
                          disabled={isSavingPayment || isUpdatingStatus}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: paymentMethod === option.value,
                          }}
                          className={`rounded-lg border px-3 py-2 ${
                            paymentMethod === option.value
                              ? "border-blue-600 bg-blue-600"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              paymentMethod === option.value
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {paymentMethod === "CASH" ? (
                      <View className="mt-4">
                        <Text className="mb-2 text-sm font-semibold text-gray-700">
                          Uang diterima
                        </Text>

                        <TextInput
                          value={amountReceived}
                          onChangeText={setAmountReceived}
                          editable={!isSavingPayment && !isUpdatingStatus}
                          keyboardType="number-pad"
                          placeholder="Contoh: 100000"
                          placeholderTextColor="#9ca3af"
                          accessibilityLabel="Uang tunai diterima"
                          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
                        />

                        {cashInput !== "" && (
                          <View className="mt-3">
                            {cashDifference === null ? (
                              <Text className="text-sm text-red-700">
                                Masukkan nominal berupa angka bulat yang valid.
                              </Text>
                            ) : cashDifference < 0 ? (
                              <Text className="text-sm font-semibold text-red-700">
                                Uang kurang: Rp{" "}
                                {Math.abs(cashDifference).toLocaleString(
                                  "id-ID",
                                )}
                              </Text>
                            ) : (
                              <Text className="text-sm font-semibold text-green-700">
                                Kembalian: Rp{" "}
                                {cashDifference.toLocaleString("id-ID")}
                              </Text>
                            )}
                          </View>
                        )}

                        <Text className="mt-2 text-xs text-gray-500">
                          Masukkan nominal tanpa titik atau koma.
                        </Text>
                      </View>
                    ) : (
                      <Text className="mt-4 text-sm text-gray-600">
                        Nominal pembayaran non-tunai mengikuti total tagihan: Rp{" "}
                        {order.total.toLocaleString("id-ID")}.
                      </Text>
                    )}

                    <Text className="mt-4 text-xs text-gray-500">
                      Simpan setelah pembayaran benar-benar diterima.
                    </Text>

                    <Pressable
                      onPress={handleSavePayment}
                      disabled={isSavingPayment || isUpdatingStatus}
                      accessibilityRole="button"
                      className={`mt-3 items-center rounded-xl bg-green-600 px-4 py-3 ${
                        isSavingPayment || isUpdatingStatus
                          ? "opacity-50"
                          : "active:opacity-80"
                      }`}
                    >
                      <Text className="text-base font-semibold text-white">
                        {isSavingPayment ? "Menyimpan..." : "Simpan pembayaran"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <View className="mt-4 border-t border-gray-200 pt-4">
              <Text className="mb-3 text-base font-bold text-gray-900">
                Rincian pembayaran
              </Text>

              {order.payment ? (
                <View>
                  <Text className="text-sm text-gray-700">
                    Metode: {paymentMethodLabels[order.payment.method]}
                  </Text>

                  <Text className="mt-2 text-sm text-gray-700">
                    Jumlah pembayaran: Rp{" "}
                    {order.payment.amount.toLocaleString("id-ID")}
                  </Text>

                  <Text className="mt-2 text-sm text-gray-700">
                    Uang diterima: Rp{" "}
                    {order.payment.amountReceived.toLocaleString("id-ID")}
                  </Text>

                  <Text className="mt-2 text-sm font-semibold text-green-700">
                    Kembalian: Rp {order.payment.change.toLocaleString("id-ID")}
                  </Text>

                  <Text className="mt-2 text-sm text-gray-700">
                    Diterima oleh:{" "}
                    {order.payment.receivedBy?.name ?? "Tidak tercatat"}
                  </Text>

                  <Text className="mt-2 text-xs text-gray-500">
                    Dibayar:{" "}
                    {new Date(order.payment.paidAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })}{" "}
                    WIB
                  </Text>
                </View>
              ) : (
                <Text className="text-sm text-gray-500">
                  Belum ada data pembayaran.
                </Text>
              )}
            </View>
            <View className="mt-4 border-t border-gray-200 pt-4">
              <Text className="mb-3 text-base font-bold text-gray-900">
                Riwayat status layanan
              </Text>

              {order.statusHistories.length === 0 ? (
                <Text className="text-sm text-gray-500">
                  Belum ada riwayat status.
                </Text>
              ) : (
                [...order.statusHistories]
                  .sort(
                    (a, b) =>
                      new Date(a.changedAt).getTime() -
                        new Date(b.changedAt).getTime() || a.id - b.id,
                  )
                  .map((history) => (
                    <View
                      key={history.id}
                      className="mb-3 rounded-xl bg-gray-50 p-3"
                    >
                      <Text className="text-sm font-semibold text-gray-900">
                        {history.fromStatus === null
                          ? `Order dibuat · ${serviceStatusLabels[history.toStatus]}`
                          : `${serviceStatusLabels[history.fromStatus]} → ${
                              serviceStatusLabels[history.toStatus]
                            }`}
                      </Text>

                      <Text className="mt-1 text-sm text-gray-600">
                        Oleh: {history.changedBy?.name ?? "Tidak tercatat"}
                      </Text>

                      <Text className="mt-1 text-xs text-gray-500">
                        {new Date(history.changedAt).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                        })}{" "}
                        WIB
                      </Text>
                    </View>
                  ))
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
