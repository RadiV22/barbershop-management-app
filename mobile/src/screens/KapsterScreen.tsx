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
import axios from "axios";

interface Kapster {
  id: number;
  name: string;
  isActive: boolean;
}

interface KapsterResponse {
  message: string;
  data: Kapster[];
}

interface CreateKapsterResponse {
  message: string;
  data: Kapster;
}

export default function KapsterScreen() {
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingKapsterId, setEditingKapsterId] = useState<number | null>(null);
  const [deletingKapsterId, setDeletingKapsterId] = useState<number | null>(
    null,
  );
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadKapsters() {
      try {
        const response = await api.get<KapsterResponse>("/kapster");

        if (isActive) {
          setKapsters(response.data.data);
          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage("Gagal mengambil daftar kapster.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadKapsters();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSaveKapster() {
    if (
      isSaving ||
      isLoading ||
      deletingKapsterId !== null ||
      updatingStatusId !== null ||
      isRefreshing
    ) {
      return;
    }

    if (!name.trim()) {
      Alert.alert("Data belum lengkap", "Nama kapster wajib diisi.");
      return;
    }

    const isEditing = editingKapsterId !== null;
    const payload = {
      name: name.trim(),
    };

    setIsSaving(true);

    try {
      if (isEditing) {
        const response = await api.put<CreateKapsterResponse>(
          `/kapster/${editingKapsterId}`,
          payload,
        );

        const updatedKapster = response.data.data;

        setKapsters((current) =>
          current.map((kapster) =>
            kapster.id === editingKapsterId ? updatedKapster : kapster,
          ),
        );
      } else {
        const response = await api.post<CreateKapsterResponse>(
          "/kapster",
          payload,
        );

        setKapsters((current) => [...current, response.data.data]);
      }

      setName("");
      setEditingKapsterId(null);
      setShowForm(false);

      Alert.alert(
        "Berhasil",
        isEditing
          ? "Kapster berhasil diperbarui."
          : "Kapster berhasil ditambahkan.",
      );
    } catch (error) {
      let message = "Kapster belum berhasil disimpan. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menyimpan", message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditKapster(kapster: Kapster) {
    if (
      isSaving ||
      isLoading ||
      deletingKapsterId !== null ||
      updatingStatusId !== null ||
      isRefreshing
    ) {
      return;
    }

    setEditingKapsterId(kapster.id);
    setName(kapster.name);
    setShowForm(true);
  }

  async function handleDeleteKapster(kapsterId: number) {
    if (
      isSaving ||
      isLoading ||
      deletingKapsterId !== null ||
      updatingStatusId !== null ||
      isRefreshing
    ) {
      return;
    }

    setDeletingKapsterId(kapsterId);

    try {
      await api.delete(`/kapster/${kapsterId}`);

      setKapsters((current) =>
        current.filter((kapster) => kapster.id !== kapsterId),
      );

      if (editingKapsterId === kapsterId) {
        setEditingKapsterId(null);
        setName("");
        setShowForm(false);
      }

      Alert.alert("Berhasil", "kapster berhasil dihapus.");
    } catch (error) {
      let message = "Kapster belum berhasil dihapus. silahkan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menghapus", message);
    } finally {
      setDeletingKapsterId(null);
    }
  }

  function confirmDeleteKapster(kapster: Kapster) {
    if (
      isSaving ||
      isLoading ||
      deletingKapsterId !== null ||
      updatingStatusId !== null ||
      isRefreshing
    ) {
      return;
    }

    Alert.alert("Hapus kapster", `Hapus kapster "${kapster.name}"?`, [
      {
        text: "Batal",
        style: "cancel",
      },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          void handleDeleteKapster(kapster.id);
        },
      },
    ]);
  }

  async function handleToggleKapsterStatus(kapster: Kapster) {
    if (
      isSaving ||
      isLoading ||
      deletingKapsterId !== null ||
      updatingStatusId !== null ||
      isRefreshing
    ) {
      return;
    }

    setUpdatingStatusId(kapster.id);

    try {
      const response = await api.put<CreateKapsterResponse>(
        `/kapster/${kapster.id}`,
        { isActive: !kapster.isActive },
      );

      const updatedKapster = response.data.data;

      setKapsters((current) =>
        current.map((item) => (item.id === kapster.id ? updatedKapster : item)),
      );

      Alert.alert(
        "Berhasil",
        updatedKapster.isActive
          ? "Kapster berhasil diaktifkan."
          : "Kapster berhasil dinonaktifkan.",
      );
    } catch (error) {
      let message = "Status kapster belum berhasil diubah.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal mengubah status", message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleRefresh() {
    if (
      isLoading ||
      isRefreshing ||
      isSaving ||
      deletingKapsterId !== null ||
      updatingStatusId !== null
    ) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await api.get<KapsterResponse>("/kapster");

      setKapsters(response.data.data);
      setErrorMessage("");
    } catch {
      Alert.alert(
        "Gagal memuat ulang",
        "Daftar kapster belum berhasil diperbarui. Silakan coba lagi.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }
  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Kapster</Text>

        <Text className="mt-1 text-sm text-gray-500">
          Daftar kapster yang melayani customer barbershop.
        </Text>

        <Pressable
          onPress={() => {
            setEditingKapsterId(null);
            setName("");
            setShowForm((current) => !current);
          }}
          disabled={
            isSaving ||
            isLoading ||
            isRefreshing ||
            deletingKapsterId !== null ||
            updatingStatusId !== null
          }
          accessibilityRole="button"
          className="mt-4 items-center rounded-xl bg-blue-600 py-3 active:opacity-90 shadow-sm"
        >
          <Text className="text-base font-semibold text-white">
            {showForm ? "Tutup form" : "+ Tambah kapster"}
          </Text>
        </Pressable>

        {showForm && (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <Text className="mb-4 text-lg font-bold text-gray-900">
              {editingKapsterId !== null ? "Edit kapster" : "Tambah kapster"}
            </Text>

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Nama kapster
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              editable={
                !isSaving &&
                !isRefreshing &&
                deletingKapsterId === null &&
                updatingStatusId === null
              }
              placeholder="Masukkan nama kapster"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Nama kapster"
              autoCapitalize="words"
              className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-blue-500"
            />

            <Pressable
              onPress={handleSaveKapster}
              disabled={
                isSaving ||
                isLoading ||
                isRefreshing ||
                deletingKapsterId !== null ||
                updatingStatusId !== null
              }
              accessibilityRole="button"
              className={`mt-4 items-center rounded-xl bg-blue-600 py-3 ${
                isSaving || isLoading || deletingKapsterId !== null
                  ? "opacity-50"
                  : "active:opacity-90"
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
        <Text className="px-6 text-sm text-gray-500 italic">
          Memuat data kapster...
        </Text>
      )}

      {!isLoading && errorMessage !== "" && (
        <View className="mx-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}

      {!isLoading && !errorMessage && (
        <FlatList
          className="flex-1"
          data={kapsters}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View className="rounded-xl bg-white p-5 border border-gray-200 items-center">
              <Text className="text-gray-400">Belum ada kapster.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {/* Baris Atas: Nama Kapster & Tag Status */}
              <View className="flex-row items-center justify-between">
                <Text
                  className="flex-1 text-base font-bold text-gray-900 pr-2"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <View
                  className={`rounded-full px-2.5 py-0.5 border ${
                    item.isActive
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
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
              </View>

              {/* Garis Pembatas Tipis */}
              <View className="my-4 h-[1px] bg-gray-100" />

              {/* Baris Bawah: Kelompok Tombol Aksi */}
              <View className="flex-row items-center justify-between">
                {/* Sisi Kiri: Mengubah Status (Aktif/Nonaktif) */}
                <Pressable
                  onPress={() => handleToggleKapsterStatus(item)}
                  disabled={
                    isSaving ||
                    isLoading ||
                    isRefreshing ||
                    deletingKapsterId !== null ||
                    updatingStatusId !== null
                  }
                  accessibilityRole="button"
                  className={`rounded-xl border px-3 py-2 ${
                    item.isActive
                      ? "bg-amber-50 border-amber-200"
                      : "bg-green-50 border-green-200"
                  } ${
                    isSaving ||
                    deletingKapsterId !== null ||
                    updatingStatusId !== null
                      ? "opacity-50"
                      : "active:opacity-80"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
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

                {/* Sisi Kanan: Edit dan Hapus */}
                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={() => handleEditKapster(item)}
                    disabled={
                      isSaving ||
                      isLoading ||
                      isRefreshing ||
                      deletingKapsterId !== null ||
                      updatingStatusId !== null
                    }
                    accessibilityRole="button"
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 active:opacity-80"
                  >
                    <Text className="text-xs font-semibold text-blue-700">
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => confirmDeleteKapster(item)}
                    disabled={
                      isSaving ||
                      isLoading ||
                      isRefreshing ||
                      deletingKapsterId !== null ||
                      updatingStatusId !== null
                    }
                    accessibilityRole="button"
                    className={`rounded-xl border border-red-200 bg-red-50 px-3 py-2 ${
                      isSaving || isLoading || deletingKapsterId !== null
                        ? "opacity-50"
                        : "active:opacity-80"
                    }`}
                  >
                    <Text className="text-xs font-semibold text-red-700">
                      {deletingKapsterId === item.id ? "..." : "Hapus"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
