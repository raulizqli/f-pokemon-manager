import { Link, Outlet } from 'react-router-dom';
import { Button } from '../ui/Button';

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-poke-dark/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-xl font-bold text-poke-dark">
            PokéDex Manager
          </Link>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
