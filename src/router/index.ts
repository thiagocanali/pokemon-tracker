import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import FavoritesPage from "../pages/FavoritesPage.vue";
import PokemonDetail from "../pages/PokemonDetail.vue";

const routes = [
  { path: "/", component: HomePage },
  { path: "/favorites", component: FavoritesPage },
  { path: "/pokemon/:id", component: PokemonDetail },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
