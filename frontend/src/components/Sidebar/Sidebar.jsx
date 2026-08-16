import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

import shieldLogo from "../../assets/shield.svg";
import casesIcon from "../../assets/icons/cases.svg";
import logAnalysisIcon from "../../assets/icons/log-analysis.svg";
import settingsIcon from "../../assets/icons/settings.svg";

import {logout} from "../../api/authApi.js";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();

      // Backend session has now been destroyed
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="sidebar">

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src={shieldLogo} alt="NexusCorvus" />
        </div>

        <div className="brand-text">
          <div className="brand-name">
            NexusCorvus
          </div>

          <div className="brand-subtitle">
            Digital Forensics INVESTIGATION
            <br />
            PLATFORM
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">

        <NavLink
          to="/cases"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >
          <img src={casesIcon} alt="" />
          <span>Cases</span>
        </NavLink>

        <NavLink
          to="/log-analysis"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >
          <img src={logAnalysisIcon} alt="" />
          <span>Log Analysis</span>
        </NavLink>

        <div className="sidebar-divider" />

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >
          <img src={settingsIcon} alt="" />
          <span>Settings</span>
        </NavLink>

      </nav>

      {/* Logout */}
      <div>
        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;