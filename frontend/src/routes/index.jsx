import { Navigate, createBrowserRouter } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import CustomerLayout from "../components/layout/CustomerLayout";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import {
  AdminGenresPage,
  AdminMenuItemsPage,
  AdminMoviesPage,
  AdminPricingRulesPage,
  AdminScreensPage,
  AdminShowtimesPage,
  AdminTheatersPage,
  BookingDetailPage,
  BookingReportPage,
  ConfirmPage,
  MyBookingsPage,
  OccupancyReportPage,
  OperationsPage,
  PaymentPage,
  RevenueReportPage,
  ShowtimeDetailPage,
  ShowtimesPage,
  TopMoviesPage,
} from "../pages/placeholders";
import AdminRoute from "./AdminRoute";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/showtimes" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <CustomerLayout />,
    children: [
      {
        path: "/showtimes",
        element: <ShowtimesPage />,
      },
      {
        path: "/showtimes/:id",
        element: <ShowtimeDetailPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/bookings",
            element: <MyBookingsPage />,
          },
          {
            path: "/bookings/confirm",
            element: <ConfirmPage />,
          },
          {
            path: "/bookings/:id",
            element: <BookingDetailPage />,
          },
          {
            path: "/bookings/:id/pay",
            element: <PaymentPage />,
          },
        ],
      },
    ],
  },
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: "/admin",
            element: <Navigate to="/admin/theaters" replace />,
          },
          {
            path: "/admin/theaters",
            element: <AdminTheatersPage />,
          },
          {
            path: "/admin/screens",
            element: <AdminScreensPage />,
          },
          {
            path: "/admin/movies",
            element: <AdminMoviesPage />,
          },
          {
            path: "/admin/genres",
            element: <AdminGenresPage />,
          },
          {
            path: "/admin/menu-items",
            element: <AdminMenuItemsPage />,
          },
          {
            path: "/admin/pricing-rules",
            element: <AdminPricingRulesPage />,
          },
          {
            path: "/admin/showtimes",
            element: <AdminShowtimesPage />,
          },
          {
            path: "/admin/reports/revenue",
            element: <RevenueReportPage />,
          },
          {
            path: "/admin/reports/bookings",
            element: <BookingReportPage />,
          },
          {
            path: "/admin/reports/occupancy",
            element: <OccupancyReportPage />,
          },
          {
            path: "/admin/reports/top-movies",
            element: <TopMoviesPage />,
          },
          {
            path: "/admin/operations",
            element: <OperationsPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/showtimes" replace />,
  },
]);

export default router;
