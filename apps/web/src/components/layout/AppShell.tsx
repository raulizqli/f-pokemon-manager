import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-poke-sage text-white' : 'text-poke-dark/70 hover:bg-poke-dark/5'
  }`;

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-poke-dark/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/app" className="font-serif text-xl font-bold text-poke-dark">
            PokéDex Manager
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/app" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/app/explore" className={navLinkClass}>
              Explore
            </NavLink>
            <NavLink to="/app/collection" className={navLinkClass}>
              My Collection
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-poke-dark/60 sm:inline">{user?.displayName}</span>
            <Button variant="ghost" onClick={() => logout()}>
              Log out
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 sm:hidden">
          <NavLink to="/app" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/app/explore" className={navLinkClass}>
            Explore
          </NavLink>
          <NavLink to="/app/collection" className={navLinkClass}>
            Collection
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
