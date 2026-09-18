import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { getCurrentUser, logout } from "../api/authApi";
import "./MainLayout.css";

const SECTION_MAP = [
  { segments: ["dashboard"], label: "WORKSPACE / DASHBOARD" },
  { segments: ["cases"], label: "WORKSPACE / CASES" },
  { segments: ["evidence"], label: "ARTIFACTS / EVIDENCE" },
  { segments: ["events"], label: "ARTIFACTS / EVENTS" },
  { segments: ["log-analysis"], label: "ANALYSIS / LOG ANALYSIS" },
  { segments: ["sigma-detection"], label: "ANALYSIS / SIGMA DETECTION" },
  { segments: ["settings"], label: "SYSTEM / SETTINGS" },
];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("analyst");

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUsername(user?.username || "analyst"))
      .catch(() => setUsername("analyst"));
  }, []);

  const section = SECTION_MAP.find((entry) =>
    entry.segments.some((segment) =>
      location.pathname.split("/").includes(segment)
    )
  );

  const sectionLabel = section
    ? section.label
    : "NEXUSCORVUS / WORKSPACE";

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">

      <Sidebar />

      <div className="app-main">

        <header className="app-topbar">

          <div className="topbar-section">
            <span className="topbar-mark">
              NEXUSCORVUS
            </span>
            <span className="topbar-separator">/</span>
            <span className="topbar-path">
              {sectionLabel}
            </span>
          </div>

          <div className="topbar-right">

            <span className="topbar-status">
              <span className="status-pulse" />
              LOCAL WORKSPACE
            </span>

            <div className="topbar-user">
              <span className="user-avatar">
                {initials}
              </span>
              <span className="user-name">
                {username}
              </span>
            </div>

            <button
              className="topbar-logout"
              onClick={handleLogout}
            >
              SIGN OUT
            </button>

          </div>

        </header>

        <main className="app-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default MainLayout;