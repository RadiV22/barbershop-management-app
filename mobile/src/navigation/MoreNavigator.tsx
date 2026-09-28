import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../screens/MoreScreen";
import ServiceScreen from "../screens/ServiceScreen";
import KapsterScreen from "../screens/KapsterScreen";

export type MoreStackParamList = {
  MoreHome: undefined;
  Services: undefined;
  Kapster: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MoreHome"
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{ title: "Lainnya" }}
      />

      <Stack.Screen
        name="Services"
        component={ServiceScreen}
        options={{ title: "Layanan" }}
      />

      <Stack.Screen
        name="Kapster"
        component={KapsterScreen}
        options={{ title: "Kapster" }}
      />
    </Stack.Navigator>
  );
}
