import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionApi, pokemonApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { ApiError } from '../services/apiClient';
import type { CollectionEntry, CollectionStatus } from '@pokedex/shared';

export function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<CollectionStatus>('caught');
  const [message, setMessage] = useState('');

  const pokemonQuery = useQuery({
    queryKey: ['pokemon', id],
    queryFn: () => pokemonApi.detail(id!),
    enabled: Boolean(id),
  });

  const collectionQuery = useQuery({
    queryKey: ['collection'],
    queryFn: () => collectionApi.list(),
  });

  const ownedEntries =
    collectionQuery.data?.filter((e) => e.pokemonId === pokemonQuery.data?.id) ?? [];
  const shinyOwned = ownedEntries.find((e) => e.isShiny);
  const normalOwned = ownedEntries.find((e) => !e.isShiny);
  const ownsBoth = Boolean(shinyOwned && normalOwned);
  const displayEntry: CollectionEntry | undefined = shinyOwned ?? normalOwned;
  const displaySprite =
    displayEntry?.isShiny && pokemonQuery.data?.spriteShinyUrl
      ? pokemonQuery.data.spriteShinyUrl
      : displayEntry?.spriteUrl ?? pokemonQuery.data?.spriteUrl;

  const addMutation = useMutation({
    mutationFn: () =>
      collectionApi.create({
        pokemonId: pokemonQuery.data!.id,
        nickname: nickname || undefined,
        notes: notes || undefined,
        status,
      }),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
      setMessage(entry.isShiny ? 'Shiny! Added to your collection!' : 'Added to your collection!');
    },
    onError: (err: unknown) => setMessage((err as ApiError).error ?? 'Failed to add'),
  });

  const removeMutation = useMutation({
    mutationFn: (entryId: string) => collectionApi.remove(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
      setMessage('Removed from collection.');
    },
  });

  if (pokemonQuery.isLoading) {
    return <p className="text-poke-dark/60">Loading Pokémon…</p>;
  }

  if (pokemonQuery.isError || !pokemonQuery.data) {
    return <p className="text-red-600">Pokémon not found.</p>;
  }

  const pokemon = pokemonQuery.data;
  const maxStat = Math.max(...pokemon.stats.map((s) => s.baseStat), 1);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col items-center">
        {displaySprite && (
          <img src={displaySprite} alt={pokemon.name} className="h-64 w-64 object-contain" />
        )}
        <h1 className="mt-4 font-serif text-4xl capitalize">{pokemon.name}</h1>
        <p className="text-poke-dark/60">#{String(pokemon.id).padStart(3, '0')}</p>
        {displayEntry?.isShiny && (
          <span className="mt-2 rounded-full bg-poke-yellow/40 px-3 py-1 text-sm font-medium text-poke-dark">
            Shiny
          </span>
        )}
        <div className="mt-3 flex gap-2">
          {pokemon.types.map((type) => (
            <span key={type} className="rounded-full bg-poke-sage px-3 py-1 text-sm capitalize text-white">
              {type}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-poke-dark/60">
          Height: {pokemon.height / 10}m · Weight: {pokemon.weight / 10}kg
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardTitle>Base stats</CardTitle>
          <div className="mt-4 space-y-3">
            {pokemon.stats.map((stat) => (
              <div key={stat.name}>
                <div className="flex justify-between text-sm capitalize">
                  <span>{stat.name.replace('-', ' ')}</span>
                  <span>{stat.baseStat}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-poke-cream">
                  <div
                    className="h-2 rounded-full bg-poke-sage"
                    style={{ width: `${(stat.baseStat / maxStat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Abilities</CardTitle>
          <ul className="mt-3 list-inside list-disc capitalize text-poke-dark/80">
            {pokemon.abilities.map((a) => (
              <li key={a}>{a.replace('-', ' ')}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{ownedEntries.length > 0 ? 'In your collection' : 'Add to collection'}</CardTitle>
          {ownedEntries.length > 0 && (
            <div className="mt-4 space-y-3">
              {ownedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-poke-dark/10 bg-poke-cream/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-poke-dark/80">
                      <span className="capitalize">{entry.status}</span>
                      {entry.isShiny && (
                        <span className="ml-2 rounded-full bg-poke-yellow/40 px-2 py-0.5 text-xs font-medium">
                          Shiny
                        </span>
                      )}
                      {entry.nickname && ` · ${entry.nickname}`}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => removeMutation.mutate(entry.id)}
                    disabled={removeMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!ownsBoth && (
            <div className="mt-4 space-y-4">
              {ownedEntries.length > 0 && (
                <p className="text-sm text-poke-dark/60">
                  You can try catching again for a chance at the{' '}
                  {shinyOwned ? 'normal' : 'shiny'} form (30% shiny rate).
                </p>
              )}
              <Input label="Nickname (optional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <label className="block space-y-1">
                <span className="text-sm font-medium text-poke-dark/80">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CollectionStatus)}
                  className="w-full rounded-lg border border-poke-dark/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="caught">Caught</option>
                  <option value="wishlist">Wishlist</option>
                  <option value="favorite">Favorite</option>
                </select>
              </label>
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                {ownedEntries.length > 0 ? 'Try catch again' : 'Add to collection'}
              </Button>
            </div>
          )}
          {message && <p className="mt-3 text-sm text-poke-sage">{message}</p>}
        </Card>
      </div>
    </div>
  );
}
