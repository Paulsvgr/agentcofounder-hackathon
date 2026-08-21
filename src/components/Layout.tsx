import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../lib/theme";

const STEPS_HREF = "/steps.html";

export function Layout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-frame">
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <h1>AgentCofounder</h1>
            <p>Hackathon run log · paste export · compare approaches</p>
          </div>
          <div className="topbar-actions">
            <nav className="nav" aria-label="Primary">
              <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
                Runs
              </NavLink>
              <NavLink to="/add" className={({ isActive }) => (isActive ? "active" : undefined)}>
                Add run
              </NavLink>
              <NavLink
                to="/how-to"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                How to export
              </NavLink>
              <a className="nav-btn" href={STEPS_HREF} target="_blank" rel="noreferrer">
                Steps plan
              </a>
            </nav>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </header>

        <main className="page-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
