import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import Admin from "@/pages/Admin";
import AdminBookings from "@/pages/AdminBookings";
import AdminQuotes from "@/pages/AdminQuotes";
import AdminInvoices from "@/pages/AdminInvoices";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminServices from "@/pages/AdminServices";
import AdminGallery from "@/pages/AdminGallery";
import AdminFaq from "@/pages/AdminFaq";
import AdminSettings from "@/pages/AdminSettings";
import NotFound from "@/pages/not-found";

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
      <Route path="/admin" component={Admin} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/quotes" component={AdminQuotes} />
      <Route path="/admin/invoices" component={AdminInvoices} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/services" component={AdminServices} />
      <Route path="/admin/gallery" component={AdminGallery} />
      <Route path="/admin/faq" component={AdminFaq} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
