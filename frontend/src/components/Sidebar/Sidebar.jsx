import { NavLink } from "react-router-dom";
import "./Sidebar.css";

import shieldLogo from "../../assets/shield.svg";
import dashboardIcon from "../../assets/icons/dashboard.svg";
import casesIcon from "../../assets/icons/cases.svg";
import evidenceIcon from "../../assets/icons/evidence.svg";
import eventsIcon from "../../assets/icons/events.svg";
import logAnalysisIcon from "../../assets/icons/log-analysis.svg";
import radarIcon from "../../assets/icons/radar.svg";
import settingsIcon from "../../assets/icons/settings.svg";

function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src={shieldLogo} alt="NexusCorvus" />
        </div>

        <div className="brand-text">
          <div className="brand-name">
            NexusCorvus
          </div>

          <div className="brand-subtitle">
            DFIR INVESTIGATION WORKSPACE
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">

        <div className="nav-group">
          <div className="nav-group-label">
            WORKSPACE
          </div>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={dashboardIcon} alt="" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/cases"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={casesIcon} alt="" />
            <span>Cases</span>
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">
            ARTIFACTS
          </div>

          <NavLink
            to="/evidence"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={evidenceIcon} alt="" />
            <span>Evidence</span>
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={eventsIcon} alt="" />
            <span>Events</span>
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">
            ANALYSIS
          </div>

          <NavLink
            to="/log-analysis"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={logAnalysisIcon} alt="" />
            <span>Log Analysis</span>
          </NavLink>

          <NavLink
            to="/sigma-detection"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={radarIcon} alt="" />
            <span>Sigma Detection</span>
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">
            SYSTEM
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <img src={settingsIcon} alt="" />
            <span>Settings</span>
          </NavLink>
        </div>

      </nav>

      <div className="sidebar-footer">
        <span className="footer-build">
          BUILD 0.1.0
        </span>
        <span className="footer-mode">
          LOCAL / STANDALONE
        </span>
      </div>

    </aside>
  );
}

export default Sidebar;