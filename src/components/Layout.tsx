import { NavLink, Outlet } from "react-router-dom";

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
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
