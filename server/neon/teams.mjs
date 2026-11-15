const FIELDS = 'id, user_id, name, pokemon_ids, created_at, updated_at'

function requireUserId(user) {
  if (!user || typeof user.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
    throw new TypeError('Authenticated user required')
  }
  return user.id
}
function requireTeamId(id) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new TypeError('Invalid team ID')
  }
  return id
}
function validateTeam(team) {
  if (typeof team?.name !== 'string' || team.name.trim().length < 1 ||
      team.name.trim().length > 80) throw new TypeError('Invalid team name')
  if (!Array.isArray(team.pokemonIds) || team.pokemonIds.length < 1 ||
      team.pokemonIds.length > 6 ||
      !team.pokemonIds.every(id => Number.isSafeInteger(id) && id > 0)) {
    throw new TypeError('Invalid Pokemon IDs')
  }
  return { name: team.name.trim(), ids: team.pokemonIds }
}

export async function listTeams(db, user) {
  const userId = requireUserId(user)
  const { rows } = await db.query(
    `select ${FIELDS} from public.saved_teams where user_id = $1 order by updated_at desc`,
    [userId],
  )
  return rows
}
export async function createTeam(db, user, team) {
  const userId = requireUserId(user)
  const { name, ids } = validateTeam(team)
  const { rows } = await db.query(
    `insert into public.saved_teams (user_id, name, pokemon_ids)
      values ($1, $2, $3::bigint[]) returning ${FIELDS}`,
    [userId, name, ids],
  )
  return rows[0]
}
export async function updateTeam(db, user, id, team) {
  const userId = requireUserId(user)
  const teamId = requireTeamId(id)
  const { name, ids } = validateTeam(team)
  const { rows } = await db.query(
    `update public.saved_teams set name = $3, pokemon_ids = $4::bigint[], updated_at = now()
      where user_id = $1 and id = $2 returning ${FIELDS}`,
    [userId, teamId, name, ids],
  )
  return rows[0] ?? null
}
export async function deleteTeam(db, user, id) {
  const userId = requireUserId(user)
  const teamId = requireTeamId(id)
  const { rowCount } = await db.query(
    'delete from public.saved_teams where user_id = $1 and id = $2',
    [userId, teamId],
  )
  return rowCount > 0
}
