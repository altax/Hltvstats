import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  scrapeTop30Teams, 
  scrapeTeamMatches, 
  getCached, 
  setCache 
} from "./hltv-scraper";
import type { Team, TeamsResponse, MatchesResponse } from "@shared/schema";
import {
  saveTeamWithMatches,
  getTeams,
  getTeamWithDetails,
  updateTeamColor,
  upsertPlayers,
  DbPlayer,
} from "./supabase";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/teams", async (req, res) => {
    try {
      const cacheKey = "teams-top30";
      const cached = getCached<TeamsResponse>(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const teams = await scrapeTop30Teams();
      
      const response: TeamsResponse = {
        teams,
        lastUpdated: new Date().toISOString(),
      };
      
      setCache(cacheKey, response);
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ 
        error: "Failed to fetch team rankings",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/teams/:teamId/matches", async (req, res) => {
    try {
      const { teamId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
      
      const cacheKey = `matches-${teamId}-${limit}`;
      const cached = getCached<MatchesResponse>(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const matches = await scrapeTeamMatches(teamId, limit);
      
      const response: MatchesResponse = {
        teamId,
        matches,
      };
      
      setCache(cacheKey, response);
      
      res.json(response);
    } catch (error) {
      console.error(`Error fetching matches for team ${req.params.teamId}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch team matches",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/refresh", async (req, res) => {
    try {
      const { clearCache: clear } = await import("./hltv-scraper");
      clear();
      res.json({ success: true, message: "Cache cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Sync all top 30 teams to Supabase
  app.post("/api/db/sync-all", async (req, res) => {
    try {
      console.log("[Sync] Starting to sync all teams to Supabase...");
      
      // Get teams from HLTV
      const cacheKey = "teams-top30";
      let teamsResponse = getCached<TeamsResponse>(cacheKey);
      
      if (!teamsResponse) {
        const teams = await scrapeTop30Teams();
        teamsResponse = { teams, lastUpdated: new Date().toISOString() };
        setCache(cacheKey, teamsResponse);
      }
      
      const results: { team: string; success: boolean; error?: string }[] = [];
      
      for (const team of teamsResponse.teams) {
        try {
          console.log(`[Sync] Processing team: ${team.name}`);
          
          // Get matches for this team
          const matchesCacheKey = `matches-${team.id}-100`;
          let matchesData = getCached<MatchesResponse>(matchesCacheKey);
          
          if (!matchesData) {
            const matches = await scrapeTeamMatches(team.id, 50);
            matchesData = { teamId: team.id, matches };
            setCache(matchesCacheKey, matchesData);
          }
          
          // Save to Supabase
          const success = await saveTeamWithMatches(
            {
              id: team.id,
              name: team.name,
              country: team.country,
              countryCode: team.countryCode,
              rank: team.rank,
              points: team.points,
              teamUrl: team.teamUrl,
              logo: team.logo,
            },
            matchesData.matches.map(m => ({
              id: m.id,
              date: m.date,
              opponent: m.opponent,
              opponentLogo: m.opponentLogo,
              event: m.event,
              result: m.result,
              matchUrl: m.matchUrl,
              mapScore: m.mapScore,
            }))
          );
          
          results.push({ team: team.name, success });
          console.log(`[Sync] ${team.name}: ${success ? 'OK' : 'FAILED'}`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[Sync] Error syncing ${team.name}:`, error);
          results.push({ 
            team: team.name, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`[Sync] Completed: ${successCount}/${results.length} teams synced`);
      
      res.json({ 
        success: true, 
        message: `Synced ${successCount}/${results.length} teams`,
        results 
      });
    } catch (error) {
      console.error("Error syncing teams:", error);
      res.status(500).json({ 
        error: "Failed to sync teams",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Supabase endpoints - get all teams from database
  app.get("/api/db/teams", async (req, res) => {
    try {
      const teams = await getTeams();
      res.json({ teams, count: teams.length });
    } catch (error) {
      console.error("Error fetching teams from Supabase:", error);
      res.status(500).json({ 
        error: "Failed to fetch teams from database",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get single team with matches and players
  app.get("/api/db/teams/:hltvId", async (req, res) => {
    try {
      const { hltvId } = req.params;
      const result = await getTeamWithDetails(hltvId);
      
      if (!result.team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching team details:", error);
      res.status(500).json({ 
        error: "Failed to fetch team details",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save team with matches to Supabase
  app.post("/api/db/teams/:teamId/save", async (req, res) => {
    try {
      const { teamId } = req.params;
      const { color } = req.body;
      
      // Get team data from cache or scrape
      const cacheKey = "teams-top30";
      let teamsResponse = getCached<TeamsResponse>(cacheKey);
      
      if (!teamsResponse) {
        const teams = await scrapeTop30Teams();
        teamsResponse = { teams, lastUpdated: new Date().toISOString() };
        setCache(cacheKey, teamsResponse);
      }
      
      const team = teamsResponse.teams.find(t => t.id === teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Get matches
      const matchesCacheKey = `matches-${teamId}-100`;
      let matchesData = getCached<MatchesResponse>(matchesCacheKey);
      
      if (!matchesData) {
        const matches = await scrapeTeamMatches(teamId, 100);
        matchesData = { teamId, matches };
        setCache(matchesCacheKey, matchesData);
      }
      
      // Save to Supabase
      const success = await saveTeamWithMatches(
        {
          id: team.id,
          name: team.name,
          country: team.country,
          countryCode: team.countryCode,
          rank: team.rank,
          points: team.points,
          teamUrl: team.teamUrl,
          logo: team.logo,
          color: color,
        },
        matchesData.matches.map(m => ({
          id: m.id,
          date: m.date,
          opponent: m.opponent,
          opponentLogo: m.opponentLogo,
          event: m.event,
          result: m.result,
          matchUrl: m.matchUrl,
          mapScore: m.mapScore,
        }))
      );
      
      if (success) {
        res.json({ success: true, message: `Team ${team.name} saved to database` });
      } else {
        res.status(500).json({ error: "Failed to save team to database" });
      }
    } catch (error) {
      console.error("Error saving team:", error);
      res.status(500).json({ 
        error: "Failed to save team",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update team color
  app.patch("/api/db/teams/:hltvId/color", async (req, res) => {
    try {
      const { hltvId } = req.params;
      const { color } = req.body;
      
      if (!color) {
        return res.status(400).json({ error: "Color is required" });
      }
      
      const success = await updateTeamColor(hltvId, color);
      
      if (success) {
        res.json({ success: true, message: "Team color updated" });
      } else {
        res.status(500).json({ error: "Failed to update team color" });
      }
    } catch (error) {
      console.error("Error updating team color:", error);
      res.status(500).json({ 
        error: "Failed to update team color",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save players for a team
  app.post("/api/db/teams/:hltvId/players", async (req, res) => {
    try {
      const { hltvId } = req.params;
      const { players } = req.body;
      
      if (!players || !Array.isArray(players)) {
        return res.status(400).json({ error: "Players array is required" });
      }
      
      // Get team from database to get the UUID
      const teamDetails = await getTeamWithDetails(hltvId);
      if (!teamDetails.team) {
        return res.status(404).json({ error: "Team not found. Save the team first." });
      }
      
      const dbPlayers: DbPlayer[] = players.map((p: any) => ({
        team_id: teamDetails.team!.id!,
        nickname: p.nickname,
        real_name: p.realName,
        country: p.country,
        country_code: p.countryCode,
        role: p.role,
        is_active: p.isActive !== false,
      }));
      
      const success = await upsertPlayers(dbPlayers);
      
      if (success) {
        res.json({ success: true, message: `${players.length} players saved` });
      } else {
        res.status(500).json({ error: "Failed to save players" });
      }
    } catch (error) {
      console.error("Error saving players:", error);
      res.status(500).json({ 
        error: "Failed to save players",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}
