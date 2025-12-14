import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import FavoritesPage from "../pages/FavoritesPage.vue";
import PokemonDetailsPage from "../pages/PokemonDetailsPage.vue";

const router = createRouter({
  history: createWebHistory("/pokemon-tracker/"),
  routes: [
    { path: "/", component: HomePage },
    { path: "/favorites", component: FavoritesPage },
    { path: "/pokemon/:id", component: PokemonDetailsPage }
  ]
});

export default router;
