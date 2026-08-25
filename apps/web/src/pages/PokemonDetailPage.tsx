import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionApi, pokemonApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { ApiError } from '../services/apiClient';
import type { CollectionEntry, EditableCollectionStatus, PokemonSummary } from '@pokedex/shared';

function ownsForm(
  collection: CollectionEntry[] | undefined,
  pokemonId: number,
  isShiny: boolean,
): boolean {
  return Boolean(collection?.some((entry) => entry.pokemonId === pokemonId && entry.isShiny === isShiny));
}

function resolveEvolveTarget(
  evolutions: PokemonSummary[],
  targetPokemonId: number | '',
): PokemonSummary | undefined {
  if (evolutions.length === 0) return undefined;
  if (evolutions.length === 1) return evolutions[0];
  if (!targetPokemonId) return undefined;
  return evolutions.find((evo) => evo.id === targetPokemonId);
}

export function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<EditableCollectionStatus>('caught');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [evolveError, setEvolveError] = useState('');
  const [targetPokemonId, setTargetPokemonId] = useState<number | ''>('');
  const [evolvingEntryId, setEvolvingEntryId] = useState<string | null>(null);

  const pokemonQuery = useQuery({
    queryKey: ['pokemon', id],
    queryFn: () => pokemonApi.detail(id!),
    enabled: Boolean(id),
  });

  const collectionQuery = useQuery({
    queryKey: ['collection'],
    queryFn: () => collectionApi.list(),
  });

  const evolutionsQuery = useQuery({
    queryKey: ['pokemon-evolutions', pokemonQuery.data?.id],
    queryFn: () => pokemonApi.evolutions(pokemonQuery.data!.id),
    enabled: Boolean(pokemonQuery.data?.id),
  });

  const collection = collectionQuery.data;
  const ownedEntries =
    collection?.filter((e) => e.pokemonId === pokemonQuery.data?.id) ?? [];
  const shinyOwned = ownedEntries.find((e) => e.isShiny);
  const normalOwned = ownedEntries.find((e) => !e.isShiny);
  const ownsBoth = Boolean(shinyOwned && normalOwned);
  const displayEntry: CollectionEntry | undefined = shinyOwned ?? normalOwned;
  const displaySprite =
    displayEntry?.isShiny && pokemonQuery.data?.spriteShinyUrl
      ? pokemonQuery.data.spriteShinyUrl
      : displayEntry?.spriteUrl ?? pokemonQuery.data?.spriteUrl;

  const evolutions: PokemonSummary[] = evolutionsQuery.data ?? [];
  const canEvolve = evolutions.length > 0;
  const selectedTarget = resolveEvolveTarget(evolutions, targetPokemonId);

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
      setMessageTone('success');
      setMessage(entry.isShiny ? 'Shiny! Added to your collection!' : 'Added to your collection!');
    },
    onError: (err: unknown) => {
      setMessageTone('error');
      setMessage((err as ApiError).error ?? 'Failed to add');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (entryId: string) => collectionApi.remove(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
      setMessageTone('success');
      setMessage('Removed from collection.');
    },
  });

  const evolveMutation = useMutation({
    mutationFn: ({ entryId, targetId }: { entryId: string; targetId?: number }) =>
      collectionApi.evolve(entryId, targetId ? { targetPokemonId: targetId } : {}),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pokemon'] });
      setEvolvingEntryId(null);
      setEvolveError('');
      setMessageTone('success');
      setMessage(
        entry.isShiny
          ? `Evolved into shiny ${entry.pokemonName}!`
          : `Evolved into ${entry.pokemonName}!`,
      );
      navigate(`/app/pokemon/${entry.pokemonId}`, { replace: true });
    },
    onError: (err: unknown) => {
      setEvolvingEntryId(null);
      const apiError = err as ApiError;
      const targetName = selectedTarget?.name;
      if (apiError.code === 'CONFLICT' && targetName) {
        setEvolveError(
          `You already have ${targetName} in your collection, so this one can’t evolve into that form.`,
        );
      } else {
        setEvolveError(apiError.error ?? 'Failed to evolve');
      }
    },
  });

  function isEvolveBlocked(entry: CollectionEntry): boolean {
    if (!canEvolve) return true;
    if (evolutions.length > 1 && !selectedTarget) return true;
    const target = selectedTarget ?? evolutions[0];
    if (!target) return true;
    return ownsForm(collection, target.id, entry.isShiny);
  }

  function blockedReason(entry: CollectionEntry): string | null {
    if (!canEvolve) return null;
    if (evolutions.length > 1 && !selectedTarget) return null;
    const target = selectedTarget ?? evolutions[0];
    if (!target || !ownsForm(collection, target.id, entry.isShiny)) return null;
    const shinyLabel = entry.isShiny ? ' shiny' : '';
    return `You already have${shinyLabel} ${target.name} in your collection, so this one can’t evolve into that form.`;
  }

  function handleEvolve(entry: CollectionEntry) {
    setEvolveError('');
    if (evolutions.length > 1 && !targetPokemonId) {
      setEvolveError('Choose an evolution first');
      return;
    }
    const reason = blockedReason(entry);
    if (reason) {
      setEvolveError(reason);
      return;
    }
    setEvolvingEntryId(entry.id);
    evolveMutation.mutate({
      entryId: entry.id,
      targetId: evolutions.length > 1 ? Number(targetPokemonId) : undefined,
    });
  }

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

        {ownedEntries.length > 0 && (
          <Card>
            <CardTitle>Evolve</CardTitle>
            {evolutionsQuery.isLoading ? (
              <p className="mt-3 text-sm text-poke-dark/60">Checking evolution chain…</p>
            ) : !canEvolve ? (
              <p className="mt-3 text-sm text-poke-dark/60">This Pokémon cannot evolve further.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-3">
                  {evolutions.map((evo) => {
                    const ownedNormal = ownsForm(collection, evo.id, false);
                    const ownedShiny = ownsForm(collection, evo.id, true);
                    return (
                      <div
                        key={evo.id}
                        className="flex items-center gap-2 rounded-lg border border-poke-dark/10 bg-poke-cream/40 px-3 py-2"
                      >
                        {evo.spriteUrl && (
                          <img src={evo.spriteUrl} alt={evo.name} className="h-10 w-10 object-contain" />
                        )}
                        <div>
                          <span className="text-sm capitalize">{evo.name}</span>
                          {(ownedNormal || ownedShiny) && (
                            <p className="text-xs text-poke-dark/50">
                              Owned
                              {ownedNormal && ownedShiny
                                ? ' (normal & shiny)'
                                : ownedShiny
                                  ? ' (shiny)'
                                  : ' (normal)'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {evolutions.length > 1 && (
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-poke-dark/80">Choose evolution</span>
                    <select
                      value={targetPokemonId}
                      onChange={(e) => {
                        setEvolveError('');
                        setTargetPokemonId(e.target.value ? Number(e.target.value) : '');
                      }}
                      className="w-full rounded-lg border border-poke-dark/15 bg-white px-3 py-2 text-sm capitalize"
                    >
                      <option value="">Select…</option>
                      {evolutions.map((evo) => {
                        const ownedByAnyForm =
                          ownsForm(collection, evo.id, false) || ownsForm(collection, evo.id, true);
                        return (
                          <option key={evo.id} value={evo.id}>
                            {evo.name}
                            {ownedByAnyForm ? ' (owned)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}

                {ownedEntries.map((entry) => {
                  const blocked = isEvolveBlocked(entry);
                  const reason = blockedReason(entry);
                  return (
                    <div key={entry.id} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-poke-dark/10 px-3 py-2">
                        <p className="text-sm text-poke-dark/70">
                          Evolve your{' '}
                          <span className="capitalize">{entry.nickname ?? entry.pokemonName}</span>
                          {entry.isShiny && (
                            <span className="ml-2 rounded-full bg-poke-yellow/40 px-2 py-0.5 text-xs font-medium">
                              Shiny
                            </span>
                          )}
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => handleEvolve(entry)}
                          disabled={evolveMutation.isPending || blocked}
                        >
                          {evolvingEntryId === entry.id && evolveMutation.isPending
                            ? 'Evolving…'
                            : 'Evolve'}
                        </Button>
                      </div>
                      {reason && (
                        <p className="text-sm text-poke-dark/60">
                          {reason}{' '}
                          {selectedTarget && (
                            <Link
                              to={`/app/pokemon/${selectedTarget.id}`}
                              className="capitalize text-poke-sage underline-offset-2 hover:underline"
                            >
                              View {selectedTarget.name}
                            </Link>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}

                {evolveError && <p className="text-sm text-red-600">{evolveError}</p>}
              </div>
            )}
          </Card>
        )}

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
                  onChange={(e) => setStatus(e.target.value as EditableCollectionStatus)}
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
          {message && (
            <p className={`mt-3 text-sm ${messageTone === 'error' ? 'text-red-600' : 'text-poke-sage'}`}>
              {message}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
