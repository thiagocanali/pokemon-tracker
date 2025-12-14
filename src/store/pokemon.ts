import { defineStore } from "pinia";

export interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    back_default?: string;
  };
  types: {
    type: {
      name: string;
    };
  }[];
  height?: number;
  weight?: number;
}

interface PokemonState {
  list: Pokemon[];
  favorites: number[];
  types: string[];
  darkMode: boolean;
  loading: boolean;
  error: string;
}

export const usePokemonStore = defineStore("pokemon", {
  state: (): PokemonState => ({
    list: [],
    favorites: [],
    types: [],
    darkMode: false,
    loading: false,
    error: "",
  }),

  actions: {
    async init() {
      this.favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      this.darkMode = localStorage.getItem("dark") === "true";
      await this.loadTypes();
    },

    async loadTypes() {
      try {
        const res = await fetch("https://pokeapi.co/api/v2/type");
        const data = await res.json();
        this.types = data.results.map((t: any) => t.name);
      } catch (e) {
        console.error("Erro ao carregar tipos:", e);
      }
    },

    async loadList(page: number = 1, type: string = "") {
      this.loading = true;
      this.error = "";
      const limit = 20;
      const offset = (page - 1) * limit;

      try {
        if (type) {
          const typeRes = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
          const typeData = await typeRes.json();
          const pokemonOfType = typeData.pokemon.map((p: any) => p.pokemon);
          this.list = await Promise.all(
            pokemonOfType.slice(offset, offset + limit).map(async (p: any) => {
              const res = await fetch(p.url);
              return await res.json();
            })
          );
        } else {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
          const data = await res.json();
          this.list = await Promise.all(
            data.results.map(async (p: any) => {
              const res = await fetch(p.url);
              return await res.json();
            })
          );
        }
      } catch (e: any) {
        this.error = "Erro ao carregar lista de Pokémon.";
      } finally {
        this.loading = false;
      }
    },

    async getPokemon(idOrName: string) {
      this.loading = true;
      this.error = "";
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
        if (!res.ok) throw new Error("Pokémon não encontrado");
        const data = await res.json();
        this.list = [data];
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    toggleFavorite(id: number) {
      if (this.favorites.includes(id)) {
        this.favorites = this.favorites.filter(f => f !== id);
      } else {
        this.favorites.push(id);
      }
      localStorage.setItem("favorites", JSON.stringify(this.favorites));
    },

    toggleDark() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("dark", String(this.darkMode));
    },
  },
});
