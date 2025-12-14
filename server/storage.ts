import type { Team, Match } from "@shared/schema";

export interface IStorage {
  getTeams(): Promise<Team[]>;
  getTeamMatches(teamId: string): Promise<Match[]>;
  setTeams(teams: Team[]): Promise<void>;
  setTeamMatches(teamId: string, matches: Match[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private teams: Team[] = [];
  private teamMatches: Map<string, Match[]> = new Map();

  async getTeams(): Promise<Team[]> {
    return this.teams;
  }

  async getTeamMatches(teamId: string): Promise<Match[]> {
    return this.teamMatches.get(teamId) || [];
  }

  async setTeams(teams: Team[]): Promise<void> {
    this.teams = teams;
  }

  async setTeamMatches(teamId: string, matches: Match[]): Promise<void> {
    this.teamMatches.set(teamId, matches);
  }
}

export const storage = new MemStorage();
