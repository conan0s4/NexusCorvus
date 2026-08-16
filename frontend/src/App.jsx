import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login/Login";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Cases from "./pages/Cases/Cases";
import LogAnalysis from "./pages/LogAnalysis/LogAnalysis";
import SigmaDetection from "./pages/SigmaDetection/SigmaDetection";
import CaseDetail from "./pages/Cases/CaseDetail/CaseDetail";
import Settings from "./pages/Settings/Settings.jsx";
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

          {/* Sidebar */}
          <Route element={<MainLayout />}>

            <Route
              path="/cases"
              element={<Cases />}
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
              path="/cases/:caseId"
              element={<CaseDetail />}
            />
            <Route
              path="/Settings"
              element={<Settings />}
            />
          </Route>

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;