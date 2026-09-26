import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import api from "../lib/axios";

interface DashboardSummary {
  date: string;
  timezone: string;
  ordersToday: number;
  waitingOrders: number;
  inServiceOrders: number;
  revenueToday: number;
}

interface DashboardResponse {
  message: string;
  data: DashboardSummary;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      try {
        const response = await api.get<DashboardResponse>("/dashboard/summary");

        if (isActive) {
          setSummary(response.data.data);
          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage("Gagal mengambil ringkasan dashboard.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleRefresh() {
    if (isRefreshing || isLoading) return;

    setIsRefreshing(true);

    try {
      const response = await api.get<DashboardResponse>("/dashboard/summary");

      setSummary(response.data.data);
      setErrorMessage("");
    } catch {
      Alert.alert(
        "Gagal memperbarui",
        "Ringkasan belum berhasil diperbarui. Silakan coba lagi.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={["#2563eb"]}
          enabled={!isLoading}
        />
      }
    >
      <View className="px-6 pt-6 pb-10">
        <Text className="text-2xl font-bold text-gray-900">
          Halo, {user?.name}
        </Text>

        <Text className="mt-1 text-sm text-gray-500">
          {user?.role === "ADMIN" ? "Administrator" : "Staff"}
        </Text>

        {summary && (
          <Text className="mt-3 text-sm text-gray-600">
            {new Date(`${summary.date}T12:00:00+07:00`).toLocaleDateString(
              "id-ID",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: summary.timezone,
              },
            )}
          </Text>
        )}

        {isLoading && (
          <View className="mb-6 rounded-xl bg-white p-5">
            <Text className="text-sm text-gray-600">Memuat ringkasan...</Text>
          </View>
        )}

        {!isLoading && errorMessage !== "" && (
          <View className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm text-red-700">{errorMessage}</Text>
          </View>
        )}

        {!isLoading && !errorMessage && summary && (
          <View className="mb-6">
            <View className="mb-3 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="mb-3 text-sm text-gray-500">
                  Order hari ini
                </Text>

                <Text className="text-3xl font-bold text-gray-900">
                  {summary.ordersToday}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="mb-3 text-sm text-gray-500">
                  Menunggu layanan
                </Text>

                <Text className="text-3xl font-bold text-amber-600">
                  {summary.waitingOrders}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="mb-3 text-sm text-gray-500">
                  Sedang dikerjakan
                </Text>

                <Text className="text-3xl font-bold text-blue-600">
                  {summary.inServiceOrders}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="mb-3 text-sm text-gray-500">
                  Pendapatan hari ini
                </Text>

                <Text className="text-sm font-medium text-green-700">Rp</Text>

                <Text className="text-xl font-bold text-green-700">
                  {summary.revenueToday.toLocaleString("id-ID")}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="mb-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">
            Akses cepat
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                "Buat order",
                "Tombol ini akan membuka formulir order setelah halamannya dibuat.",
              )
            }
            className="mb-3 items-center rounded-xl bg-blue-600 px-4 py-4 active:opacity-80"
          >
            <Text className="text-base font-bold text-white">+ Buat order</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                "Lihat antrean",
                "Tombol ini akan membuka daftar order dengan filter Menunggu.",
              )
            }
            className="items-center rounded-xl border border-blue-600 bg-white px-4 py-4 active:opacity-80"
          >
            <Text className="text-base font-bold text-blue-600">
              Lihat antrean
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
