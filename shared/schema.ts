import { z } from "zod";
import { pgTable, serial, varchar, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  hltvId: varchar("hltv_id", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 10 }),
  rank: integer("rank").default(0),
  points: integer("points").default(0),
  teamUrl: text("team_url"),
  logoUrl: text("logo_url"),
  color: varchar("color", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  hltvMatchId: varchar("hltv_match_id", { length: 50 }).notNull(),
  date: timestamp("date", { withTimezone: true }),
  opponent: varchar("opponent", { length: 255 }),
  opponentLogo: text("opponent_logo"),
  event: varchar("event", { length: 255 }),
  result: varchar("result", { length: 50 }),
  isWin: boolean("is_win").default(false),
  matchUrl: text("match_url"),
  mapScore: varchar("map_score", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  realName: varchar("real_name", { length: 255 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 10 }),
  role: varchar("role", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertMatchSchema = createInsertSchema(matches).omit({ 
  id: true, 
  createdAt: true 
});
export const insertPlayerSchema = createInsertSchema(players).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type DbTeam = typeof teams.$inferSelect;
export type DbMatch = typeof matches.$inferSelect;
export type DbPlayer = typeof players.$inferSelect;

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
