export interface Pokemon {
  id: number;
  name: string;
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