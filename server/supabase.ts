import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface SupabaseMatch {
  id: number;
  hltv_match_id: string;
  date: string;
  team_name: string;
  team_logo: string | null;
  opponent_name: string;
  opponent_logo: string | null;
  winner: string | null;
  map_scores: string | null;
  event: string;
  match_url: string;
  created_at: string;
}

export interface SupabaseTeam {
  id: string;
  hltv_id: string;
  name: string;
  country: string;
  country_code: string;
  rank: number;
  points: number;
  team_url: string;
  logo_url: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export async function getMatchesFromSupabase(limit: number = 1000): Promise<SupabaseMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase] Error fetching matches:", error);
    throw error;
  }

  return data || [];
}

export async function getMatchesByTeamFromSupabase(teamName: string): Promise<SupabaseMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_name", teamName)
    .order("date", { ascending: false });

  if (error) {
    console.error("[Supabase] Error fetching matches:", error);
    throw error;
  }

  return data || [];
}

export async function getTeamsFromSupabase(): Promise<SupabaseTeam[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("rank", { ascending: true });

  if (error) {
    console.error("[Supabase] Error fetching teams:", error);
    throw error;
  }

  return data || [];
}

export async function getMatchByIdFromSupabase(matchId: number): Promise<SupabaseMatch | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    console.error("[Supabase] Error fetching match:", error);
    return null;
  }

  return data;
}
