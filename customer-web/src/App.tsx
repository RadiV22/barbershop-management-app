import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import CustomerLayout from "./layouts/CustomerLayout";
import HomePage from "./pages/HomePage";
import ServicePage from "./pages/ServicePage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AccountPage from "./pages/AccountPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicePage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
