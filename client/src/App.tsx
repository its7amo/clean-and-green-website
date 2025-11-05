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
import ManageBooking from "@/pages/manage-booking";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

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
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/book" component={Book} />
      <Route path="/quote" component={Quote} />
      <Route path="/faq" component={Faq} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/booking/:id" component={ManageBooking} />
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
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
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
