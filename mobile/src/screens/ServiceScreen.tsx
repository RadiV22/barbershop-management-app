import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import api from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";

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

interface CreateServiceResponse {
  message: string;
  data: Service;
}

export default function ServiceScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadServices() {
      try {
        const response = await api.get<ServiceResponse>("/services");

        if (isActive) {
          setServices(response.data.data);
          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage("Gagal mengambil daftar layanan.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      isActive = false;
    };
  }, []);

  function handleEditService(service: Service) {
    if (
      isSaving ||
      isLoading ||
      isRefreshing ||
      updatingStatusId !== null ||
      deletingServiceId !== null ||
      !isAdmin
    ) {
      return;
    }

    setEditingServiceId(service.id);
    setName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration));
    setShowForm(true);
  }

  async function handleSaveService() {
    if (
      isSaving ||
      isLoading ||
      isRefreshing ||
      updatingStatusId !== null ||
      deletingServiceId !== null ||
      !isAdmin
    ) {
      return;
    }

    if (!name.trim()) {
      Alert.alert("Data belum lengkap", "Nama layanan wajib diisi.");
      return;
    }

    const priceNumber = Number(price);
    const durationNumber = Number(duration);

    if (
      !price.trim() ||
      !Number.isSafeInteger(priceNumber) ||
      priceNumber < 0 ||
      priceNumber > 2147483647
    ) {
      Alert.alert(
        "Harga tidak valid",
        "Isi harga dengan angka bulat antara 0 dan 2147483647, tanpa titik atau koma.",
      );
      return;
    }

    if (
      !duration.trim() ||
      !Number.isSafeInteger(durationNumber) ||
      durationNumber <= 0 ||
      durationNumber > 2147483647
    ) {
      Alert.alert(
        "Durasi tidak valid",
        "Isi durasi dengan angka bulat positif dalam menit.",
      );
      return;
    }

    const isEditing = editingServiceId !== null;

    const payload = {
      name: name.trim(),
      price: priceNumber,
      duration: durationNumber,
    };

    setIsSaving(true);

    try {
      if (isEditing) {
        const response = await api.put<CreateServiceResponse>(
          `/services/${editingServiceId}`,
          payload,
        );

        const updatedService = response.data.data;

        setServices((current) =>
          current.map((service) =>
            service.id === editingServiceId ? updatedService : service,
          ),
        );
      } else {
        const response = await api.post<CreateServiceResponse>(
          "/services",
          payload,
        );

        setServices((current) => [...current, response.data.data]);
      }

      setName("");
      setPrice("");
      setDuration("");
      setEditingServiceId(null);
      setShowForm(false);

      Alert.alert(
        "Berhasil",
        isEditing
          ? "Layanan berhasil diperbarui."
          : "Layanan berhasil ditambahkan.",
      );
    } catch (error) {
      let message = "Layanan belum berhasil disimpan. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menyimpan", message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleServiceStatus(service: Service) {
    if (
      isSaving ||
      isLoading ||
      isRefreshing ||
      updatingStatusId !== null ||
      deletingServiceId !== null ||
      !isAdmin
    ) {
      return;
    }
    const nextStatus = !service.isActive;

    setUpdatingStatusId(service.id);

    try {
      const response = await api.put<CreateServiceResponse>(
        `/services/${service.id}`,
        { isActive: nextStatus },
      );

      const updatedService = response.data.data;

      setServices((current) =>
        current.map((item) => (item.id === service.id ? updatedService : item)),
      );

      Alert.alert(
        "Berhasil",
        updatedService.isActive
          ? "Layanan berhasil diaktifkan."
          : "Layanan berhasil dinonaktifkan.",
      );
    } catch (error) {
      let message = "Status layanan belum berhasil diubah.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal mengubah status", message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDeleteService(serviceId: number) {
    if (
      isSaving ||
      isLoading ||
      isRefreshing ||
      updatingStatusId !== null ||
      deletingServiceId !== null ||
      !isAdmin
    ) {
      return;
    }

    setDeletingServiceId(serviceId);

    try {
      await api.delete(`/services/${serviceId}`);

      setServices((current) =>
        current.filter((service) => service.id !== serviceId),
      );

      if (editingServiceId === serviceId) {
        setEditingServiceId(null);
        setName("");
        setPrice("");
        setDuration("");
        setShowForm(false);
      }

      Alert.alert("Berhasil", "Layanan berhasil dihapus.");
    } catch (error) {
      let message = "Layanan belum berhasil dihapus. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menghapus", message);
    } finally {
      setDeletingServiceId(null);
    }
  }

  function confirmDeleteService(service: Service) {
    if (
      isSaving ||
      isLoading ||
      isRefreshing ||
      updatingStatusId !== null ||
      deletingServiceId !== null ||
      !isAdmin
    ) {
      return;
    }

    Alert.alert("Hapus layanan", `Hapus layanan "${service.name}"?`, [
      {
        text: "Batal",
        style: "cancel",
      },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          void handleDeleteService(service.id);
        },
      },
    ]);
  }

  async function handleRefresh() {
    if (
      isLoading ||
      isRefreshing ||
      isSaving ||
      updatingStatusId !== null ||
      deletingServiceId !== null
    ) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await api.get<ServiceResponse>("/services");

      setServices(response.data.data);
      setErrorMessage("");
    } catch {
      Alert.alert(
        "Gagal memuat ulang",
        "Daftar layanan belum berhasil diperbarui. Silakan coba lagi.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Layanan</Text>

        <Text className="mt-2 text-sm text-gray-600">
          Daftar layanan yang tersedia di barbershop.
        </Text>

        {isAdmin && (
          <Pressable
            onPress={() => {
              setEditingServiceId(null);
              setName("");
              setPrice("");
              setDuration("");
              setShowForm((current) => !current);
            }}
            disabled={isSaving || isRefreshing || updatingStatusId !== null}
            accessibilityRole="button"
            className="mt-4 items-center rounded-xl bg-blue-600 py-3 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">
              {showForm ? "Tutup form" : "+ Tambah layanan"}
            </Text>
          </Pressable>
        )}

        {isAdmin && showForm && (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-4 text-lg font-bold text-gray-900">
              {editingServiceId !== null ? "Edit layanan" : "Tambah layanan"}
            </Text>

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Nama layanan
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              editable={
                !isSaving &&
                updatingStatusId === null &&
                deletingServiceId === null
              }
              placeholder="Contoh: Haircut"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Nama layanan"
              autoCapitalize="words"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            />

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Harga (Rp)
            </Text>

            <TextInput
              value={price}
              onChangeText={setPrice}
              editable={
                !isSaving &&
                updatingStatusId === null &&
                deletingServiceId === null
              }
              placeholder="Contoh: 35000"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Harga layanan"
              keyboardType="number-pad"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            />

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Durasi (menit)
            </Text>

            <TextInput
              value={duration}
              onChangeText={setDuration}
              editable={
                !isSaving &&
                updatingStatusId === null &&
                deletingServiceId === null
              }
              placeholder="Contoh: 30"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Durasi layanan"
              keyboardType="number-pad"
              className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            />

            <Pressable
              onPress={handleSaveService}
              disabled={isSaving || isLoading || updatingStatusId !== null}
              accessibilityRole="button"
              className={`mt-4 items-center rounded-xl bg-blue-600 py-3 ${
                isSaving || isLoading ? "opacity-50" : "active:opacity-80"
              }`}
            >
              <Text className="text-base font-semibold text-white">
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {isLoading && (
        <Text className="px-6 text-sm text-gray-600">Memuat layanan...</Text>
      )}

      {!isLoading && errorMessage !== "" && (
        <View className="mx-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}

      {!isLoading && !errorMessage && (
        <FlatList
          className="flex-1"
          data={services}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View className="rounded-xl bg-white p-5">
              <Text className="text-center text-gray-500">
                Belum ada layanan.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-5">
              <Text className="text-lg font-bold text-gray-900">
                {item.name}
              </Text>

              <Text className="mt-2 text-base font-semibold text-blue-600">
                Rp {item.price.toLocaleString("id-ID")}
              </Text>

              <Text className="mt-1 text-sm text-gray-600">
                Durasi: {item.duration} menit
              </Text>

              <View
                className={`mt-3 self-start rounded-full px-3 py-1 ${
                  item.isActive ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    item.isActive ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {item.isActive ? "Aktif" : "Nonaktif"}
                </Text>
              </View>

              {isAdmin && (
                <Pressable
                  onPress={() => confirmDeleteService(item)}
                  disabled={
                    isSaving ||
                    updatingStatusId !== null ||
                    deletingServiceId !== null
                  }
                  accessibilityRole="button"
                  className={`mt-2 self-start rounded-lg bg-red-50 px-4 py-2 ${
                    isSaving ||
                    updatingStatusId !== null ||
                    deletingServiceId !== null
                      ? "opacity-50"
                      : "active:opacity-80"
                  }`}
                >
                  <Text className="font-semibold text-red-700">
                    {deletingServiceId === item.id ? "Menghapus..." : "Hapus"}
                  </Text>
                </Pressable>
              )}

              {isAdmin && (
                <Pressable
                  onPress={() => handleEditService(item)}
                  disabled={isSaving || updatingStatusId !== null}
                  accessibilityRole="button"
                  className="mt-4 self-start rounded-lg bg-blue-50 px-4 py-2 active:opacity-80"
                >
                  <Text className="font-semibold text-blue-700">Edit</Text>
                </Pressable>
              )}

              {isAdmin && (
                <Pressable
                  onPress={() => handleToggleServiceStatus(item)}
                  disabled={isSaving || updatingStatusId !== null}
                  accessibilityRole="button"
                  className={`mt-2 self-start rounded-lg px-4 py-2 ${
                    item.isActive ? "bg-amber-50" : "bg-green-50"
                  } ${
                    isSaving || updatingStatusId !== null
                      ? "opacity-50"
                      : "active:opacity-80"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      item.isActive ? "text-amber-700" : "text-green-700"
                    }`}
                  >
                    {updatingStatusId === item.id
                      ? "Memproses..."
                      : item.isActive
                        ? "Nonaktifkan"
                        : "Aktifkan"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
