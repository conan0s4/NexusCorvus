import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login/Login";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard/Dashboard";
import Cases from "./pages/Cases/Cases";
import Evidence from "./pages/Evidence/Evidence";
import Events from "./pages/Events/Events";
import LogAnalysis from "./pages/LogAnalysis/LogAnalysis";
import SigmaDetection from "./pages/SigmaDetection/SigmaDetection";
import CaseDetail from "./pages/Cases/CaseDetail/CaseDetail";
import Settings from "./pages/Settings/Settings";
import Landing from "./pages/Landing/Landing";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Landing />} />

        {/* PUBLIC */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* AUTHENTICATED USERS ONLY */}
        <Route element={<ProtectedRoute />}>

          {/* Application shell */}
          <Route element={<MainLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/cases"
              element={<Cases />}
            />

            <Route
              path="/cases/:caseId"
              element={<CaseDetail />}
            />

            <Route
              path="/evidence"
              element={<Evidence />}
            />

            <Route
              path="/events"
              element={<Events />}
            />

            <Route
              path="/log-analysis"
              element={<LogAnalysis />}
            />

            <Route
              path="/sigma-detection"
              element={<SigmaDetection />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

          </Route>

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;