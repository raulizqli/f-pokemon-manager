import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pokemonApi } from '../services/api';
import { PokemonGrid } from '../components/pokemon/PokemonGrid';
import { LoadingSkeleton } from '../components/pokemon/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const PAGE_SIZE = 20;

export function ExplorePage() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const query = useQuery({
    queryKey: ['pokemon-list', offset, search],
    queryFn: () => pokemonApi.list({ limit: PAGE_SIZE, offset, search: search || undefined }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Explore Pokémon</h1>
        <p className="mt-2 text-poke-dark/60">Browse the PokéAPI catalog and add Pokémon to your collection.</p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <Input
          label="Search by name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="e.g. pikachu"
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
                setOffset(0);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {query.isLoading ? (
        <LoadingSkeleton />
      ) : query.isError ? (
        <p className="text-red-600">Failed to load Pokémon. Please try again.</p>
      ) : (
        <>
          <PokemonGrid pokemon={query.data?.results ?? []} />
          {!search && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <span className="text-sm text-poke-dark/60">
                Showing {offset + 1}–{offset + (query.data?.results.length ?? 0)} of {query.data?.count}
              </span>
              <Button
                variant="ghost"
                disabled={!query.data?.nextOffset}
                onClick={() => setOffset(query.data!.nextOffset!)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
