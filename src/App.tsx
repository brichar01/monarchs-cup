/**
 * App shell: top navigation and routes for the five main pages.
 */
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import PlayersPage from "./pages/PlayersPage";
import RoundsPage from "./pages/RoundsPage";
import RoundSetupPage from "./pages/RoundSetupPage";
import RoundPage from "./pages/RoundPage";
import StandingsPage from "./pages/StandingsPage";
import AdminPage from "./pages/AdminPage";

const NAV = [
  { to: "/players", label: "Players" },
  { to: "/rounds", label: "Rounds" },
  { to: "/standings", label: "Standings" },
  { to: "/admin", label: "Admin" },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-indigo-700 text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <h1 className="text-lg font-bold tracking-wide">Monarchs Cup</h1>
          <nav className="flex gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 text-sm font-medium ${
                    isActive ? "bg-indigo-900" : "hover:bg-indigo-600"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/players" replace />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/rounds/new" element={<RoundSetupPage />} />
          <Route path="/rounds/:roundId" element={<RoundPage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
