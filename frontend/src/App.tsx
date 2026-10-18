import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import ServicePage from "./pages/ServicePage";
import CustomerPage from "./pages/CustomerPage";
import KapsterPage from "./pages/KapsterPage";
import OrderPage from "./pages/OrderPage";
import CreateOrderPage from "./pages/CreateOrderPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import BookingPage from "./pages/BookingPage";
import CreateStaffPage from "./pages/CreateStaffPage";

function OrderDetailRoute() {
  const { id } = useParams();

  return <OrderDetailPage key={id} />;
}

function App() {
  const { user } = useAuth();

  const homePath = user?.role === "ADMIN" ? "/dashboard" : "/order";

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={homePath} replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              user?.role === "ADMIN" ? (
                <DashboardPage />
              ) : (
                <Navigate to="/order" replace />
              )
            }
          />

          <Route
            path="/staff/create"
            element={
              user?.role === "ADMIN" ? (
                <CreateStaffPage />
              ) : (
                <Navigate to="/order" replace />
              )
            }
          />

          <Route path="/services" element={<ServicePage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/kapster" element={<KapsterPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order/create" element={<CreateOrderPage />} />
          <Route path="/order/history" element={<OrderHistoryPage />} />
          <Route path="/order/:id" element={<OrderDetailRoute />} />
        </Route>
      </Route>

      <Route
        path="/"
        element={<Navigate to={user ? homePath : "/login"} replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
