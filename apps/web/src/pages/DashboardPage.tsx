import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collectionApi, aiApi } from '../services/api';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const statsQuery = useQuery({ queryKey: ['collection-stats'], queryFn: collectionApi.stats });
  const aiStatusQuery = useQuery({ queryKey: ['ai-status'], queryFn: aiApi.status });
  const aiInsightsQuery = useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiApi.insights,
    enabled: aiStatusQuery.data?.enabled === true,
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Hello, {user?.displayName}</h1>
        <p className="mt-2 text-poke-dark/60">Your personal PokéDex at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-poke-dark/60">Total collected</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.total ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-poke-dark/60">Caught</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.byStatus?.caught ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-poke-dark/60">Wishlist</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.byStatus?.wishlist ?? 0}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/app/explore">
          <Button>Explore Pokémon</Button>
        </Link>
        <Link to="/app/collection">
          <Button variant="secondary">View collection</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>AI Collection Insights</CardTitle>
        {!aiStatusQuery.data?.enabled ? (
          <p className="mt-3 text-sm text-poke-dark/60">
            AI insights are disabled. Set <code className="rounded bg-poke-cream px-1">OPENAI_API_KEY</code> on the
            API server to enable personalized recommendations.
          </p>
        ) : aiInsightsQuery.isLoading ? (
          <p className="mt-3 text-sm text-poke-dark/60">Generating insights…</p>
        ) : (
          <div className="mt-3 space-y-3">
            {aiInsightsQuery.data?.insights && (
              <p className="text-poke-dark/80">{aiInsightsQuery.data.insights}</p>
            )}
            {aiInsightsQuery.data?.recommendations && aiInsightsQuery.data.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-poke-dark/60">Recommended to add:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {aiInsightsQuery.data.recommendations.map((name) => (
                    <Link
                      key={name}
                      to={`/app/pokemon/${name}`}
                      className="rounded-full bg-poke-yellow/30 px-3 py-1 text-sm capitalize"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
