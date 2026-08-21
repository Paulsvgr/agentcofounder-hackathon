import { NavLink, Outlet } from "react-router-dom";

const STEPS_HREF = "/steps.html";

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>AgentCofounder</h1>
          <p>Hackathon run log · paste export · compare approaches</p>
        </div>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
            Runs
          </NavLink>
          <NavLink to="/add" className={({ isActive }) => (isActive ? "active" : undefined)}>
            Add run
          </NavLink>
          <NavLink to="/how-to" className={({ isActive }) => (isActive ? "active" : undefined)}>
            How to export
          </NavLink>
          <a className="nav-btn" href={STEPS_HREF} target="_blank" rel="noreferrer">
            Steps plan
          </a>
        </nav>
      </header>

      <div className="quick-bar">
        <p className="muted" style={{ margin: 0 }}>
          Team checklist &amp; export steps (Phase I)
        </p>
        <a className="btn" href={STEPS_HREF} target="_blank" rel="noreferrer">
          Open steps.html
        </a>
      </div>

      <Outlet />
    </div>
  );
}
