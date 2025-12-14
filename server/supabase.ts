import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);

export interface DbTeam {
  id?: string;
  hltv_id: string;
  name: string;
  country: string;
  country_code: string;
  rank: number;
  points: number;
  team_url: string;
  logo_url?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbMatch {
  id?: number;
  team_id: string;
  hltv_match_id: string;
  date: string;
  opponent: string;
  opponent_logo?: string;
  event: string;
  result: string;
  is_win: boolean;
  match_url: string;
  map_score?: string;
  created_at?: string;
}

export interface DbPlayer {
  id?: number;
  team_id: string;
  nickname: string;
  real_name?: string;
  country?: string;
  country_code?: string;
  role?: string;
  is_active: boolean;
  created_at?: string;
}

export async function getTeams(): Promise<DbTeam[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("rank", { ascending: true });

  if (error) {
    console.error("[Supabase] Error fetching teams:", error.message);
    return [];
  }
  return data || [];
}

export async function upsertTeam(team: DbTeam): Promise<DbTeam | null> {
  const { data, error } = await supabase
    .from("teams")
    .upsert(
      {
        ...team,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "hltv_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Error upserting team:", error.message);
    return null;
  }
  return data;
}

export async function getMatchesByTeam(teamId: string): Promise<DbMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("date", { ascending: false });

  if (error) {
    console.error("[Supabase] Error fetching matches:", error.message);
    return [];
  }
  return data || [];
}

export async function insertMatches(matches: DbMatch[]): Promise<boolean> {
  if (matches.length === 0) return true;

  const { error } = await supabase
    .from("matches")
    .upsert(matches, { onConflict: "team_id,hltv_match_id" });

  if (error) {
    console.error("[Supabase] Error inserting matches:", error.message);
    return false;
  }
  return true;
}

export async function getPlayersByTeam(teamId: string): Promise<DbPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true);

  if (error) {
    console.error("[Supabase] Error fetching players:", error.message);
    return [];
  }
  return data || [];
}

export async function upsertPlayers(players: DbPlayer[]): Promise<boolean> {
  if (players.length === 0) return true;

  const { error } = await supabase
    .from("players")
    .upsert(players, { onConflict: "team_id,nickname" });

  if (error) {
    console.error("[Supabase] Error upserting players:", error.message);
    return false;
  }
  return true;
}

export async function saveTeamWithMatches(
  hltvTeam: {
    id: string;
    name: string;
    country: string;
    countryCode: string;
    rank: number;
    points?: number;
    teamUrl: string;
    logo?: string;
    color?: string;
  },
  matches: Array<{
    id: string;
    date: string;
    opponent: string;
    opponentLogo?: string;
    event: string;
    result: string;
    matchUrl: string;
    mapScore?: string;
  }>
): Promise<boolean> {
  const hltvId = hltvTeam.id;

  const dbTeam: DbTeam = {
    hltv_id: hltvId,
    name: hltvTeam.name,
    country: hltvTeam.country,
    country_code: hltvTeam.countryCode,
    rank: hltvTeam.rank,
    points: hltvTeam.points || 0,
    team_url: hltvTeam.teamUrl,
    logo_url: hltvTeam.logo,
    color: hltvTeam.color,
  };

  const savedTeam = await upsertTeam(dbTeam);
  if (!savedTeam || !savedTeam.id) return false;

  const dbMatches: DbMatch[] = matches.map((match) => {
    const resultParts = match.result.split("-");
    const team1Score = parseInt(resultParts[0]) || 0;
    const team2Score = parseInt(resultParts[1]) || 0;
    const isWin = team1Score > team2Score;

    return {
      team_id: savedTeam.id!,
      hltv_match_id: match.id,
      date: match.date,
      opponent: match.opponent,
      opponent_logo: match.opponentLogo,
      event: match.event,
      result: match.result,
      is_win: isWin,
      match_url: match.matchUrl,
      map_score: match.mapScore,
    };
  });

  return await insertMatches(dbMatches);
}

export async function updateTeamColor(hltvId: string, color: string): Promise<boolean> {
  const { error } = await supabase
    .from("teams")
    .update({ color, updated_at: new Date().toISOString() })
    .eq("hltv_id", hltvId);

  if (error) {
    console.error("[Supabase] Error updating team color:", error.message);
    return false;
  }
  return true;
}

export async function getTeamWithDetails(hltvId: string): Promise<{
  team: DbTeam | null;
  matches: DbMatch[];
  players: DbPlayer[];
}> {
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("hltv_id", hltvId)
    .single();

  if (!team) {
    return { team: null, matches: [], players: [] };
  }

  const [matches, players] = await Promise.all([
    getMatchesByTeam(team.id),
    getPlayersByTeam(team.id),
  ]);

  return { team, matches, players };
}
