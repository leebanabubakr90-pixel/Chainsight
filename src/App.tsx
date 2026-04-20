import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Demo from "./pages/Demo";
import Auth from "./pages/Auth";
import Overview from "./pages/dashboard/Overview";
import Shipments from "./pages/dashboard/Shipments";
import Forecast from "./pages/dashboard/Forecast";
import RoutesPage from "./pages/dashboard/Routes";
import Bottlenecks from "./pages/dashboard/Bottlenecks";
import Assistant from "./pages/dashboard/Assistant";
import Reports from "./pages/dashboard/Reports";
import OrganizationPage from "./pages/dashboard/Organization";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GuidedTour } from "./components/GuidedTour";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GuidedTour />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/dashboard/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
            <Route path="/dashboard/forecast" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
            <Route path="/dashboard/routes" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
            <Route path="/dashboard/bottlenecks" element={<ProtectedRoute><Bottlenecks /></ProtectedRoute>} />
            <Route path="/dashboard/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
            <Route path="/dashboard/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/dashboard/organization" element={<ProtectedRoute><OrganizationPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
