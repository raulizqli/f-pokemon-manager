type LocalInsightsInput = {
  total: number;
  byStatus: Record<string, number>;
  topTypes: string[];
  sampleNames: string[];
};

const TYPE_RECOMMENDATIONS: Record<string, string> = {
  normal: 'Eevee',
  fire: 'Charmander',
  water: 'Squirtle',
  grass: 'Bulbasaur',
  electric: 'Pikachu',
  psychic: 'Abra',
  fighting: 'Machop',
  poison: 'Nidoran',
  ground: 'Sandshrew',
  flying: 'Pidgey',
  bug: 'Caterpie',
  rock: 'Geodude',
  ghost: 'Gastly',
  dragon: 'Dratini',
  dark: 'Murkrow',
  steel: 'Magnemite',
  fairy: 'Clefairy',
  ice: 'Seel',
};

const DEFAULT_RECOMMENDATIONS = ['Pikachu', 'Eevee', 'Squirtle'];

export function buildLocalInsights(input: LocalInsightsInput): {
  insights: string;
  recommendations: string[];
} {
  const { total, byStatus, topTypes, sampleNames } = input;
  const caught = byStatus.caught ?? 0;

  const dominant = topTypes.slice(0, 2);
  const missingTypes = Object.keys(TYPE_RECOMMENDATIONS).filter(
    (type) => !topTypes.includes(type),
  );

  const recommendations: string[] = [];
  for (const type of missingTypes) {
    const name = TYPE_RECOMMENDATIONS[type];
    if (name && !recommendations.includes(name)) {
      recommendations.push(name);
    }
    if (recommendations.length >= 3) break;
  }
  for (const fallback of DEFAULT_RECOMMENDATIONS) {
    if (recommendations.length >= 3) break;
    if (!recommendations.includes(fallback)) recommendations.push(fallback);
  }

  const typeLine =
    dominant.length > 0
      ? `Your collection leans toward ${dominant.join(' and ')} types.`
      : 'Your collection has room to grow across more types.';

  const sampleLine =
    sampleNames.length > 0
      ? ` Recent catches include ${sampleNames.slice(0, 4).join(', ')}.`
      : '';

  const insights =
    `You have ${total} Pokémon (${caught} caught). ${typeLine}${sampleLine} ` +
    `These offline suggestions focus on types you have not collected much yet while AI providers are unavailable.`;

  return { insights: insights.trim(), recommendations: recommendations.slice(0, 3) };
}

export const LOCAL_INSIGHTS_MODEL = 'local-heuristic';
