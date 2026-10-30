import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";
import { pokeApiPokemonProvider } from "../data/providers/pokeapi";
import { getCanonicalPokemon } from "../data/service";
import type { Pokemon } from "../data/providers/contracts";

export type { Pokemon } from "../data/providers/contracts";

const FAVORITES_STORAGE_KEY = "pokemon-tracker:favorites";

let storeInitialization: Promise<void> | null = null;
let storeInitialized = false;

function readLocalFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? [...new Set(parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
      : [];
  } catch {
    return [];
  }
}

function persistLocalFavorites(favorites: number[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Favorites remain available in memory for the current session.
  }
}

export const usePokemonStore = defineStore("pokemon", {
  state: () => ({
    list: [] as Pokemon[],
    searchResults: [] as Pokemon[],
    favorites: [] as number[],
    types: [] as string[],
    totalCount: 0,
    loading: false,
    error: "",
    searchRequestId: 0,
    darkMode: true,
  }),
  actions: {
    init() {
      if (storeInitialized) return Promise.resolve();
      if (storeInitialization) return storeInitialization;

      storeInitialization = (async () => {
        const dark = localStorage.getItem("darkMode") !== "false";
        this.darkMode = dark;
        document.body.classList.toggle("dark", dark);

        this.favorites = readLocalFavorites();
        if (!supabase) return;
        await this.syncFavoritesFromAccount();
      })().finally(() => {
        storeInitialized = true;
        storeInitialization = null;
      });

      return storeInitialization;
    },
    async syncFavoritesFromAccount() {
      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;

        const accountFavorites = data.user.user_metadata?.favorites;
        const remote = Array.isArray(accountFavorites)
          ? accountFavorites.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
          : [];
        this.favorites = [...new Set([...remote, ...this.favorites])];
        persistLocalFavorites(this.favorites);

        if (this.favorites.length !== remote.length) {
          const { error } = await supabase.auth.updateUser({ data: { favorites: this.favorites } });
          if (error) this.error = "Não foi possível sincronizar seus favoritos.";
        }
      } catch {
        return;
      }
    },
    async loadList(page = 1, type = "") {
      this.loading = true;
      this.error = "";
      try {
        const result = await pokeApiPokemonProvider.list(page, type);
        this.list = result.pokemon;
        this.types = result.types;
        this.totalCount = result.totalCount;
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async searchPokemon(query: string) {
      const normalized = query.trim().toLowerCase();
      const requestId = ++this.searchRequestId;
      if (!normalized) {
        this.searchResults = [];
        this.loading = false;
        return;
      }

      this.loading = true;
      this.error = "";
      try {
        const results = await pokeApiPokemonProvider.search(normalized);
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

    async getPokemon(id: string | number) {
      this.loading = true;
      try {
        const result = await getCanonicalPokemon(id);
        return result.data;
      } finally {
        this.loading = false;
      }
    },
    async toggleFavorite(id: number) {
      if (!Number.isInteger(id) || id <= 0) return;

      if (this.favorites.includes(id)) {
        this.favorites = this.favorites.filter(f => f !== id);
      } else {
        this.favorites.push(id);
      }
      persistLocalFavorites(this.favorites);

      if (!supabase) return;

      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { error } = await supabase.auth.updateUser({
          data: { favorites: this.favorites },
        });
        if (error) this.error = "Não foi possível sincronizar seus favoritos.";
      } catch {
        this.error = "Favorito salvo neste dispositivo; não foi possível sincronizar agora.";
      }
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("darkMode", String(this.darkMode));
      document.body.classList.toggle("dark", this.darkMode);
    }
  }
});
