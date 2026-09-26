import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      Alert.alert("Logout gagal", "Silakan coba lagi.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="px-6 pt-6 pb-10">
        <Text className="mb-4 text-2xl font-bold text-gray-900">Akun saya</Text>

        <View className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <Text className="text-lg font-bold text-gray-900">{user?.name}</Text>

          <Text className="mt-1 text-sm text-gray-600">{user?.email}</Text>

          <Text className="mt-3 text-sm font-semibold text-blue-600">
            {user?.role === "ADMIN" ? "Administrator" : "Staff"}
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole="button"
          className={`items-center rounded-xl bg-red-600 py-4 ${
            isLoggingOut ? "opacity-50" : "active:opacity-80"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {isLoggingOut ? "Keluar..." : "Logout"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
