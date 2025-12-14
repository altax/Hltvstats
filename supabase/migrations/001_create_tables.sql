-- Таблица команд (teams)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hltv_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  country_code VARCHAR(10),
  rank INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  team_url TEXT,
  logo_url TEXT,
  color VARCHAR(50), -- свет/цвет команды
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица матчей (matches)
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  hltv_match_id VARCHAR(50) NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  opponent VARCHAR(255),
  opponent_logo TEXT,
  event VARCHAR(255),
  result VARCHAR(50),
  is_win BOOLEAN DEFAULT FALSE, -- выиграли или нет
  match_url TEXT,
  map_score VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, hltv_match_id)
);

-- Таблица игроков/состава (players)
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  nickname VARCHAR(100) NOT NULL,
  real_name VARCHAR(255),
  country VARCHAR(100),
  country_code VARCHAR(10),
  role VARCHAR(50), -- роль в команде (AWP, IGL, etc.)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, nickname)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date DESC);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_rank ON teams(rank);

-- RLS (Row Level Security) - разрешить чтение всем
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access on matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read access on players" ON players FOR SELECT USING (true);

-- Разрешить вставку/обновление через anon ключ
CREATE POLICY "Allow insert on teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on teams" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow insert on matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Allow insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on players" ON players FOR UPDATE USING (true);
