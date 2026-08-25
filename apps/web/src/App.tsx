import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { PublicLayout } from './components/layout/PublicLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { PokemonDetailPage } from './pages/PokemonDetailPage';
import { CollectionPage } from './pages/CollectionPage';
import { TradesPage } from './pages/TradesPage';
import { ProposeTradePage } from './pages/ProposeTradePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-poke-dark/60">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          notice: 'Please sign in to continue.',
          from: location.pathname,
        }}
      />
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route
        path="app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route path="trades/new/:userId" element={<ProposeTradePage />} />
        <Route path="pokemon/:id" element={<PokemonDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
