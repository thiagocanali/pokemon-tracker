import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";
import { pokeApiPokemonProvider } from "../data/providers/pokeapi";
import type { Pokemon } from "../data/providers/contracts";

export type { Pokemon } from "../data/providers/contracts";

let storeInitialization: Promise<void> | null = null;
let storeInitialized = false;

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

        const localFavorites = localStorage.getItem("favorites");
        try {
          const parsedFavorites = localFavorites ? JSON.parse(localFavorites) : [];
          this.favorites = Array.isArray(parsedFavorites) ? parsedFavorites.map(Number).filter(Number.isInteger) : [];
        } catch {
          this.favorites = [];
        }
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
        const accountFavorites = data.user?.user_metadata?.favorites;
        if (!Array.isArray(accountFavorites)) return;
        this.favorites = accountFavorites.map(Number).filter(Number.isInteger);
        localStorage.setItem("favorites", JSON.stringify(this.favorites));
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
        return await pokeApiPokemonProvider.get(id);
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

      localStorage.setItem("favorites", JSON.stringify(this.favorites));
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
