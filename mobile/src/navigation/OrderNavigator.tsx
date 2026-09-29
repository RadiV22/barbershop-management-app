import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OrderScreen from "../screens/OrderScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import CreateOrderScreen from "../screens/CreateOrderScreen";

export type OrderStackParamList = {
  OrderList: undefined;
  OrderDetail: { orderId: number };
  CreateOrder: undefined;
};

const Stack = createNativeStackNavigator<OrderStackParamList>();

export default function OrderNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="OrderList"
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="OrderList"
        component={OrderScreen}
        options={{ title: "Order" }}
      />

      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: "Detail Order" }}
      />

      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: "Buat Order" }}
      />
    </Stack.Navigator>
  );
}
