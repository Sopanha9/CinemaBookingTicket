const createPlaceholder = (name) =>
  function PlaceholderPage() {
    return <div>{name}</div>;
  };

export const LoginPage = createPlaceholder("LoginPage");
export const RegisterPage = createPlaceholder("RegisterPage");

export const ShowtimesPage = createPlaceholder("ShowtimesPage");
export const ShowtimeDetailPage = createPlaceholder("ShowtimeDetailPage");

export const MyBookingsPage = createPlaceholder("MyBookingsPage");
export const ConfirmPage = createPlaceholder("ConfirmPage");
export const BookingDetailPage = createPlaceholder("BookingDetailPage");
export const PaymentPage = createPlaceholder("PaymentPage");

export const AdminTheatersPage = createPlaceholder("AdminTheatersPage");
export const AdminScreensPage = createPlaceholder("AdminScreensPage");
export const AdminMoviesPage = createPlaceholder("AdminMoviesPage");
export const AdminGenresPage = createPlaceholder("AdminGenresPage");
export const AdminMenuItemsPage = createPlaceholder("AdminMenuItemsPage");
export const AdminPricingRulesPage = createPlaceholder("AdminPricingRulesPage");
export const AdminShowtimesPage = createPlaceholder("AdminShowtimesPage");

export const RevenueReportPage = createPlaceholder("RevenueReportPage");
export const BookingReportPage = createPlaceholder("BookingReportPage");
export const OccupancyReportPage = createPlaceholder("OccupancyReportPage");
export const TopMoviesPage = createPlaceholder("TopMoviesPage");

export const OperationsPage = createPlaceholder("OperationsPage");
