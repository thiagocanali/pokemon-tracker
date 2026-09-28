import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";

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
}

const API_BASE = "https://pokeapi.co/api/v2";
const responseCache = new Map<string, unknown>();

async function fetchJson<T>(path: string): Promise<T> {
  const cached = responseCache.get(path);
  if (cached) return cached as T;

  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error("Não foi possível consultar a Pokédex");
  const data = (await response.json()) as T;
  responseCache.set(path, data);
  return data;
}

export const usePokemonStore = defineStore("pokemon", {
  state: () => ({
    list: [] as Pokemon[],
    searchResults: [] as Pokemon[],
    favorites: [] as number[],
    types: [] as string[],
    loading: false,
    error: "",
    searchRequestId: 0,
    darkMode: false,
  }),
  actions: {
    async init() {
      const dark = localStorage.getItem("darkMode") === "true";
      this.darkMode = dark;
      document.body.className = dark ? "dark" : "";

      const { data } = await supabase.auth.getUser();
      const accountFavorites = data.user?.user_metadata?.favorites;
      if (Array.isArray(accountFavorites)) {
        this.favorites = accountFavorites.map(Number).filter(Number.isInteger);
        localStorage.setItem("favorites", JSON.stringify(this.favorites));
        return;
      }

      try {
        const storedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        this.favorites = Array.isArray(storedFavorites)
          ? storedFavorites.map(Number).filter(Number.isInteger)
          : [];
      } catch {
        this.favorites = [];
      }
    },
    async loadList(page = 1, type = "") {
      this.loading = true;
      this.error = "";
      try {
        const offset = (page - 1) * 20;
        const data = await fetchJson<{ results: { name: string; url: string }[] }>(`/pokemon?limit=20&offset=${offset}`);
        const details: Pokemon[] = await Promise.all(
          data.results.map((pokemon) => fetchJson<Pokemon>(`/pokemon/${pokemon.name}`))
        );
        this.list = type
          ? details.filter(p => p.types.some(t => t.type.name === type))
          : details;

        // Atualiza tipos únicos
        const allTypes = new Set<string>();
        details.forEach(p => p.types.forEach(t => allTypes.add(t.type.name)));
        this.types = Array.from(allTypes).sort();
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async searchPokemon(query: string) {
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        this.searchResults = [];
        return;
      }

      const requestId = ++this.searchRequestId;
      this.loading = true;
      this.error = "";
      try {
        // Consultas exatas usam o endpoint direto e continuam funcionando mesmo
        // quando a lista completa da Pokédex ainda não foi carregada.
        let results: Pokemon[] = [];
        try {
          results = [await fetchJson<Pokemon>(`/pokemon/${encodeURIComponent(normalized)}`)];
        } catch {
          const catalog = await fetchJson<{ results: { name: string; url: string }[] }>("/pokemon?limit=2000&offset=0");
          const matches = catalog.results
            .filter((pokemon) => pokemon.name.includes(normalized) || pokemon.url.split("/").filter(Boolean).pop() === normalized)
            .slice(0, 20);
          results = await Promise.all(matches.map((pokemon) => fetchJson<Pokemon>(`/pokemon/${pokemon.name}`)));
        }
        if (requestId !== this.searchRequestId) return;
        this.searchResults = results;
        const allTypes = new Set<string>();
        this.searchResults.forEach((pokemon) => pokemon.types.forEach((type) => allTypes.add(type.type.name)));
        this.types = Array.from(allTypes).sort();
      } catch (e: any) {
        if (requestId !== this.searchRequestId) return;
        this.error = e.message;
        this.searchResults = [];
      } finally {
        if (requestId === this.searchRequestId) this.loading = false;
      }
    },

    async getPokemon(id: string) {
      this.loading = true;
      try {
        return await fetchJson<Pokemon>(`/pokemon/${encodeURIComponent(id)}`);
      } finally {
        this.loading = false;
      }
    },
    async toggleFavorite(id: number) {
      if (this.favorites.includes(id)) {
        this.favorites = this.favorites.filter(f => f !== id);
      } else {
        this.favorites.push(id);
      }

      const serialized = JSON.stringify(this.favorites);
      localStorage.setItem("favorites", serialized);

      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.auth.updateUser({
          data: { favorites: this.favorites },
        });
      }
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("darkMode", String(this.darkMode));
      document.body.className = this.darkMode ? "dark" : "";
    }
  }
});
