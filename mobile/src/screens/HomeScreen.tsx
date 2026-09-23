import { useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingout] = useState(false);

  async function handleLogout() {
    setIsLoggingout(true);

    try {
      await logout();
    } catch {
      Alert.alert("Logout gagal", "Silahkan coba lagi");
    } finally {
      setIsLoggingout(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Beranda</Text>
      <Text style={styles.text}>Selamat datang, {user?.name}</Text>
      <Text style={styles.text}>Role: {user?.role}</Text>

      <Button
        title={isLoggingOut ? "Keluar..." : "Logout"}
        onPress={handleLogout}
        disabled={isLoggingOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 16,
  },
});
