import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CollectionEntry, CollectionStatus, EditableCollectionStatus } from '@pokedex/shared';
import { collectionApi } from '../services/api';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { ApiError } from '../services/apiClient';

const STATUS_OPTIONS: Array<{ value: CollectionStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'caught', label: 'Caught' },
  { value: 'traded', label: 'Traded' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'favorite', label: 'Favorites' },
];

const EDITABLE_STATUSES: EditableCollectionStatus[] = ['caught', 'wishlist', 'favorite'];

function CollectionEntryCard({
  entry,
  onRemoved,
}: {
  entry: CollectionEntry;
  onRemoved: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(entry.nickname ?? '');
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [status, setStatus] = useState<EditableCollectionStatus>(
    entry.status === 'traded' ? 'caught' : (entry.status as EditableCollectionStatus),
  );
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () =>
      collectionApi.update(entry.id, {
        nickname: nickname.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
    },
    onError: (err) => {
      const apiError = err as unknown as ApiError;
      setError(apiError.error ?? 'Could not update entry');
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => collectionApi.remove(entry.id),
    onSuccess: () => {
      setError(null);
      onRemoved();
    },
    onError: (err) => {
      const apiError = err as unknown as ApiError;
      setError(apiError.error ?? 'Could not remove entry');
    },
  });

  const busy = updateMutation.isPending || removeMutation.isPending;

  return (
    <Card>
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
          {entry.isShiny && (
            <span className="mt-1 ml-2 inline-block rounded-full bg-poke-yellow/40 px-2 py-0.5 text-xs font-medium text-poke-dark">
              Shiny
            </span>
          )}
          {!editing && entry.notes && (
            <p className="mt-2 text-sm text-poke-dark/60">{entry.notes}</p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={busy}
          />
          <label className="block space-y-1">
            <span className="text-sm font-medium text-poke-dark/80">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              rows={3}
              className="w-full rounded-lg border border-poke-dark/15 bg-white px-3 py-2 text-sm outline-none focus:border-poke-sage focus:ring-2 focus:ring-poke-sage/20"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-poke-dark/80">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EditableCollectionStatus)}
              disabled={busy}
              className="w-full rounded-lg border border-poke-dark/15 bg-white px-3 py-2 text-sm outline-none focus:border-poke-sage focus:ring-2 focus:ring-poke-sage/20"
            >
              {EDITABLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => updateMutation.mutate()} disabled={busy}>
              Save
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setEditing(false);
                setError(null);
                setNickname(entry.nickname ?? '');
                setNotes(entry.notes ?? '');
                setStatus(
                  entry.status === 'traded' ? 'caught' : (entry.status as EditableCollectionStatus),
                );
              }}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setEditing(true);
              setError(null);
            }}
            disabled={busy}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => removeMutation.mutate()}
            disabled={busy}
          >
            Remove
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}

export function CollectionPage() {
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | ''>('');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['collection', statusFilter],
    queryFn: () => collectionApi.list(statusFilter || undefined),
  });

  const invalidateCollection = () => {
    queryClient.invalidateQueries({ queryKey: ['collection'] });
    queryClient.invalidateQueries({ queryKey: ['collection-stats'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">My Collection</h1>
          <p className="mt-2 text-poke-dark/60">{query.data?.length ?? 0} Pokémon saved</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            <CollectionEntryCard key={entry.id} entry={entry} onRemoved={invalidateCollection} />
          ))}
        </div>
      )}
    </div>
  );
}
