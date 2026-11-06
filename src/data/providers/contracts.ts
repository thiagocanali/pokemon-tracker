export interface Pokemon {
  /** PokéAPI resource ID. This identifies a Pokémon resource/form, not its species Pokédex number. */
  id: number;
  name: string;
  /** Species resource is the canonical source for the National Pokédex number. */
  species?: { name: string; url: string };
  sprites: {
    front_default: string;
    back_default?: string;
  };
  types: { type: { name: string } }[];
  height?: number;
  weight?: number;
  stats?: { stat: { name: string }; base_stat: number }[];
  abilities?: { ability: { name: string } }[];
  moves?: { move: { name: string } }[];
}

/**
 * Returns the National Pokédex number from the species resource URL.
 * Returns null when the species relationship is missing or malformed; a
 * Pokémon resource/form ID must never be presented as a species Dex number.
 */
export function getPokemonDexNumber(pokemon: Pick<Pokemon, "species">): number | null {
  const speciesId = pokemon.species?.url.match(/\/pokemon-species\/(\d+)\/?$/)?.[1];
  const parsed = speciesId ? Number(speciesId) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export interface PokemonPage {
  pokemon: Pokemon[];
  types: string[];
  totalCount: number;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  scope: string;
  limitations: string;
}

export interface PokemonProvider {
  readonly source: DataSource;
  list(page: number, type?: string): Promise<PokemonPage>;
  search(query: string): Promise<Pokemon[]>;
  get(idOrName: string | number): Promise<Pokemon>;
}
