import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Trade, TradePokemonSnapshot } from '@pokedex/shared';
import { tradeApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { ApiError } from '../services/apiClient';

function TradePokemon({ snap, label }: { snap: TradePokemonSnapshot; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {snap.spriteUrl ? (
        <img src={snap.spriteUrl} alt={snap.pokemonName} className="h-12 w-12 object-contain" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-poke-cream text-sm">?</div>
      )}
      <div>
        <p className="text-xs text-poke-dark/50">{label}</p>
        <p className="font-medium capitalize">
          {snap.nickname ?? snap.pokemonName}
          {snap.isShiny && (
            <span className="ml-2 rounded-full bg-poke-yellow/40 px-2 py-0.5 text-xs font-medium">Shiny</span>
          )}
        </p>
        {snap.nickname && <p className="text-xs capitalize text-poke-dark/50">{snap.pokemonName}</p>}
      </div>
    </div>
  );
}

function TradeCard({
  trade,
  currentUserId,
  onAccept,
  onReject,
  onCancel,
  busy,
}: {
  trade: Trade;
  currentUserId: string;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const isIncoming = trade.recipient.id === currentUserId;
  const isOutgoing = trade.initiator.id === currentUserId;
  const other = isIncoming ? trade.initiator : trade.recipient;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>
            {trade.status === 'pending'
              ? isIncoming
                ? `From ${other.displayName}`
                : `To ${other.displayName}`
              : `${trade.initiator.displayName} ↔ ${trade.recipient.displayName}`}
          </CardTitle>
          <span className="mt-1 inline-block rounded-full bg-poke-sage/10 px-2 py-0.5 text-xs capitalize text-poke-sage">
            {trade.status}
          </span>
        </div>
        {trade.status === 'pending' && (
          <div className="flex flex-wrap gap-2">
            {isIncoming && (
              <>
                <Button onClick={onAccept} disabled={busy}>
                  Accept
                </Button>
                <Button variant="danger" onClick={onReject} disabled={busy}>
                  Reject
                </Button>
              </>
            )}
            {isOutgoing && (
              <Button variant="ghost" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <TradePokemon snap={trade.offered} label="Offered" />
        <p className="text-center text-sm text-poke-dark/40">for</p>
        <TradePokemon snap={trade.requested} label="Requested" />
      </div>
    </Card>
  );
}

export function TradesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');

  const tradesQuery = useQuery({ queryKey: ['trades'], queryFn: tradeApi.list });
  const trainersQuery = useQuery({
    queryKey: ['trainers', search],
    queryFn: () => tradeApi.listTrainers(search || undefined),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' | 'cancel' }) => {
      if (action === 'accept') return tradeApi.accept(id);
      if (action === 'reject') return tradeApi.reject(id);
      return tradeApi.cancel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
      setError('');
    },
    onError: (err: unknown) => setError((err as ApiError).error ?? 'Trade action failed'),
  });

  const trades = tradesQuery.data ?? [];
  const incoming = trades.filter((t) => t.status === 'pending' && t.recipient.id === user?.id);
  const outgoing = trades.filter((t) => t.status === 'pending' && t.initiator.id === user?.id);
  const history = trades.filter((t) => t.status !== 'pending');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Trades</h1>
        <p className="mt-2 text-poke-dark/60">Propose 1-for-1 swaps with other trainers.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardTitle>Find a trainer</CardTitle>
        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            label="Search by display name"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. Misty"
            className="flex-1"
          />
          <div className="flex items-end gap-2">
            <Button type="submit">Search</Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        {trainersQuery.isLoading ? (
          <p className="mt-4 text-sm text-poke-dark/60">Loading trainers…</p>
        ) : !trainersQuery.data?.length ? (
          <p className="mt-4 text-sm text-poke-dark/60">No other trainers found.</p>
        ) : (
          <ul className="mt-4 divide-y divide-poke-dark/10">
            {trainersQuery.data.map((trainer) => (
              <li key={trainer.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{trainer.displayName}</p>
                  <p className="text-sm text-poke-dark/50">{trainer.collectionCount} Pokémon</p>
                </div>
                <Link to={`/app/trades/new/${trainer.id}`}>
                  <Button variant="secondary">Propose trade</Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">Incoming ({incoming.length})</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-poke-dark/60">No pending offers.</p>
        ) : (
          incoming.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              currentUserId={user.id}
              busy={actionMutation.isPending}
              onAccept={() => actionMutation.mutate({ id: trade.id, action: 'accept' })}
              onReject={() => actionMutation.mutate({ id: trade.id, action: 'reject' })}
              onCancel={() => actionMutation.mutate({ id: trade.id, action: 'cancel' })}
            />
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">Outgoing ({outgoing.length})</h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-poke-dark/60">No pending proposals.</p>
        ) : (
          outgoing.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              currentUserId={user.id}
              busy={actionMutation.isPending}
              onAccept={() => actionMutation.mutate({ id: trade.id, action: 'accept' })}
              onReject={() => actionMutation.mutate({ id: trade.id, action: 'reject' })}
              onCancel={() => actionMutation.mutate({ id: trade.id, action: 'cancel' })}
            />
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-poke-dark/60">No completed trades yet.</p>
        ) : (
          history.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              currentUserId={user.id}
              busy={false}
              onAccept={() => undefined}
              onReject={() => undefined}
              onCancel={() => undefined}
            />
          ))
        )}
      </section>
    </div>
  );
}
