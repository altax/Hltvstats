import { HLTV } from "hltv";
import type { Team, Match } from "@shared/schema";

const HLTV_BASE_URL = "https://www.hltv.org";

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CachedData<unknown>>();
const CACHE_TTL = 10 * 60 * 1000;
const MATCH_CACHE_TTL = 30 * 60 * 1000;

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

class RateLimiter {
  private requestTimestamps: number[] = [];
  private maxRequestsPerMinute: number;
  private minDelayMs: number;

  constructor(maxRequestsPerMinute: number = 6, minDelayMs: number = 3000) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.minDelayMs = minDelayMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + 60000 - now + 1000;
      console.log(`[HLTV] Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await this.delay(waitTime);
    }

    if (this.requestTimestamps.length > 0) {
      const lastRequest = this.requestTimestamps[this.requestTimestamps.length - 1];
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < this.minDelayMs) {
        const waitTime = this.minDelayMs - timeSinceLastRequest;
        await this.delay(waitTime);
      }
    }

    this.requestTimestamps.push(Date.now());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const rateLimiter = new RateLimiter(6, 3000);

const fallbackTop30Teams: Team[] = [
  { id: "8297", rank: 1, name: "FURIA", country: "Brazil", countryCode: "br", points: 942, teamUrl: "https://www.hltv.org/team/8297/furia", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "9565", rank: 2, name: "Vitality", country: "France", countryCode: "fr", points: 870, teamUrl: "https://www.hltv.org/team/9565/vitality", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "12296", rank: 3, name: "Falcons", country: "Saudi Arabia", countryCode: "sa", points: 657, teamUrl: "https://www.hltv.org/team/12296/falcons", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "4494", rank: 4, name: "MOUZ", country: "Europe", countryCode: "eu", points: 543, teamUrl: "https://www.hltv.org/team/4494/mouz", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "11893", rank: 5, name: "The MongolZ", country: "Mongolia", countryCode: "mn", points: 392, teamUrl: "https://www.hltv.org/team/11893/the-mongolz", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "7020", rank: 6, name: "Team Spirit", country: "Russia", countryCode: "ru", points: 366, teamUrl: "https://www.hltv.org/team/7020/spirit", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "4608", rank: 7, name: "Natus Vincere", country: "Ukraine", countryCode: "ua", points: 284, teamUrl: "https://www.hltv.org/team/4608/natus-vincere", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "11106", rank: 8, name: "Aurora", country: "Europe", countryCode: "eu", points: 257, teamUrl: "https://www.hltv.org/team/11106/aurora", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "5995", rank: 9, name: "G2 Esports", country: "Europe", countryCode: "eu", points: 229, teamUrl: "https://www.hltv.org/team/5995/g2", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "6902", rank: 10, name: "paiN Gaming", country: "Brazil", countryCode: "br", points: 213, teamUrl: "https://www.hltv.org/team/6902/pain", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "6665", rank: 11, name: "Astralis", country: "Denmark", countryCode: "dk", points: 211, teamUrl: "https://www.hltv.org/team/6665/astralis", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "6667", rank: 12, name: "FaZe Clan", country: "Europe", countryCode: "eu", points: 199, teamUrl: "https://www.hltv.org/team/6667/faze", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "10503", rank: 13, name: "3DMAX", country: "France", countryCode: "fr", points: 187, teamUrl: "https://www.hltv.org/team/10503/3dmax", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "5973", rank: 14, name: "Liquid", country: "North America", countryCode: "us", points: 163, teamUrl: "https://www.hltv.org/team/5973/liquid", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "10150", rank: 15, name: "Legacy", country: "Brazil", countryCode: "br", points: 153, teamUrl: "https://www.hltv.org/team/10150/legacy", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "11224", rank: 16, name: "B8", country: "Ukraine", countryCode: "ua", points: 124, teamUrl: "https://www.hltv.org/team/11224/b8", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "12411", rank: 17, name: "Passion UA", country: "Ukraine", countryCode: "ua", points: 105, teamUrl: "https://www.hltv.org/team/12411/passion-ua", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "8637", rank: 18, name: "GamerLegion", country: "Europe", countryCode: "eu", points: 91, teamUrl: "https://www.hltv.org/team/8637/gamerlegion", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "7175", rank: 19, name: "Heroic", country: "Denmark", countryCode: "dk", points: 90, teamUrl: "https://www.hltv.org/team/7175/heroic", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "10567", rank: 20, name: "sAw", country: "Portugal", countryCode: "pt", points: 79, teamUrl: "https://www.hltv.org/team/10567/saw", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "5378", rank: 21, name: "Virtus.pro", country: "Russia", countryCode: "ru", points: 78, teamUrl: "https://www.hltv.org/team/5378/virtuspro", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "12229", rank: 22, name: "PARIVISION", country: "Europe", countryCode: "eu", points: 76, teamUrl: "https://www.hltv.org/team/12229/parivision", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "12068", rank: 23, name: "M80", country: "North America", countryCode: "us", points: 71, teamUrl: "https://www.hltv.org/team/12068/m80", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "4411", rank: 24, name: "NiP", country: "Sweden", countryCode: "se", points: 69, teamUrl: "https://www.hltv.org/team/4411/nip", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "12308", rank: 25, name: "FUT Esports", country: "Turkey", countryCode: "tr", points: 68, teamUrl: "https://www.hltv.org/team/12308/fut-esports", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "9928", rank: 26, name: "Lynn Vision", country: "China", countryCode: "cn", points: 68, teamUrl: "https://www.hltv.org/team/9928/lynn-vision", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "4991", rank: 27, name: "fnatic", country: "Europe", countryCode: "eu", points: 64, teamUrl: "https://www.hltv.org/team/4991/fnatic", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "4863", rank: 28, name: "TYLOO", country: "China", countryCode: "cn", points: 64, teamUrl: "https://www.hltv.org/team/4863/tyloo", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "9455", rank: 29, name: "Imperial Esports", country: "Brazil", countryCode: "br", points: 61, teamUrl: "https://www.hltv.org/team/9455/imperial", matches: [], matchesLoaded: false, matchesLoading: false },
  { id: "12406", rank: 30, name: "Gentle Mates", country: "France", countryCode: "fr", points: 59, teamUrl: "https://www.hltv.org/team/12406/gentle-mates", matches: [], matchesLoaded: false, matchesLoading: false },
];

function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    "Brazil": "br",
    "France": "fr",
    "Saudi Arabia": "sa",
    "Europe": "eu",
    "Mongolia": "mn",
    "Russia": "ru",
    "Ukraine": "ua",
    "Denmark": "dk",
    "United States": "us",
    "Portugal": "pt",
    "Sweden": "se",
    "Turkey": "tr",
    "China": "cn",
    "Germany": "de",
    "Poland": "pl",
    "Finland": "fi",
    "Bosnia and Herzegovina": "ba",
    "Kazakhstan": "kz",
    "Argentina": "ar",
    "Australia": "au",
    "Canada": "ca",
    "United Kingdom": "gb",
    "Norway": "no",
    "Netherlands": "nl",
    "Spain": "es",
    "Italy": "it",
  };
  return countryMap[country] || "xx";
}

export async function scrapeTop30Teams(): Promise<Team[]> {
  const cacheKey = "teams-ranking";
  const cached = getCached<Team[]>(cacheKey);
  if (cached) {
    console.log("[HLTV] Returning cached team ranking");
    return cached;
  }

  try {
    console.log("[HLTV] Fetching team ranking via HLTV library...");
    await rateLimiter.waitForSlot();
    
    const ranking = await HLTV.getTeamRanking();
    
    const teams: Team[] = ranking.slice(0, 30).map((rankedTeam: any, index: number) => {
      const teamData = rankedTeam.team;
      const teamId = String(teamData.id);
      
      const fallback = fallbackTop30Teams.find(t => 
        t.name.toLowerCase() === teamData.name.toLowerCase() ||
        t.name.toLowerCase().includes(teamData.name.toLowerCase()) ||
        teamData.name.toLowerCase().includes(t.name.toLowerCase())
      );
      
      const location = teamData.location || teamData.country;
      let countryName = typeof location === 'object' ? location.name : (location || null);
      let countryCode = countryName ? getCountryCode(countryName) : null;
      
      if (!countryName || countryCode === "xx") {
        countryName = fallback?.country || "Unknown";
        countryCode = fallback?.countryCode || "xx";
      }
      
      return {
        id: teamId,
        rank: index + 1,
        name: teamData.name,
        logo: undefined,
        country: countryName,
        countryCode,
        points: rankedTeam.points,
        teamUrl: `${HLTV_BASE_URL}/team/${teamData.id}/${teamData.name.toLowerCase().replace(/\s+/g, '-')}`,
        matches: [],
        matchesLoaded: false,
        matchesLoading: false,
      };
    });

    console.log(`[HLTV] Successfully fetched ${teams.length} teams from HLTV`);
    setCache(cacheKey, teams);
    return teams;
  } catch (error) {
    console.error("[HLTV] Error fetching team ranking:", (error as Error).message);
    console.log("[HLTV] Using fallback cached data");
    return [...fallbackTop30Teams];
  }
}

export async function scrapeTeamMatches(teamId: string, limit: number = 20): Promise<Match[]> {
  const cacheKey = `matches-${teamId}-${limit}`;
  const cached = getCached<Match[]>(cacheKey);
  if (cached) {
    console.log(`[HLTV] Returning cached matches for team ${teamId} (limit: ${limit})`);
    return cached;
  }

  try {
    console.log(`[HLTV] Fetching results for team ${teamId}...`);
    await rateLimiter.waitForSlot();
    
    const results = await HLTV.getResults({ teamIds: [Number(teamId)] });
    
    const matches: Match[] = results.slice(0, limit).map((result: any) => {
      const team1 = result.team1;
      const team2 = result.team2;
      const matchResult = result.result;
      
      const isTeam1 = team1?.id === Number(teamId);
      const opponent = isTeam1 
        ? (team2?.name || "Unknown")
        : (team1?.name || "Unknown");
      
      const scoreStr = matchResult 
        ? `${matchResult.team1}-${matchResult.team2}`
        : "N/A";

      const date = result.date 
        ? new Date(result.date).toLocaleDateString("en-US", { 
            year: "numeric", 
            month: "long", 
            day: "numeric" 
          })
        : "Unknown date";

      const eventName = result.event?.name || result.eventName || "Unknown Event";

      return {
        id: String(result.id),
        date,
        opponent,
        opponentLogo: undefined,
        event: eventName,
        result: scoreStr,
        matchUrl: `${HLTV_BASE_URL}/matches/${result.id}/${team1?.name?.toLowerCase().replace(/\s+/g, '-') || 'team1'}-vs-${team2?.name?.toLowerCase().replace(/\s+/g, '-') || 'team2'}`,
        mapScore: undefined,
      };
    });

    console.log(`[HLTV] Successfully fetched ${matches.length} matches for team ${teamId}`);
    setCache(cacheKey, matches);
    return matches;
  } catch (error) {
    console.error(`[HLTV] Error fetching matches for team ${teamId}:`, (error as Error).message);
    return [];
  }
}
