import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminRoute from "../components/common/AdminRoute";

const HomePage = lazy(() => import("../pages/HomePage"));
const MovieDetailPage = lazy(() => import("../pages/MovieDetailPage"));
const SearchPage = lazy(() => import("../pages/SearchPage"));
const BookingPage = lazy(() => import("../pages/BookingPage"));
const PaymentPage = lazy(() => import("../pages/PaymentPage"));
const PaymentSuccessPage = lazy(() => import("../pages/PaymentSuccessPage"));
const BookingConfirmPage = lazy(() => import("../pages/BookingConfirmPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const ManageShows = lazy(() => import("../pages/admin/ManageShows"));
const ManageMovies = lazy(() => import("../pages/admin/ManageMovies"));

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
      path="/payment/success"
      element={
        <ProtectedRoute>
          <PaymentSuccessPage />
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
    <Route
      path="/admin"
      element={
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      }
    />
    <Route
      path="/admin/shows"
      element={
        <AdminRoute>
          <ManageShows />
        </AdminRoute>
      }
    />
    <Route
      path="/admin/movies"
      element={
        <AdminRoute>
          <ManageMovies />
        </AdminRoute>
      }
    />

    <Route
      path="*"
      element={
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <p className="text-6xl font-black text-white/10">404</p>
          <h1 className="text-2xl font-black text-white">Page Not Found</h1>
          <p className="text-sm text-slate-400">The page you are looking for does not exist or has been moved.</p>
          <a
            href="/"
            className="rounded-2xl bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#f11a26]"
          >
            Back to Home
          </a>
        </div>
      }
    />
  </Routes>
);

export default AppRoutes;
