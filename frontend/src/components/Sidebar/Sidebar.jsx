import { NavLink } from "react-router-dom";
import "./Sidebar.css";


import shieldLogo from "../../assets/shield.svg";
import casesIcon from "../../assets/icons/cases.svg";
import logAnalysisIcon from "../../assets/icons/log-analysis.svg";
import settingsIcon from "../../assets/icons/settings.svg";

function Sidebar() {
  return (
    <aside className="sidebar">

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src={shieldLogo} alt="NexusCorvus" />
        </div>

        <div className="brand-text">
          <div className="brand-name">NexusCorvus</div>
          <div className="brand-subtitle">
            Digital Forensics INVESTIGATION<br />
            PLATFORM
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav"><NavLink
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

      {/* User section */}
      <div className="sidebar-user">

        <div className="user-info">
          <div className="user-name">
            Admin
          </div>
          <div className="user-role">
             Analyst
          </div>
        </div>

      </div>

    </aside>
  );
}

export default Sidebar;