export interface Pokemon {
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
