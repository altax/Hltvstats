import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  scrapeTop30Teams, 
  scrapeTeamMatches, 
  getCached, 
  setCache 
} from "./hltv-scraper";
import type { Team, TeamsResponse, MatchesResponse } from "@shared/schema";

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

  return httpServer;
}
