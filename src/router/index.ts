import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import PokemonListPage from "../pages/PokemonListPage.vue";
import GamePage from "../pages/GamePage.vue";
import FavoritesPage from "../pages/FavoritesPage.vue";
import PokemonDetail from "../pages/PokemonDetail.vue";
import ComparePage from "../pages/ComparePage.vue";
import MovesPage from "../pages/MovesPage.vue";
import EventsPage from "../pages/EventsPage.vue";
import RaidsPage from "../pages/RaidsPage.vue";
import CountersPage from "../pages/CountersPage.vue";
import TeamBuilderPage from "../pages/TeamBuilderPage.vue";
import AuthPage from "../pages/AuthPage.vue";
import AccountPage from "../pages/AccountPage.vue";
import { supabase } from "../lib/supabase";

const routes = [
  { path: "/", component: HomePage },
  { path: "/pokemon", component: PokemonListPage },
  { path: "/game", component: GamePage },
  { path: "/favorites", component: FavoritesPage },
  { path: "/compare", component: ComparePage },
  { path: "/moves", component: MovesPage },
  { path: "/events", component: EventsPage },
  { path: "/raids", component: RaidsPage },
  { path: "/counters", component: CountersPage },
  { path: "/team-builder", component: TeamBuilderPage },
  { path: "/pokemon/:id", component: PokemonDetail },
  { path: "/auth", component: AuthPage },
  { path: "/account", component: AccountPage },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const { data } = await supabase.auth.getUser();

  if (to.path === "/account" && !data.user) {
    return { path: "/auth", query: { redirect: "/account" } };
  }

  if (to.path === "/auth" && data.user) {
    const redirect = typeof to.query.redirect === "string" && to.query.redirect.startsWith("/")
      ? to.query.redirect
      : "/account";
    return redirect;
  }

  return true;
});

export default router;
