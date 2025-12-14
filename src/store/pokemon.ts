import { defineStore } from "pinia";

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

export const usePokemonStore = defineStore("pokemon", {
  state: () => ({
    list: [] as Pokemon[],
    favorites: [] as number[],
    types: [] as string[],
    loading: false,
    error: "",
    darkMode: false,
  }),
  actions: {
    async init() {
      const dark = localStorage.getItem("darkMode");
      this.darkMode = dark === "true";
      const fav = localStorage.getItem("favorites");
      this.favorites = fav ? JSON.parse(fav) : [];
    },
    async loadList(page = 1, type = "") {
      this.loading = true;
      this.error = "";
      try {
        const offset = (page - 1) * 20;
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=20&offset=${offset}`);
        const data = await res.json();
        const details: Pokemon[] = await Promise.all(
          data.results.map((p: any) => fetch(p.url).then(r => r.json()))
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
    async getPokemon(id: string) {
      this.loading = true;
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!res.ok) throw new Error("Pokémon não encontrado");
        return await res.json();
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
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("darkMode", String(this.darkMode));
      document.body.className = this.darkMode ? "dark" : "";
    }
  }
});
