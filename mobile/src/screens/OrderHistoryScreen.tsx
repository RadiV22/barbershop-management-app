import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import api from "../lib/axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "../navigation/MoreNavigator";

interface HistoryOrder {
  id: number;
  total: number;
  completedAt: string | null;
  customer: {
    id: number;
    name: string;
  };
  kapster: {
    id: number;
    name: string;
  };
}

interface OrderHistoryResponse {
  message: string;
  data: HistoryOrder[];
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

type Props = NativeStackScreenProps<MoreStackParamList, "OrderHistory">;

export default function OrderHistoryScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedDates, setAppliedDates] = useState({
    startDate: "",
    endDate: "",
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadHistory() {
        setIsLoading(true);
        setErrorMessage("");

        try {
          const response = await api.get<OrderHistoryResponse>(
            "/order/history",
            {
              params: {
                ...(appliedDates.startDate
                  ? { startDate: appliedDates.startDate }
                  : {}),
                ...(appliedDates.endDate
                  ? { endDate: appliedDates.endDate }
                  : {}),
              },
            },
          );

          if (isActive) {
            setOrders(response.data.data);
          }
        } catch {
          if (isActive) {
            setErrorMessage("Gagal mengambil riwayat order.");
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadHistory();

      return () => {
        isActive = false;
      };
    }, [appliedDates]),
  );

  const keyword = search.trim().toLowerCase();

  const filteredOrders = orders.filter((order) =>
    order.customer.name.toLowerCase().includes(keyword),
  );

  function handleApplyDates() {
    if (isLoading) return;

    const start = startDate.trim();
    const end = endDate.trim();

    if (
      (start !== "" && !isValidDate(start)) ||
      (end !== "" && !isValidDate(end))
    ) {
      Alert.alert(
        "Tanggal tidak valid",
        "Gunakan tanggal yang valid dengan format YYYY-MM-DD.",
      );
      return;
    }

    if (start !== "" && end !== "" && start > end) {
      Alert.alert(
        "Rentang tanggal tidak valid",
        "Tanggal awal tidak boleh melewati tanggal akhir.",
      );
      return;
    }

    setAppliedDates({
      startDate: start,
      endDate: end,
    });
  }

  function handleResetFilters() {
    if (isLoading) return;

    setSearch("");
    setStartDate("");
    setEndDate("");

    setAppliedDates({
      startDate: "",
      endDate: "",
    });
  }
  return (
    <View className="flex-1 bg-gray-100">
      {/* Judul, pencarian, dan filter tanggal */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Riwayat order</Text>

        <Text className="mt-2 text-sm text-gray-600">
          Order yang sudah selesai dilayani dan lunas.
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama customer..."
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Cari riwayat berdasarkan nama customer"
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
        />

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Dari tanggal
            </Text>

            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Tanggal awal selesai order"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={10}
              className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
            />
          </View>

          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Sampai tanggal
            </Text>

            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Tanggal akhir selesai order"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={10}
              className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
            />
          </View>
        </View>

        <Text className="mt-2 text-xs text-gray-500">
          Berdasarkan tanggal layanan selesai dalam WIB. Contoh: 2026-09-29.
        </Text>

        <View className="mt-3 flex-row gap-3">
          <Pressable
            onPress={handleApplyDates}
            disabled={isLoading}
            accessibilityRole="button"
            className={`flex-1 items-center rounded-xl bg-blue-600 py-3 ${
              isLoading ? "opacity-50" : "active:opacity-80"
            }`}
          >
            <Text className="font-semibold text-white">Terapkan</Text>
          </Pressable>

          <Pressable
            onPress={handleResetFilters}
            disabled={isLoading}
            accessibilityRole="button"
            className={`flex-1 items-center rounded-xl border border-gray-300 bg-white py-3 ${
              isLoading ? "opacity-50" : "active:opacity-80"
            }`}
          >
            <Text className="font-semibold text-gray-700">Reset filter</Text>
          </Pressable>
        </View>
      </View>

      {isLoading && (
        <Text className="px-6 text-sm text-gray-600">
          Memuat riwayat order...
        </Text>
      )}

      {!isLoading && errorMessage !== "" && (
        <View className="mx-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}

      {/* Daftar kartu order */}
      {!isLoading && !errorMessage && (
        <FlatList
          className="flex-1"
          data={filteredOrders}
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
                {keyword
                  ? "Tidak ada riwayat untuk customer tersebut."
                  : "Belum ada order yang selesai dan lunas."}
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

              <Text className="mt-2 text-xs text-gray-500">
                Selesai:{" "}
                {item.completedAt
                  ? `${new Date(item.completedAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })} WIB`
                  : "Waktu selesai tidak tercatat"}
              </Text>

              <View className="mt-3 self-start rounded-full bg-green-100 px-3 py-1">
                <Text className="text-xs font-semibold text-green-700">
                  Selesai · Lunas
                </Text>
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
                accessibilityLabel={`Lihat detail order ${item.id}`}
                className="mt-3 self-start rounded-lg bg-blue-50 px-4 py-2 active:opacity-80"
              >
                <Text className="font-semibold text-blue-700">Detail</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
