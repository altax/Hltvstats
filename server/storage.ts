import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  teams, 
  matches, 
  players, 
  type DbTeam, 
  type DbMatch, 
  type DbPlayer,
  type InsertTeam,
  type InsertMatch,
  type InsertPlayer,
} from "@shared/schema";

export async function getTeams(): Promise<DbTeam[]> {
  return db.select().from(teams).orderBy(teams.rank);
}

export async function getTeamByHltvId(hltvId: string): Promise<DbTeam | null> {
  const result = await db.select().from(teams).where(eq(teams.hltvId, hltvId)).limit(1);
  return result[0] || null;
}

export async function upsertTeam(team: InsertTeam): Promise<DbTeam | null> {
  const existing = await getTeamByHltvId(team.hltvId);
  
  if (existing) {
    const result = await db
      .update(teams)
      .set({ ...team, updatedAt: new Date() })
      .where(eq(teams.hltvId, team.hltvId))
      .returning();
    return result[0] || null;
  } else {
    const result = await db.insert(teams).values(team).returning();
    return result[0] || null;
  }
}

export async function getMatchesByTeam(teamId: string): Promise<DbMatch[]> {
  return db.select().from(matches).where(eq(matches.teamId, teamId)).orderBy(desc(matches.date));
}

export async function insertMatches(matchList: InsertMatch[]): Promise<boolean> {
  if (matchList.length === 0) return true;
  
  try {
    for (const match of matchList) {
      const existing = await db
        .select()
        .from(matches)
        .where(eq(matches.hltvMatchId, match.hltvMatchId))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(matches).values(match);
      }
    }
    return true;
  } catch (error) {
    console.error("[DB] Error inserting matches:", error);
    return false;
  }
}

export async function getPlayersByTeam(teamId: string): Promise<DbPlayer[]> {
  return db.select().from(players).where(eq(players.teamId, teamId));
}

export async function upsertPlayers(playerList: InsertPlayer[]): Promise<boolean> {
  if (playerList.length === 0) return true;
  
  try {
    for (const player of playerList) {
      const existing = await db
        .select()
        .from(players)
        .where(eq(players.teamId, player.teamId!))
        .limit(1);
      
      const match = existing.find(p => p.nickname === player.nickname);
      
      if (match) {
        await db
          .update(players)
          .set(player)
          .where(eq(players.id, match.id));
      } else {
        await db.insert(players).values(player);
      }
    }
    return true;
  } catch (error) {
    console.error("[DB] Error upserting players:", error);
    return false;
  }
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
  matchList: Array<{
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
  const teamData: InsertTeam = {
    hltvId: hltvTeam.id,
    name: hltvTeam.name,
    country: hltvTeam.country,
    countryCode: hltvTeam.countryCode,
    rank: hltvTeam.rank,
    points: hltvTeam.points || 0,
    teamUrl: hltvTeam.teamUrl,
    logoUrl: hltvTeam.logo,
    color: hltvTeam.color,
  };

  const savedTeam = await upsertTeam(teamData);
  if (!savedTeam || !savedTeam.id) return false;

  const dbMatches: InsertMatch[] = matchList.map((match) => {
    const resultParts = match.result.split("-");
    const team1Score = parseInt(resultParts[0]) || 0;
    const team2Score = parseInt(resultParts[1]) || 0;
    const isWin = team1Score > team2Score;

    return {
      teamId: savedTeam.id,
      hltvMatchId: match.id,
      date: new Date(match.date),
      opponent: match.opponent,
      opponentLogo: match.opponentLogo,
      event: match.event,
      result: match.result,
      isWin,
      matchUrl: match.matchUrl,
      mapScore: match.mapScore,
    };
  });

  return await insertMatches(dbMatches);
}

export async function updateTeamColor(hltvId: string, color: string): Promise<boolean> {
  try {
    await db
      .update(teams)
      .set({ color, updatedAt: new Date() })
      .where(eq(teams.hltvId, hltvId));
    return true;
  } catch (error) {
    console.error("[DB] Error updating team color:", error);
    return false;
  }
}

export async function getTeamWithDetails(hltvId: string): Promise<{
  team: DbTeam | null;
  matches: DbMatch[];
  players: DbPlayer[];
}> {
  const team = await getTeamByHltvId(hltvId);

  if (!team) {
    return { team: null, matches: [], players: [] };
  }

  const [teamMatches, teamPlayers] = await Promise.all([
    getMatchesByTeam(team.id),
    getPlayersByTeam(team.id),
  ]);

  return { team, matches: teamMatches, players: teamPlayers };
}
