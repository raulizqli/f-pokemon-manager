import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collectionApi, aiApi, tradeApi } from '../services/api';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import type { ApiError } from '../services/apiClient';

function providerLabel(provider: string): string {
  return provider === 'openai' ? 'OpenAI' : 'Gemini';
}

export function DashboardPage() {
  const { user } = useAuth();
  const statsQuery = useQuery({ queryKey: ['collection-stats'], queryFn: collectionApi.stats });
  const tradesQuery = useQuery({ queryKey: ['trades'], queryFn: tradeApi.list });
  const aiStatusQuery = useQuery({ queryKey: ['ai-status'], queryFn: aiApi.status });
  const aiInsightsQuery = useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiApi.insights,
    enabled: aiStatusQuery.data?.enabled === true,
    retry: false,
  });

  const stats = statsQuery.data;
  const pendingIncoming =
    tradesQuery.data?.filter((t) => t.status === 'pending' && t.recipient.id === user?.id).length ?? 0;
  const aiError = aiInsightsQuery.error as ApiError | undefined;
  const quotaWarning = aiInsightsQuery.data?.warnings?.find((warning) => warning.code === 'QUOTA_EXCEEDED');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Hello, {user?.displayName}</h1>
        <p className="mt-2 text-poke-dark/60">Your personal PokéDex at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-sm text-poke-dark/60">Total collected</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.total ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-poke-dark/60">Caught</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.byStatus?.caught ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-poke-dark/60">Traded</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.byStatus?.traded ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-poke-dark/60">Wishlist</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.byStatus?.wishlist ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-poke-dark/60">Shinies</p>
          <p className="mt-2 font-serif text-4xl font-bold">{stats?.shinyCount ?? 0}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/app/explore">
          <Button>Explore Pokémon</Button>
        </Link>
        <Link to="/app/collection">
          <Button variant="secondary">View collection</Button>
        </Link>
        <Link to="/app/trades">
          <Button variant="ghost">
            Trades{pendingIncoming > 0 ? ` (${pendingIncoming} incoming)` : ''}
          </Button>
        </Link>
      </div>

      <Card>
        <CardTitle>AI Collection Insights</CardTitle>
        {!aiStatusQuery.data?.enabled ? (
          <p className="mt-3 text-sm text-poke-dark/60">
            AI insights are disabled. Set <code className="rounded bg-poke-cream px-1">OPENAI_API_KEY</code> or{' '}
            <code className="rounded bg-poke-cream px-1">GEMINI_API_KEY</code> on the API server to enable
            personalized recommendations.
          </p>
        ) : aiInsightsQuery.isLoading ? (
          <p className="mt-3 text-sm text-poke-dark/60">Generating insights…</p>
        ) : aiInsightsQuery.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {aiError?.code === 'QUOTA_EXCEEDED'
              ? aiError.error
              : "Couldn't generate insights right now. Try refreshing the page."}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {quotaWarning && (
              <p className="rounded-lg bg-poke-yellow/20 px-3 py-2 text-sm text-poke-dark/80">
                {providerLabel(quotaWarning.provider)} quota exceeded. Showing Gemini results instead.
              </p>
            )}
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
            {aiInsightsQuery.data?.provider && aiInsightsQuery.data.model && (
              <p className="text-xs text-poke-dark/45">
                Generated by {providerLabel(aiInsightsQuery.data.provider)} · {aiInsightsQuery.data.model}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
