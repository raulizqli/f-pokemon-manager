import { Link } from 'react-router-dom';
import type { PokemonSummary } from '@pokedex/shared';

const typeColors: Record<string, string> = {
  normal: 'bg-gray-400',
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  grass: 'bg-green-500',
  electric: 'bg-yellow-400',
  ice: 'bg-cyan-300',
  fighting: 'bg-red-700',
  poison: 'bg-purple-500',
  ground: 'bg-amber-700',
  flying: 'bg-indigo-300',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-800',
  ghost: 'bg-violet-600',
  dragon: 'bg-indigo-700',
  dark: 'bg-gray-800',
  steel: 'bg-gray-500',
  fairy: 'bg-pink-300',
};

export function PokemonCard({ pokemon }: { pokemon: PokemonSummary }) {
  return (
    <Link
      to={`/app/pokemon/${pokemon.id}`}
      className="group rounded-2xl border border-poke-dark/10 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex flex-col items-center gap-3">
        {pokemon.spriteUrl ? (
          <img
            src={pokemon.spriteUrl}
            alt={pokemon.name}
            className="h-24 w-24 object-contain transition group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-poke-cream text-2xl">?</div>
        )}
        <div className="text-center">
          <p className="text-xs text-poke-dark/50">#{String(pokemon.id).padStart(3, '0')}</p>
          <h3 className="font-serif text-lg capitalize">{pokemon.name}</h3>
        </div>
        <div className="flex flex-wrap justify-center gap-1">
          {pokemon.types.map((type) => (
            <span
              key={type}
              className={`rounded-full px-2 py-0.5 text-xs capitalize text-white ${typeColors[type] ?? 'bg-gray-400'}`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
