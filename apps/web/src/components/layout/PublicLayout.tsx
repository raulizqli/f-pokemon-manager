import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { SiteFooter } from './SiteFooter';

export function PublicLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-poke-dark/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-xl font-bold text-poke-dark">
            PokéDex Manager
          </Link>
          <div className="flex gap-2">
            {!isLoading && isAuthenticated ? (
              <Link to="/app">
                <Button>Open app</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}
