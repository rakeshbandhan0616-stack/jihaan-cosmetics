import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop/ScrollToTop";

import HomePage from "./pages/home/HomePage";
import ProductPage from "./pages/product/ProductPage";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";

import CategoryProductsPage from "./components/homepage/CategoryProductsPage/CategoryProductsPage";

import AccountPage from "./pages/account/AccountPage";
import OrdersPage from "./pages/Orders/OrdersPage";
import CartPage from "./pages/Cart/CartPage";
import Checkout from "./pages/checkout/Checkout";

import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";

import SellerLoginPage from "./pages/SellerAuth/SellerLoginPage";
import SellerRegisterPage from "./pages/SellerAuth/SellerRegisterPage";

import LogisticPartnerLoginPage from "./pages/LogisticPartnerAuth/LogisticPartnerLoginPage";
import LogisticPartnerRegisterPage from "./pages/LogisticPartnerAuth/LogisticPartnerRegisterPage";

import StaffLogin from "./pages/StaffLogin/StaffLogin";
import AccountsDashboard from "./pages/AccountsDashboard/AccountsDashboard";
import LogisticsDashboard from "./pages/LogisticsDashboard/LogisticsDashboard";

type StaffRole =
  | "superadmin"
  | "admin"
  | "accounts"
  | "logistics";

type StaffUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: StaffRole;
  isActive?: boolean;
};

type StaffPortalProps = {
  children?: React.ReactNode;
};

/* =========================================================
   STAFF PORTAL
   ========================================================= */

function StaffPortal() {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaffUser = () => {
      try {
        const storedUser = localStorage.getItem("staffUser");

        if (!storedUser) {
          setStaffUser(null);
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser) as StaffUser;

        if (!parsedUser?.role) {
          localStorage.removeItem("staffUser");
          localStorage.removeItem("staffToken");

          setStaffUser(null);
          setLoading(false);
          return;
        }

        setStaffUser(parsedUser);
      } catch (error) {
        console.error("Failed to load staff session:", error);

        localStorage.removeItem("staffUser");
        localStorage.removeItem("staffToken");

        setStaffUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadStaffUser();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7f4",
          color: "#555",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading staff portal...
      </div>
    );
  }

  if (!staffUser?.role) {
    return <Navigate to="/staff/login" replace />;
  }

  switch (staffUser.role) {
    case "accounts":
      return <AccountsDashboard />;

    case "logistics":
      return <LogisticsDashboard />;

    case "superadmin":
    case "admin":
      return <AdminDashboardPage />;

    default:
      return <Navigate to="/staff/login" replace />;
  }
}

/* =========================================================
   STAFF ROUTE
   ========================================================= */

function StaffRoute() {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("staffUser");

      if (!storedUser) {
        setStaffUser(null);
        return;
      }

      const parsedUser = JSON.parse(storedUser) as StaffUser;

      setStaffUser(parsedUser);
    } catch (error) {
      console.error("Staff session error:", error);

      localStorage.removeItem("staffUser");
      localStorage.removeItem("staffToken");

      setStaffUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7f4",
          color: "#555",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Checking staff session...
      </div>
    );
  }

  if (!staffUser?.role) {
    return <Navigate to="/staff/login" replace />;
  }

  return <StaffPortal />;
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        {/* =================================================
            CUSTOMER ROUTES
           ================================================= */}

        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/products/:id"
          element={<ProductPage />}
        />

        <Route
          path="/category/:categoryName"
          element={<CategoryProductsPage />}
        />

        <Route path="/cart" element={<CartPage />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/account" element={<AccountPage />} />

        <Route path="/orders" element={<OrdersPage />} />

        <Route
          path="/account/orders"
          element={<OrdersPage />}
        />

        {/* =================================================
            OLD ADMIN ROUTES
           ================================================= */}

        <Route
          path="/admin/login"
          element={<AdminLoginPage />}
        />

        <Route
          path="/admin/dashboard"
          element={<AdminDashboardPage />}
        />

        {/* =================================================
            STAFF LOGIN
           ================================================= */}

        <Route
          path="/staff/login"
          element={<StaffLogin />}
        />

        {/* =================================================
            STAFF PORTAL
           ================================================= */}

        <Route
          path="/staff"
          element={<StaffRoute />}
        />

        {/* =================================================
            ACCOUNTS
           ================================================= */}

        <Route
          path="/accounts/dashboard"
          element={
            <StaffRoute />
          }
        />

        {/* =================================================
            LOGISTICS
           ================================================= */}

        <Route
          path="/logistics/dashboard"
          element={
            <StaffRoute />
          }
        />

        {/* =================================================
            SELLER
           ================================================= */}

        <Route
          path="/seller/login"
          element={<SellerLoginPage />}
        />

        <Route
          path="/seller/register"
          element={<SellerRegisterPage />}
        />

        {/* =================================================
            LOGISTIC PARTNER
           ================================================= */}

        <Route
          path="/logistic-partner/login"
          element={<LogisticPartnerLoginPage />}
        />

        <Route
          path="/logistic-partner/register"
          element={<LogisticPartnerRegisterPage />}
        />

        {/* =================================================
            FALLBACK
           ================================================= */}

        <Route
          path="*"
          element={<HomePage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;