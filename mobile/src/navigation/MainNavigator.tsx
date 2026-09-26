import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import MoreScreen from "../screens/MoreScreen";

type MainTabParamList = {
  Home: undefined;
  Order: undefined;
  Customer: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function OrderScreen() {
  return (
    <View style={styles.container}>
      <Text> Daftar order akan ditampilkan disini </Text>
    </View>
  );
}

function CustomerScreen() {
  return (
    <View style={styles.container}>
      <Text> Daftar Customer akan ditampilkan disini</Text>
    </View>
  );
}

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIcon: () => null,
          tabBarIconStyle: {
            display: "none",
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
          headerTitleAlign: "center",
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Beranda" }}
        />

        <Tab.Screen
          name="Order"
          component={OrderScreen}
          options={{ title: "Order" }}
        />

        <Tab.Screen
          name="Customer"
          component={CustomerScreen}
          options={{ title: "Customer" }}
        />

        <Tab.Screen
          name="More"
          component={MoreScreen}
          options={{ title: "Lainnya" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
});
