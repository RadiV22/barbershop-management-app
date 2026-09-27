import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import api from "../lib/axios";
import axios from "axios";

interface Membership {
  memberCode: string;
  discountPercent: number;
  isActive: boolean;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  membership: Membership | null;
}

interface CustomerResponse {
  message: string;
  data: Customer[];
}

interface CreateCustomerResponse {
  message: string;
  data: {
    id: number;
    name: string;
    phone: string | null;
    membership?: Membership | null;
  };
}

interface MembershipResponse {
  message: string;
  data: Membership;
}

export default function CustomerScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(
    null,
  );
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(
    null,
  );
  const [updatingMembershipId, setUpdatingMembershipId] = useState<
    number | null
  >(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCustomers() {
      try {
        const response = await api.get<CustomerResponse>("/customer");

        if (isActive) {
          setCustomers(response.data.data);
          setErrorMessage("");
        }
      } catch {
        if (isActive) {
          setErrorMessage("Gagal mengambil daftar customer.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      isActive = false;
    };
  }, []);

  const keyword = search.trim().toLowerCase();

  const filteredCustomers = customers.filter((customer) => {
    const matchesName = customer.name.toLowerCase().includes(keyword);
    const matchesPhone = (customer.phone ?? "").includes(keyword);

    return matchesName || matchesPhone;
  });

  async function handleSaveCustomer() {
    if (
      isSaving ||
      deletingCustomerId !== null ||
      updatingMembershipId !== null
    ) {
      return;
    }

    if (!name.trim()) {
      Alert.alert("Data belum lengkap", "Nama customer wajib diisi.");
      return;
    }

    const isEditing = editingCustomerId !== null;

    // Backend belum mendukung penghapusan nomor telepon.
    const originalCustomer = customers.find(
      (customer) => customer.id === editingCustomerId,
    );

    if (isEditing && originalCustomer?.phone && !phone.trim()) {
      Alert.alert(
        "Nomor telepon belum diisi",
        "Nomor yang sudah tersimpan belum bisa dikosongkan. Isi nomor lama atau nomor penggantinya.",
      );
      return;
    }

    const payload = {
      name: name.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };

    setIsSaving(true);

    try {
      if (isEditing) {
        const response = await api.put<CreateCustomerResponse>(
          `/customer/${editingCustomerId}`,
          payload,
        );

        const updatedCustomer = response.data.data;

        setCustomers((current) =>
          current.map((customer) =>
            customer.id === editingCustomerId
              ? {
                  ...customer,
                  name: updatedCustomer.name,
                  phone: updatedCustomer.phone,
                }
              : customer,
          ),
        );
      } else {
        const response = await api.post<CreateCustomerResponse>(
          "/customer",
          payload,
        );

        const newCustomer: Customer = {
          ...response.data.data,
          membership: response.data.data.membership ?? null,
        };

        setCustomers((current) => [...current, newCustomer]);
      }

      setName("");
      setPhone("");
      setSearch("");
      setEditingCustomerId(null);
      setShowForm(false);

      Alert.alert(
        "Berhasil",
        isEditing
          ? "Customer berhasil diperbarui."
          : "Customer berhasil ditambahkan.",
      );
    } catch (error) {
      let message = "Customer belum berhasil disimpan. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menyimpan", message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditCustomer(customer: Customer) {
    setEditingCustomerId(customer.id);
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setShowForm(true);
  }

  async function handleDeleteCustomer(customerId: number) {
    if (
      isSaving ||
      deletingCustomerId !== null ||
      updatingMembershipId !== null
    ) {
      return;
    }

    setDeletingCustomerId(customerId);

    try {
      await api.delete(`/customer/${customerId}`);

      setCustomers((current) =>
        current.filter((customer) => customer.id !== customerId),
      );

      if (editingCustomerId === customerId) {
        setShowForm(false);
        setEditingCustomerId(null);
        setName("");
        setPhone("");
      }

      Alert.alert("Berhasil", "Customer berhasil dihapus.");
    } catch (error) {
      let message = "Customer belum berhasil dihapus. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menghapus", message);
    } finally {
      setDeletingCustomerId(null);
    }
  }

  function confirmDeleteCustomer(customer: Customer) {
    Alert.alert("Hapus customer?", `Yakin ingin menghapus ${customer.name}?`, [
      {
        text: "Batal",
        style: "cancel",
      },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          void handleDeleteCustomer(customer.id);
        },
      },
    ]);
  }

  async function handleActivateMembership(customerId: number) {
    if (
      isSaving ||
      deletingCustomerId !== null ||
      updatingMembershipId !== null
    ) {
      return;
    }

    setUpdatingMembershipId(customerId);

    try {
      const response = await api.post<MembershipResponse>(
        `/customer/${customerId}/membership`,
      );

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId
            ? {
                ...customer,
                membership: response.data.data,
              }
            : customer,
        ),
      );

      Alert.alert("Berhasil", "Membership customer berhasil diaktifkan.");
    } catch (error) {
      let message = "Membership belum berhasil diaktifkan.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal mengaktifkan membership", message);
    } finally {
      setUpdatingMembershipId(null);
    }
  }

  async function handleDeactivateMembership(customerId: number) {
    if (
      isSaving ||
      deletingCustomerId !== null ||
      updatingMembershipId !== null
    ) {
      return;
    }

    setUpdatingMembershipId(customerId);

    try {
      const response = await api.patch<MembershipResponse>(
        `/customer/${customerId}/membership`,
        { isActive: false },
      );

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId
            ? {
                ...customer,
                membership: response.data.data,
              }
            : customer,
        ),
      );

      Alert.alert("Berhasil", "Membership customer berhasil dinonaktifkan.");
    } catch (error) {
      let message = "Membership belum berhasil dinonaktifkan.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      }

      Alert.alert("Gagal menonaktifkan membership", message);
    } finally {
      setUpdatingMembershipId(null);
    }
  }

  async function handleRefresh() {
    if (
      isLoading ||
      isRefreshing ||
      isSaving ||
      deletingCustomerId !== null ||
      updatingMembershipId !== null
    ) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await api.get<CustomerResponse>("/customer");

      setCustomers(response.data.data);
      setErrorMessage("");
    } catch {
      Alert.alert(
        "Gagal memperbarui",
        "Daftar customer belum berhasil diperbarui. Silakan coba lagi.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Customer</Text>

        <Text className="mt-2 text-sm text-gray-600">
          Daftar pelanggan barbershop.
        </Text>

        <Pressable
          onPress={() => {
            setEditingCustomerId(null);
            setName("");
            setPhone("");
            setShowForm(true);
          }}
          disabled={
            isSaving ||
            isRefreshing ||
            deletingCustomerId !== null ||
            updatingMembershipId !== null
          }
          accessibilityRole="button"
          className="mt-4 items-center rounded-xl bg-blue-600 py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">
            + Tambah customer
          </Text>
        </Pressable>

        {showForm && (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-4 text-lg font-bold text-gray-900">
              {editingCustomerId !== null ? "Edit customer" : "Tambah customer"}
            </Text>

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Nama customer
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              editable={
                !isSaving &&
                deletingCustomerId === null &&
                updatingMembershipId === null
              }
              placeholder="Masukkan nama"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Nama customer"
              autoCapitalize="words"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            />

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Nomor telepon (opsional)
            </Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              editable={
                !isSaving &&
                deletingCustomerId === null &&
                updatingMembershipId === null
              }
              placeholder="Masukkan nomor telepon"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Nomor telepon customer"
              keyboardType="phone-pad"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            />

            <Pressable
              onPress={handleSaveCustomer}
              disabled={
                isSaving ||
                isRefreshing ||
                deletingCustomerId !== null ||
                updatingMembershipId !== null
              }
              accessibilityRole="button"
              className={`mb-3 items-center rounded-xl bg-blue-600 py-3 ${
                isSaving ? "opacity-50" : "active:opacity-80"
              }`}
            >
              <Text className="text-base font-semibold text-white">
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowForm(false);
                setEditingCustomerId(null);
                setName("");
                setPhone("");
              }}
              disabled={
                isSaving ||
                isRefreshing ||
                deletingCustomerId !== null ||
                updatingMembershipId !== null
              }
              accessibilityRole="button"
              className="items-center rounded-xl bg-gray-100 py-3 active:opacity-80"
            >
              <Text className="font-semibold text-gray-700">Batal</Text>
            </Pressable>
          </View>
        )}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama atau nomor telepon..."
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Cari customer"
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
        />
      </View>

      {isLoading && (
        <Text className="px-6 text-sm text-gray-600">Memuat customer...</Text>
      )}

      {!isLoading && errorMessage !== "" && (
        <View className="mx-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}

      {!isLoading && !errorMessage && (
        <FlatList
          className="flex-1"
          data={filteredCustomers}
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
                {keyword ? "Customer tidak ditemukan." : "Belum ada customer."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-5">
              <Text className="text-lg font-bold text-gray-900">
                {item.name}
              </Text>

              <Text className="mt-1 text-sm text-gray-600">
                {item.phone || "Nomor telepon belum diisi"}
              </Text>

              <View className="mt-3">
                {item.membership?.isActive ? (
                  <Text className="text-sm font-semibold text-green-700">
                    Member aktif · Diskon {item.membership.discountPercent}%
                  </Text>
                ) : (
                  <Text className="text-sm text-gray-500">
                    {item.membership
                      ? "Membership tidak aktif"
                      : "Belum menjadi member"}
                  </Text>
                )}

                {!item.membership?.isActive && (
                  <Pressable
                    onPress={() => handleActivateMembership(item.id)}
                    disabled={
                      isSaving ||
                      isRefreshing ||
                      deletingCustomerId !== null ||
                      updatingMembershipId !== null
                    }
                    accessibilityRole="button"
                    className={`mt-4 self-start rounded-lg bg-green-50 px-4 py-2 ${
                      isSaving ||
                      deletingCustomerId !== null ||
                      updatingMembershipId !== null
                        ? "opacity-50"
                        : "active:opacity-80"
                    }`}
                  >
                    <Text className="font-semibold text-green-700">
                      {updatingMembershipId === item.id
                        ? "Mengaktifkan..."
                        : "Aktifkan membership"}
                    </Text>
                  </Pressable>
                )}

                {item.membership?.isActive && (
                  <Pressable
                    onPress={() => handleDeactivateMembership(item.id)}
                    disabled={
                      isSaving ||
                      isRefreshing ||
                      deletingCustomerId !== null ||
                      updatingMembershipId !== null
                    }
                    accessibilityRole="button"
                    className={`mt-4 self-start rounded-lg bg-amber-50 px-4 py-2 ${
                      isSaving ||
                      deletingCustomerId !== null ||
                      updatingMembershipId !== null
                        ? "opacity-50"
                        : "active:opacity-80"
                    }`}
                  >
                    <Text className="font-semibold text-amber-700">
                      {updatingMembershipId === item.id
                        ? "Menonaktifkan..."
                        : "Nonaktifkan membership"}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => handleEditCustomer(item)}
                  disabled={
                    isSaving ||
                    isRefreshing ||
                    deletingCustomerId !== null ||
                    updatingMembershipId !== null
                  }
                  accessibilityRole="button"
                  className="mt-4 self-start rounded-lg bg-blue-50 px-4 py-2 active:opacity-80"
                >
                  <Text className="font-semibold text-blue-700">Edit</Text>
                </Pressable>

                <Pressable
                  onPress={() => confirmDeleteCustomer(item)}
                  disabled={
                    isSaving ||
                    isRefreshing ||
                    deletingCustomerId !== null ||
                    updatingMembershipId !== null
                  }
                  accessibilityRole="button"
                  className={`mt-2 self-start rounded-lg bg-red-50 px-4 py-2 ${
                    isSaving || deletingCustomerId !== null
                      ? "opacity-50"
                      : "active:opacity-80"
                  }`}
                >
                  <Text className="font-semibold text-red-700">
                    {deletingCustomerId === item.id ? "Menghapus..." : "Hapus"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
