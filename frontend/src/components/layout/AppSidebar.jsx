import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  FileUp,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { useSecurity } from "../../context/SecurityContext";
import "./AppSidebar.css";

function AppSidebar() {
  const { incidents } = useSecurity();

  const links = [
    ["/upload", "Upload Data", FileUp,],
    ["/dashboard", "Overview", LayoutDashboard],
    ["/incidents", "Incidents", Siren],
    ["/events", "Security Events", Radio],
    ["/analytics", "Analytics", BarChart3],
  ];

  return (
    <aside className="app-sidebar">
      <NavLink className="sidebar-brand" to="/upload">
        <ShieldCheck size={23} />

        <span>
          <strong>CYBERGUARD AI</strong>
          <small>SECURITY OPERATIONS PLATFORM</small>
        </span>
      </NavLink>

      <p className="sidebar-label">OPERATIONS</p>

      <nav>
        {links.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} className="sidebar-link">
            <Icon size={17} />
            {label}

            {label === "Incidents" && incidents.length > 0 && (
              <em>{String(incidents.length).padStart(2, "0")}</em>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="engine-status">
        <Activity size={16} />

        <span>
          <small>DETECTION ENGINE</small>
          <strong>
            <i />
            READY
          </strong>
        </span>
      </div>
    </aside>
  );
}

export default AppSidebar;