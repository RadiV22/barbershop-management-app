import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import CustomerLayout from "./layouts/CustomerLayout";
import HomePage from "./pages/HomePage";
import ServicePage from "./pages/ServicePage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BookingPage from "./pages/BookingPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicePage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
