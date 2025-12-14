import { z } from "zod";

export const matchSchema = z.object({
  id: z.string(),
  date: z.string(),
  opponent: z.string(),
  opponentLogo: z.string().optional(),
  event: z.string(),
  result: z.string(),
  matchUrl: z.string(),
  mapScore: z.string().optional(),
});

export const teamSchema = z.object({
  id: z.string(),
  rank: z.number(),
  name: z.string(),
  logo: z.string().optional(),
  country: z.string(),
  countryCode: z.string(),
  points: z.number().optional(),
  teamUrl: z.string(),
  matches: z.array(matchSchema).optional(),
  matchesLoaded: z.boolean().default(false),
  matchesLoading: z.boolean().default(false),
  matchesError: z.string().optional(),
});

export type Match = z.infer<typeof matchSchema>;
export type Team = z.infer<typeof teamSchema>;

export const teamsResponseSchema = z.object({
  teams: z.array(teamSchema),
  lastUpdated: z.string(),
});

export type TeamsResponse = z.infer<typeof teamsResponseSchema>;

export const matchesResponseSchema = z.object({
  teamId: z.string(),
  matches: z.array(matchSchema),
});

export type MatchesResponse = z.infer<typeof matchesResponseSchema>;
