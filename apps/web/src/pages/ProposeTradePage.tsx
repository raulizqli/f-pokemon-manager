import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CollectionEntry, PublicCollectionEntry } from '@pokedex/shared';
import { collectionApi, tradeApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import type { ApiError } from '../services/apiClient';

function PickList({
  title,
  entries,
  selectedId,
  onSelect,
}: {
  title: string;
  entries: Array<CollectionEntry | PublicCollectionEntry>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {!entries.length ? (
        <p className="mt-3 text-sm text-poke-dark/60">No Pokémon available.</p>
      ) : (
        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  selectedId === entry.id
                    ? 'border-poke-sage bg-poke-sage/10'
                    : 'border-poke-dark/10 hover:bg-poke-dark/5'
                }`}
              >
                {entry.spriteUrl ? (
                  <img src={entry.spriteUrl} alt={entry.pokemonName} className="h-12 w-12 object-contain" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-poke-cream">?</div>
                )}
                <div>
                  <p className="font-medium capitalize">
                    {entry.nickname ?? entry.pokemonName}
                    {entry.isShiny && (
                      <span className="ml-2 rounded-full bg-poke-yellow/40 px-2 py-0.5 text-xs font-medium">
                        Shiny
                      </span>
                    )}
                  </p>
                  <p className="text-xs capitalize text-poke-dark/50">
                    {entry.pokemonName} · {entry.status}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ProposeTradePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [offeredEntryId, setOfferedEntryId] = useState('');
  const [requestedEntryId, setRequestedEntryId] = useState('');
  const [error, setError] = useState('');

  const myCollectionQuery = useQuery({
    queryKey: ['collection'],
    queryFn: () => collectionApi.list(),
  });

  const trainersQuery = useQuery({
    queryKey: ['trainers'],
    queryFn: () => tradeApi.listTrainers(),
  });

  const theirCollectionQuery = useQuery({
    queryKey: ['trainer-collection', userId],
    queryFn: () => tradeApi.trainerCollection(userId!),
    enabled: Boolean(userId),
  });

  const trainer = trainersQuery.data?.find((t) => t.id === userId);

  const proposeMutation = useMutation({
    mutationFn: () =>
      tradeApi.create({
        recipientId: userId!,
        offeredEntryId,
        requestedEntryId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      navigate('/app/trades');
    },
    onError: (err: unknown) => setError((err as ApiError).error ?? 'Failed to propose trade'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Propose trade</h1>
          <p className="mt-2 text-poke-dark/60">
            With {trainer?.displayName ?? 'trainer'} — pick one of yours and one of theirs.
          </p>
        </div>
        <Link to="/app/trades">
          <Button variant="ghost">Back to trades</Button>
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <PickList
          title="Your Pokémon"
          entries={(myCollectionQuery.data ?? []).filter((entry) => entry.status !== 'wishlist')}
          selectedId={offeredEntryId}
          onSelect={setOfferedEntryId}
        />
        <PickList
          title={`${trainer?.displayName ?? 'Their'} Pokémon`}
          entries={(theirCollectionQuery.data ?? []).filter((entry) => entry.status !== 'wishlist')}
          selectedId={requestedEntryId}
          onSelect={setRequestedEntryId}
        />
      </div>

      <Button
        onClick={() => proposeMutation.mutate()}
        disabled={!offeredEntryId || !requestedEntryId || proposeMutation.isPending}
      >
        {proposeMutation.isPending ? 'Sending…' : 'Send trade offer'}
      </Button>
    </div>
  );
}
