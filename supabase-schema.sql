-- SQL schema for Supabase database
-- Run this in the Supabase SQL Editor to create the tables

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  hltv_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  team_url TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  hltv_match_id TEXT NOT NULL,
  date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  opponent_logo TEXT,
  event TEXT NOT NULL,
  result TEXT NOT NULL,
  is_win BOOLEAN NOT NULL DEFAULT FALSE,
  match_url TEXT NOT NULL,
  map_score TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, hltv_match_id)
);

-- Players (roster) table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  real_name TEXT,
  country TEXT,
  country_code TEXT,
  role TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, nickname)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_rank ON teams(rank);

-- Enable Row Level Security (optional, for public read access)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access on matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read access on players" ON players FOR SELECT USING (true);

-- Create policies for authenticated insert/update (using anon key)
CREATE POLICY "Allow anon insert on teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on teams" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert on matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on players" ON players FOR UPDATE USING (true);
