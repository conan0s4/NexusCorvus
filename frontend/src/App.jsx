import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login/Login";
import MainLayout from "./layouts/MainLayout";
import Cases from "./pages/Cases/Cases";
import LogAnalysis from "./pages/LogAnalysis/LogAnalysis";
import SigmaDetection from "./pages/SigmaDetection/SigmaDetection";
import CaseDetail from "./pages/Cases/CaseDetail/CaseDetail";



function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* No Sidebar */}
        <Route path="/" element={<Login />} />

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
          path="/cases/case-detail"
          element={<CaseDetail />}
          />



        </Route>




      </Routes>

    </BrowserRouter>
  );
}

export default App;