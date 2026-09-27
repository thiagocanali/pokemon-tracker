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
    async searchPokemon(query: string) {
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        await this.loadList(1);
        return;
      }

      this.loading = true;
      this.error = "";
      try {
        // Consultas exatas usam o endpoint direto e continuam funcionando mesmo
        // quando a lista completa da Pokédex ainda não foi carregada.
        const directRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(normalized)}`);
        let matches: { url: string }[] = [];
        if (directRes.ok) {
          matches = [{ url: `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(normalized)}` }];
        } else {
          const catalogRes = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000&offset=0");
          if (!catalogRes.ok) throw new Error("Não foi possível consultar a Pokédex");
          const catalog = await catalogRes.json();
          matches = catalog.results
            .filter((pokemon: { name: string; url: string }) => pokemon.name.includes(normalized) || pokemon.url.split("/").filter(Boolean).pop() === normalized)
            .slice(0, 20);
        }
        this.list = await Promise.all(matches.map((pokemon) => fetch(pokemon.url).then((res) => {
          if (!res.ok) throw new Error("Não foi possível carregar os dados do Pokémon");
          return res.json();
        })));
        const allTypes = new Set<string>();
        this.list.forEach((pokemon) => pokemon.types.forEach((type) => allTypes.add(type.type.name)));
        this.types = Array.from(allTypes).sort();
      } catch (e: any) {
        this.error = e.message;
        this.list = [];
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
