import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionApi } from '../services/api';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { CollectionStatus } from '@pokedex/shared';

const STATUS_OPTIONS: Array<{ value: CollectionStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'caught', label: 'Caught' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'favorite', label: 'Favorites' },
];

export function CollectionPage() {
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | ''>('');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['collection', statusFilter],
    queryFn: () => collectionApi.list(statusFilter || undefined),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => collectionApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">My Collection</h1>
          <p className="mt-2 text-poke-dark/60">{query.data?.length ?? 0} Pokémon saved</p>
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter(opt.value as CollectionStatus | '')}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-poke-dark/60">Loading collection…</p>
      ) : !query.data?.length ? (
        <Card>
          <CardTitle>Your collection is empty</CardTitle>
          <p className="mt-2 text-sm text-poke-dark/60">
            Explore Pokémon and add them to start building your PokéDex.
          </p>
          <Link to="/app/explore" className="mt-4 inline-block">
            <Button>Explore Pokémon</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.map((entry) => (
            <Card key={entry.id}>
              <div className="flex items-start gap-4">
                {entry.spriteUrl ? (
                  <img src={entry.spriteUrl} alt={entry.pokemonName} className="h-16 w-16 object-contain" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-poke-cream">?</div>
                )}
                <div className="flex-1">
                  <Link
                    to={`/app/pokemon/${entry.pokemonId}`}
                    className="font-serif text-lg capitalize hover:text-poke-sage"
                  >
                    {entry.nickname ?? entry.pokemonName}
                  </Link>
                  {entry.nickname && (
                    <p className="text-xs capitalize text-poke-dark/50">{entry.pokemonName}</p>
                  )}
                  <span className="mt-1 inline-block rounded-full bg-poke-sage/10 px-2 py-0.5 text-xs capitalize text-poke-sage">
                    {entry.status}
                  </span>
                  {entry.notes && <p className="mt-2 text-sm text-poke-dark/60">{entry.notes}</p>}
                </div>
              </div>
              <Button
                variant="danger"
                className="mt-4 w-full"
                onClick={() => removeMutation.mutate(entry.id)}
                disabled={removeMutation.isPending}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
