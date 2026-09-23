import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AuthProvider from "./src/contexts/AuthProvider";
import { useAuth } from "./src/hooks/useAuth";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";

function AppContent() {
  const { user, isInitializing, sessionError, restoreSession } = useAuth();

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.message}>Memeriksa sesi...</Text>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{sessionError}</Text>
        <Button title="Coba lagi" onPress={() => void restoreSession()} />
      </View>
    );
  }

  return user ? <HomeScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  message: {
    marginVertical: 16,
    textAlign: "center",
    color: "#374151",
  },
});
