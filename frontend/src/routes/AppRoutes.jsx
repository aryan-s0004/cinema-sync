import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import HomePage from "../pages/HomePage";
import MovieDetailPage from "../pages/MovieDetailPage";
import SearchPage from "../pages/SearchPage";
import BookingPage from "../pages/BookingPage";
import PaymentPage from "../pages/PaymentPage";
import BookingConfirmPage from "../pages/BookingConfirmPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/movies/:movieId" element={<MovieDetailPage />} />

    <Route
      path="/booking/:showId"
      element={
        <ProtectedRoute>
          <BookingPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/payment/:bookingId"
      element={
        <ProtectedRoute>
          <PaymentPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/confirmation/:bookingId"
      element={
        <ProtectedRoute>
          <BookingConfirmPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />

    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    <Route path="*" element={<p className="text-center text-slate-400">Page not found.</p>} />
  </Routes>
);

export default AppRoutes;
