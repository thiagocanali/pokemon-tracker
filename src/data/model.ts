export type LocaleCode = "pt-BR" | "en";
export type PokemonTypeId =
  | "bug"
  | "dark"
  | "dragon"
  | "electric"
  | "fairy"
  | "fighting"
  | "fire"
  | "flying"
  | "ghost"
  | "grass"
  | "ground"
  | "ice"
  | "normal"
  | "poison"
  | "psychic"
  | "rock"
  | "steel"
  | "water";

export type LocalizedText = Partial<Record<LocaleCode, string>>;

export interface DataProvenance {
  sourceId: string;
  sourceUrl: string;
  collectedAt: string;
  sourceUpdatedAt?: string;
  dataVersion?: string;
  confidence?: number;
}

export interface PokemonSpecies {
  id: string;
  dexNumber: number;
  slug: string;
  names: LocalizedText;
  generation?: number;
  region?: string;
  category?: LocalizedText;
  description?: LocalizedText;
  provenance: DataProvenance;
}

export type PokemonFormVariant = "standard" | "regional" | "costume" | "shadow" | "purified" | "mega" | "primal" | "other";

export interface PokemonGoStats {
  attack: number;
  defense: number;
  stamina: number;
  maxCp?: number;
}

export interface PokemonForm {
  id: string;
  speciesId: string;
  slug: string;
  names: LocalizedText;
  variant: PokemonFormVariant;
  isDefault: boolean;
  types: PokemonTypeId[];
  stats?: PokemonGoStats;
  availability?: "available" | "unavailable" | "unknown";
  provenance: DataProvenance;
}

export type MoveCategory = "fast" | "charged";

export interface Move {
  id: string;
  slug: string;
  names: LocalizedText;
  type: PokemonTypeId;
  category: MoveCategory;
  pve?: {
    damage: number;
    energyDelta: number;
    durationMs: number;
  };
  pvp?: {
    damage: number;
    energyDelta: number;
    durationTurns?: number;
    effects?: Record<string, unknown>;
  };
  provenance: DataProvenance;
}

export interface PokemonMove {
  formId: string;
  moveId: string;
  learnMethod?: string;
  eventLimited: boolean;
}

export interface Evolution {
  fromFormId: string;
  toFormId: string;
  candyCost?: number;
  itemId?: string;
  conditions?: string[];
  provenance: DataProvenance;
}

export interface GameEvent {
  id: string;
  slug: string;
  names: LocalizedText;
  description?: LocalizedText;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  bonuses?: string[];
  featuredFormIds?: string[];
  provenance: DataProvenance;
}

export interface Season {
  id: string;
  slug: string;
  names: LocalizedText;
  startsAt: string;
  endsAt: string;
  bonuses?: string[];
  provenance: DataProvenance;
}

export interface RaidRotation {
  id: string;
  startsAt: string;
  endsAt: string;
  bossFormIds: string[];
  provenance: DataProvenance;
}

export interface BattleRanking {
  formId: string;
  mode: "pvp" | "pve";
  league?: string;
  rank: number;
  rating?: number;
  recommendedMoveIds?: string[];
  provenance: DataProvenance;
}

export interface DataChange {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  before: unknown;
  after: unknown;
  detectedAt: string;
  provenance: DataProvenance;
}

export interface SyncRun {
  id: string;
  providerId: string;
  domain: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "succeeded" | "failed";
  recordsRead: number;
  recordsWritten: number;
  error?: string;
}