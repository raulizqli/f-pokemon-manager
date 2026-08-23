import type { PokemonSummary } from '@pokedex/shared';
import { PokemonCard } from './PokemonCard';

export function PokemonGrid({ pokemon }: { pokemon: PokemonSummary[] }) {
  if (pokemon.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-poke-dark/20 py-16 text-center text-poke-dark/60">
        No Pokémon found. Try a different search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {pokemon.map((p) => (
        <PokemonCard key={p.id} pokemon={p} />
      ))}
    </div>
  );
}
