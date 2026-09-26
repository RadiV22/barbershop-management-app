import { useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface MeResponse {
  message: string;
  data: {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "STAFF";
  };
}

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (isLoading) {
      return;
    }

    if (!email.trim() || !password) {
      Alert.alert("Data belum lengkap", "Email dan password wajib diisi");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error) {
      let message = "TProses masih belum berhasil. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response) {
          message = error.response.data?.message ?? message;
        } else {
          message =
            "Tidak dapat menghubungi server. Pastikan backend berjalan.";
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      Alert.alert("Proses masuk belum selesai", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Barbershop</Text>

          <Text style={styles.subtitle}>
            Masuk untuk mengelola kegiatan barbershop.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Password"
          />

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            className={`mt-1 items-center rounded-xl bg-blue-600 py-4 ${
              isLoading ? "opacity-50" : "active:opacity-80"
            }`}
          >
            <Text className="text-base font-bold text-white">
              {isLoading ? "Memproses..." : "Masuk"}
            </Text>
          </Pressable>

          <Text style={styles.footer}>
            Hubungi admin jika belum memiliki akun.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  footer: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 24,
  },
});
