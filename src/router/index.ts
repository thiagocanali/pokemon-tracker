import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import PokemonListPage from "../pages/PokemonListPage.vue";
import GamePage from "../pages/GamePage.vue";
import FavoritesPage from "../pages/FavoritesPage.vue";
import PokemonDetail from "../pages/PokemonDetail.vue";
import ComparePage from "../pages/ComparePage.vue";

const routes = [
  { path: "/", component: HomePage },
  { path: "/pokemon", component: PokemonListPage },
  { path: "/game", component: GamePage },
  { path: "/favorites", component: FavoritesPage },
  { path: "/compare", component: ComparePage },
  { path: "/pokemon/:id", component: PokemonDetail },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
