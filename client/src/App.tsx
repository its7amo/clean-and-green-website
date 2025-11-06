import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import ServicesPage from "@/pages/ServicesPage";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Book from "@/pages/Book";
import Quote from "@/pages/Quote";
import Faq from "@/pages/Faq";
import Gallery from "@/pages/Gallery";
import Reviews from "@/pages/Reviews";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Login from "@/pages/Login";
import SetupAdmin from "@/pages/SetupAdmin";
import Admin from "@/pages/Admin";
import AdminBookings from "@/pages/AdminBookings";
import AdminQuotes from "@/pages/AdminQuotes";
import AdminInvoices from "@/pages/AdminInvoices";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminServices from "@/pages/AdminServices";
import AdminGallery from "@/pages/AdminGallery";
import AdminFaq from "@/pages/AdminFaq";
import AdminSettings from "@/pages/AdminSettings";
import AdminEmployees from "@/pages/AdminEmployees";
import AdminReviews from "@/pages/AdminReviews";
import AdminNewsletter from "@/pages/AdminNewsletter";
import AdminTeam from "@/pages/AdminTeam";
import AdminContactMessages from "@/pages/AdminContactMessages";
import AdminActivityLogs from "@/pages/AdminActivityLogs";
import EmployeeLogin from "@/pages/EmployeeLogin";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import EmployeeBookings from "@/pages/EmployeeBookings";
import EmployeeCustomers from "@/pages/EmployeeCustomers";
import ManageBooking from "@/pages/manage-booking";
import CustomerPortal from "@/pages/CustomerPortal";
import PayInvoice from "@/pages/PayInvoice";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Don't scroll to top if there's a hash in the URL (for anchor links)
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function SetupChecker() {
  const [location, setLocation] = useLocation();
  const { data: setupStatus, isLoading } = useQuery<{ required: boolean }>({
    queryKey: ["/api/setup/required"],
  });

  useEffect(() => {
    if (!isLoading && setupStatus?.required && location !== "/setup") {
      setLocation("/setup");
    }
  }, [setupStatus, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <Router />;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/book" component={Book} />
      <Route path="/quote" component={Quote} />
      <Route path="/faq" component={Faq} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/booking/:id" component={ManageBooking} />
      <Route path="/portal" component={CustomerPortal} />
      <Route path="/pay-invoice/:id" component={PayInvoice} />
      <Route path="/employee/login" component={EmployeeLogin} />
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/employee/bookings" component={EmployeeBookings} />
      <Route path="/employee/customers" component={EmployeeCustomers} />
      <Route path="/login" component={Login} />
      <Route path="/setup" component={SetupAdmin} />
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route path="/admin/bookings">
        <ProtectedRoute component={AdminBookings} />
      </Route>
      <Route path="/admin/quotes">
        <ProtectedRoute component={AdminQuotes} />
      </Route>
      <Route path="/admin/invoices">
        <ProtectedRoute component={AdminInvoices} />
      </Route>
      <Route path="/admin/customers">
        <ProtectedRoute component={AdminCustomers} />
      </Route>
      <Route path="/admin/services">
        <ProtectedRoute component={AdminServices} />
      </Route>
      <Route path="/admin/gallery">
        <ProtectedRoute component={AdminGallery} />
      </Route>
      <Route path="/admin/faq">
        <ProtectedRoute component={AdminFaq} />
      </Route>
      <Route path="/admin/employees">
        <ProtectedRoute component={AdminEmployees} />
      </Route>
      <Route path="/admin/reviews">
        <ProtectedRoute component={AdminReviews} />
      </Route>
      <Route path="/admin/newsletter">
        <ProtectedRoute component={AdminNewsletter} />
      </Route>
      <Route path="/admin/team">
        <ProtectedRoute component={AdminTeam} />
      </Route>
      <Route path="/admin/messages">
        <ProtectedRoute component={AdminContactMessages} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} />
      </Route>
      <Route path="/admin/activity-logs">
        <ProtectedRoute component={AdminActivityLogs} />
      </Route>
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

function AppContent() {
  return <SetupChecker />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
