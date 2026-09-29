import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "../lib/axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { OrderStackParamList } from "../navigation/OrderNavigator";

type ServiceStatus = "WAITING" | "IN_SERVICE" | "COMPLETED";
type PaymentStatus = "UNPAID" | "PAID";

interface OrderItem {
  id: number;
  serviceId: number | null;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  duration: number;
}

interface Order {
  id: number;
  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  total: number;
  checkInAt: string;
  customer: {
    id: number;
    name: string;
  };
  kapster: {
    id: number;
    name: string;
  };
  items: OrderItem[];
}

interface OrderResponse {
  message: string;
  data: Order[];
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

type ServiceFilter = ServiceStatus | "ALL";

const serviceFilterOptions: {
  value: ServiceFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Semua" },
  { value: "WAITING", label: "Menunggu" },
  { value: "IN_SERVICE", label: "Sedang dikerjakan" },
  { value: "COMPLETED", label: "Selesai" },
];

type PaymentFilter = PaymentStatus | "ALL";

const paymentFilterOptions: {
  value: PaymentFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Semua" },
  { value: "UNPAID", label: "Belum bayar" },
  { value: "PAID", label: "Lunas" },
];

type Props = NativeStackScreenProps<OrderStackParamList, "OrderList">;

export default function OrderScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadOrders() {
        setIsLoading(true);
        setErrorMessage("");

        try {
          const response = await api.get<OrderResponse>("/order", {
            params: {
              sortOrder: "desc",
            },
          });

          if (isActive) {
            setOrders(response.data.data);
          }
        } catch {
          if (isActive) {
            setErrorMessage("Gagal mengambil daftar order.");
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadOrders();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const keyword = search.trim().toLowerCase();

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.customer.name.toLowerCase().includes(keyword);

    const matchesService =
      serviceFilter === "ALL" || order.serviceStatus === serviceFilter;

    const matchesPayment =
      paymentFilter === "ALL" || order.paymentStatus === paymentFilter;

    return matchesSearch && matchesService && matchesPayment;
  });

  async function handleRefresh() {
    if (isLoading || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await api.get<OrderResponse>("/order", {
        params: {
          sortOrder: "desc",
        },
      });

      setOrders(response.data.data);
      setErrorMessage("");
    } catch {
      Alert.alert(
        "Gagal memuat ulang",
        "Daftar order belum berhasil diperbarui. Silakan coba lagi.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Order</Text>

        <Text className="mt-2 text-sm text-gray-600">
          Daftar order customer dan status pembayarannya.
        </Text>

        <Pressable
          onPress={() => navigation.navigate("CreateOrder")}
          accessibilityRole="button"
          className="mt-4 items-center rounded-xl bg-blue-600 px-4 py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">
            + Buat order
          </Text>
        </Pressable>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama customer..."
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Cari order berdasarkan nama customer"
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
        />

        <Text className="mt-4 mb-2 text-sm font-semibold text-gray-700">
          Status pembayaran
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {paymentFilterOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setPaymentFilter(option.value)}
              accessibilityRole="button"
              accessibilityState={{
                selected: paymentFilter === option.value,
              }}
              className={`rounded-full border px-3 py-2 ${
                paymentFilter === option.value
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-300 bg-white"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  paymentFilter === option.value
                    ? "text-white"
                    : "text-gray-600"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-4 mb-2 text-sm font-semibold text-gray-700">
          Status layanan
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {serviceFilterOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setServiceFilter(option.value)}
              accessibilityRole="button"
              accessibilityState={{
                selected: serviceFilter === option.value,
              }}
              className={`rounded-full border px-3 py-2 ${
                serviceFilter === option.value
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-300 bg-white"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  serviceFilter === option.value
                    ? "text-white"
                    : "text-gray-600"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {(search !== "" ||
          serviceFilter !== "ALL" ||
          paymentFilter !== "ALL") && (
          <Pressable
            onPress={() => {
              setSearch("");
              setServiceFilter("ALL");
              setPaymentFilter("ALL");
            }}
            accessibilityRole="button"
            className="mt-3 self-start rounded-lg border border-gray-300 bg-white px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-gray-700">
              Reset filter
            </Text>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <Text className="px-6 text-sm text-gray-600">Memuat order...</Text>
      )}

      {!isLoading && errorMessage !== "" && (
        <View className="mx-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}

      {!isLoading && !errorMessage && (
        <FlatList
          className="flex-1"
          data={filteredOrders}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View className="rounded-xl bg-white p-5">
              <Text className="text-center text-gray-500">
                {keyword || serviceFilter !== "ALL" || paymentFilter !== "ALL"
                  ? "Tidak ada order yang sesuai pencarian atau filter."
                  : "Belum ada order."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-5">
              <Text className="text-sm font-semibold text-blue-600">
                Order #{item.id}
              </Text>

              <Text className="mt-1 text-lg font-bold text-gray-900">
                {item.customer.name}
              </Text>

              <Text className="mt-1 text-sm text-gray-600">
                Kapster: {item.kapster.name}
              </Text>

              <Text className="mt-1 text-xs text-gray-500">
                Masuk:{" "}
                {new Date(item.checkInAt).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB
              </Text>

              <View className="mt-3 border-t border-gray-100 pt-3">
                {item.items.map((orderItem) => (
                  <Text
                    key={orderItem.id}
                    className="mb-1 text-sm text-gray-700"
                  >
                    {orderItem.serviceName} × {orderItem.quantity}
                  </Text>
                ))}
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                <View
                  className={`rounded-full px-3 py-1 ${
                    item.serviceStatus === "WAITING"
                      ? "bg-amber-100"
                      : item.serviceStatus === "IN_SERVICE"
                        ? "bg-blue-100"
                        : "bg-green-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      item.serviceStatus === "WAITING"
                        ? "text-amber-700"
                        : item.serviceStatus === "IN_SERVICE"
                          ? "text-blue-700"
                          : "text-green-700"
                    }`}
                  >
                    {serviceStatusLabels[item.serviceStatus]}
                  </Text>
                </View>

                <View
                  className={`rounded-full px-3 py-1 ${
                    item.paymentStatus === "PAID"
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      item.paymentStatus === "PAID"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {paymentStatusLabels[item.paymentStatus]}
                  </Text>
                </View>
              </View>

              <Text className="mt-4 text-lg font-bold text-gray-900">
                Rp {item.total.toLocaleString("id-ID")}
              </Text>

              <Pressable
                onPress={() =>
                  navigation.navigate("OrderDetail", {
                    orderId: item.id,
                  })
                }
                accessibilityRole="button"
                className="mt-4 items-center rounded-xl bg-blue-50 py-3 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-blue-700">
                  Detail
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
