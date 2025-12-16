import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  scrapeTop30Teams, 
  scrapeTeamMatches, 
  getCached, 
  setCache 
} from "./hltv-scraper";
import type { Team, TeamsResponse, MatchesResponse, InsertPlayer } from "@shared/schema";
import {
  saveTeamWithMatches,
  getTeams,
  getTeamWithDetails,
  updateTeamColor,
  upsertPlayers,
} from "./storage";
import { testDemoDownload, getDemoLinkFromMatch, downloadDemo } from "./demo-downloader";
import {
  getMatchesFromSupabase,
  getMatchesByTeamFromSupabase,
  getTeamsFromSupabase,
  getMatchByIdFromSupabase,
  saveMatchesToSupabase,
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
      const teamName = req.query.teamName as string || "Unknown";
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
      
      const cacheKey = `matches-${teamId}-${limit}`;
      const cached = getCached<MatchesResponse>(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const matches = await scrapeTeamMatches(teamId, teamName, limit);
      
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

  app.post("/api/db/sync-all", async (req, res) => {
    try {
      console.log("[Sync] Starting to sync all teams to database...");
      
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
          
          const matchesCacheKey = `matches-${team.id}-100`;
          let matchesData = getCached<MatchesResponse>(matchesCacheKey);
          
          if (!matchesData) {
            const matches = await scrapeTeamMatches(team.id, team.name, 50);
            matchesData = { teamId: team.id, matches };
            setCache(matchesCacheKey, matchesData);
          }
          
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
              hltvMatchId: m.hltvMatchId,
              date: m.date,
              teamName: m.teamName,
              teamLogo: m.teamLogo,
              opponentName: m.opponentName,
              opponentLogo: m.opponentLogo,
              winner: m.winner,
              mapScores: m.mapScores,
              event: m.event,
              matchUrl: m.matchUrl,
            }))
          );
          
          results.push({ team: team.name, success });
          console.log(`[Sync] ${team.name}: ${success ? 'OK' : 'FAILED'}`);
          
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

  app.get("/api/db/teams", async (req, res) => {
    try {
      const teams = await getTeams();
      res.json({ teams, count: teams.length });
    } catch (error) {
      console.error("Error fetching teams from database:", error);
      res.status(500).json({ 
        error: "Failed to fetch teams from database",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

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

  app.post("/api/db/teams/:teamId/save", async (req, res) => {
    try {
      const { teamId } = req.params;
      const { color } = req.body;
      
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
      
      const matchesCacheKey = `matches-${teamId}-100`;
      let matchesData = getCached<MatchesResponse>(matchesCacheKey);
      
      if (!matchesData) {
        const matches = await scrapeTeamMatches(teamId, team.name, 100);
        matchesData = { teamId, matches };
        setCache(matchesCacheKey, matchesData);
      }
      
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
          hltvMatchId: m.hltvMatchId,
          date: m.date,
          teamName: m.teamName,
          teamLogo: m.teamLogo,
          opponentName: m.opponentName,
          opponentLogo: m.opponentLogo,
          winner: m.winner,
          mapScores: m.mapScores,
          event: m.event,
          matchUrl: m.matchUrl,
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

  app.post("/api/supabase/sync-matches", async (req, res) => {
    try {
      console.log("[Supabase Sync] Starting sync for top 30 teams, 50 matches each...");
      
      const teams = await scrapeTop30Teams();
      let totalInserted = 0;
      let totalSkipped = 0;
      const teamResults: { team: string; inserted: number; skipped: number }[] = [];
      
      for (const team of teams) {
        console.log(`[Supabase Sync] Fetching 50 matches for ${team.name} (${team.rank}/30)...`);
        const matches = await scrapeTeamMatches(team.id, team.name, 50);
        
        const { inserted, skipped } = await saveMatchesToSupabase(team.id, matches);
        totalInserted += inserted;
        totalSkipped += skipped;
        teamResults.push({ team: team.name, inserted, skipped });
        
        console.log(`[Supabase Sync] ${team.name}: ${inserted} inserted, ${skipped} skipped`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      console.log(`[Supabase Sync] Complete: ${totalInserted} total inserted, ${totalSkipped} total skipped`);
      res.json({ 
        success: true, 
        inserted: totalInserted, 
        skipped: totalSkipped,
        teamsProcessed: teams.length,
        message: `Synced ${teams.length} teams: ${totalInserted} matches inserted, ${totalSkipped} skipped`,
        details: teamResults
      });
    } catch (error) {
      console.error("[Supabase Sync] Error:", error);
      res.status(500).json({ 
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

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

  app.post("/api/db/teams/:hltvId/players", async (req, res) => {
    try {
      const { hltvId } = req.params;
      const { players: playerData } = req.body;
      
      if (!playerData || !Array.isArray(playerData)) {
        return res.status(400).json({ error: "Players array is required" });
      }
      
      const teamDetails = await getTeamWithDetails(hltvId);
      if (!teamDetails.team) {
        return res.status(404).json({ error: "Team not found. Save the team first." });
      }
      
      const dbPlayers: InsertPlayer[] = playerData.map((p: any) => ({
        teamId: teamDetails.team!.id,
        nickname: p.nickname,
        realName: p.realName,
        country: p.country,
        countryCode: p.countryCode,
        role: p.role,
        isActive: p.isActive !== false,
      }));
      
      const success = await upsertPlayers(dbPlayers);
      
      if (success) {
        res.json({ success: true, message: `${playerData.length} players saved` });
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

  // Test demo download
  app.post("/api/demo/test", async (req, res) => {
    try {
      const { matchUrl } = req.body;
      
      if (!matchUrl) {
        return res.status(400).json({ error: "matchUrl is required" });
      }
      
      console.log(`[Demo] Testing download for: ${matchUrl}`);
      const result = await testDemoDownload(matchUrl);
      
      res.json(result);
    } catch (error) {
      console.error("Error testing demo download:", error);
      res.status(500).json({ 
        error: "Failed to test demo download",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get demo link from match URL
  app.post("/api/demo/link", async (req, res) => {
    try {
      const { matchUrl } = req.body;
      
      if (!matchUrl) {
        return res.status(400).json({ error: "matchUrl is required" });
      }
      
      console.log(`[Demo] Getting demo link for: ${matchUrl}`);
      const demoLink = await getDemoLinkFromMatch(matchUrl);
      
      res.json({ matchUrl, demoLink });
    } catch (error) {
      console.error("Error getting demo link:", error);
      res.status(500).json({ 
        error: "Failed to get demo link",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== SUPABASE ENDPOINTS =====

  // Get all matches from Supabase
  app.get("/api/supabase/matches", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 1000;
      const matches = await getMatchesFromSupabase(limit);
      res.json({ matches, count: matches.length });
    } catch (error) {
      console.error("Error fetching matches from Supabase:", error);
      res.status(500).json({ 
        error: "Failed to fetch matches from Supabase",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get matches by team from Supabase
  app.get("/api/supabase/teams/:hltvId/matches", async (req, res) => {
    try {
      const { hltvId } = req.params;
      const matches = await getMatchesByTeamFromSupabase(hltvId);
      res.json({ teamHltvId: hltvId, matches, count: matches.length });
    } catch (error) {
      console.error("Error fetching team matches from Supabase:", error);
      res.status(500).json({ 
        error: "Failed to fetch team matches from Supabase",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all teams from Supabase
  app.get("/api/supabase/teams", async (req, res) => {
    try {
      const teams = await getTeamsFromSupabase();
      res.json({ teams, count: teams.length });
    } catch (error) {
      console.error("Error fetching teams from Supabase:", error);
      res.status(500).json({ 
        error: "Failed to fetch teams from Supabase",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Download demo for a specific match from Supabase
  app.post("/api/supabase/matches/:matchId/download-demo", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const match = await getMatchByIdFromSupabase(matchId);
      
      if (!match) {
        return res.status(404).json({ error: "Match not found in Supabase" });
      }

      if (!match.match_url) {
        return res.status(400).json({ error: "Match URL not available" });
      }

      console.log(`[Demo] Starting download for match ${matchId}: ${match.match_url}`);
      
      // Get demo link from match page
      const demoLink = await getDemoLinkFromMatch(match.match_url);
      
      if (!demoLink) {
        return res.json({ 
          matchId, 
          matchUrl: match.match_url, 
          demoLink: null, 
          downloaded: false,
          message: "Demo link not found on match page"
        });
      }

      // Download the demo
      const filename = `demo_${match.hltv_match_id}.rar`;
      const filePath = await downloadDemo(demoLink, filename);
      
      res.json({ 
        matchId, 
        matchUrl: match.match_url, 
        demoLink,
        downloaded: !!filePath,
        filePath 
      });
    } catch (error) {
      console.error("Error downloading demo:", error);
      res.status(500).json({ 
        error: "Failed to download demo",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Batch download demos for multiple matches
  app.post("/api/supabase/download-demos-batch", async (req, res) => {
    try {
      const { matchIds, limit } = req.body;
      
      let matches: Awaited<ReturnType<typeof getMatchesFromSupabase>>;
      
      if (matchIds && Array.isArray(matchIds)) {
        // Download specific matches
        const matchPromises = matchIds.map((id: number) => getMatchByIdFromSupabase(id));
        const results = await Promise.all(matchPromises);
        matches = results.filter((m): m is NonNullable<typeof m> => m !== null);
      } else {
        // Download recent matches
        matches = await getMatchesFromSupabase(limit || 10);
      }

      const results: Array<{
        matchId: number;
        matchUrl: string;
        demoLink: string | null;
        downloaded: boolean;
        filePath?: string;
        error?: string;
      }> = [];

      for (const match of matches) {
        try {
          if (!match.match_url) {
            results.push({
              matchId: match.id,
              matchUrl: "",
              demoLink: null,
              downloaded: false,
              error: "No match URL"
            });
            continue;
          }

          console.log(`[Demo] Processing match ${match.id}: ${match.match_url}`);
          
          const demoLink = await getDemoLinkFromMatch(match.match_url);
          
          if (!demoLink) {
            results.push({
              matchId: match.id,
              matchUrl: match.match_url,
              demoLink: null,
              downloaded: false,
              error: "Demo link not found"
            });
            continue;
          }

          const filename = `demo_${match.hltv_match_id}.rar`;
          const filePath = await downloadDemo(demoLink, filename);
          
          results.push({
            matchId: match.id,
            matchUrl: match.match_url,
            demoLink,
            downloaded: !!filePath,
            filePath: filePath || undefined
          });

          // Add delay between downloads to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          results.push({
            matchId: match.id,
            matchUrl: match.match_url || "",
            demoLink: null,
            downloaded: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      const successCount = results.filter(r => r.downloaded).length;
      res.json({
        success: true,
        message: `Downloaded ${successCount}/${results.length} demos`,
        results
      });
    } catch (error) {
      console.error("Error batch downloading demos:", error);
      res.status(500).json({ 
        error: "Failed to batch download demos",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}
