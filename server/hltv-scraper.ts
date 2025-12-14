import axios from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { Team, Match } from "@shared/schema";

const HLTV_BASE_URL = "https://www.hltv.org";
const EGAMERSWORLD_URL = "https://egamersworld.com";

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function createAxiosInstance() {
  return axios.create({
    headers: {
      "User-Agent": getRandomUserAgent(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Cache-Control": "max-age=0",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
    },
    timeout: 30000,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const currentTop30Teams: Team[] = [
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

async function scrapeFromEGamersWorld(): Promise<Team[]> {
  try {
    const axiosInstance = createAxiosInstance();
    await delay(1000 + Math.random() * 1000);
    
    const response = await axiosInstance.get(`${EGAMERSWORLD_URL}/counterstrike/teams/ranking/hltv`);
    const $ = cheerio.load(response.data);
    
    const teams: Team[] = [];
    
    $("table tbody tr").each((index: number, element: Element) => {
      if (index >= 30) return false;
      
      const $row = $(element);
      const cells = $row.find("td");
      
      if (cells.length < 3) return;
      
      const rankText = $(cells[0]).text().trim();
      const rank = parseInt(rankText, 10) || index + 1;
      
      const $teamCell = $(cells[1]);
      const teamLink = $teamCell.find("a");
      const name = teamLink.text().trim();
      const logoUrl = $teamCell.find("img").attr("src") || "";
      
      const pointsText = $(cells[2]).text().trim();
      const points = parseInt(pointsText, 10) || undefined;
      
      const fallbackTeam = currentTop30Teams.find(t => 
        t.name.toLowerCase() === name.toLowerCase() || 
        t.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(t.name.toLowerCase())
      );
      
      const teamId = fallbackTeam?.id || `team-${rank}`;
      const countryCode = fallbackTeam?.countryCode || "xx";
      const country = fallbackTeam?.country || "Unknown";
      const hltvTeamUrl = fallbackTeam?.teamUrl || `${HLTV_BASE_URL}/team/${teamId}/${name.toLowerCase().replace(/\s+/g, '-')}`;
      
      teams.push({
        id: teamId,
        rank,
        name,
        logo: logoUrl || undefined,
        country,
        countryCode,
        points,
        teamUrl: hltvTeamUrl,
        matches: [],
        matchesLoaded: false,
        matchesLoading: false,
      });
    });
    
    return teams;
  } catch (error) {
    console.error("Error scraping from EGamersWorld:", (error as Error).message);
    return [];
  }
}

async function scrapeFromHLTV(): Promise<Team[]> {
  try {
    const axiosInstance = createAxiosInstance();
    await delay(1500 + Math.random() * 1500);
    
    const response = await axiosInstance.get(`${HLTV_BASE_URL}/ranking/teams`);
    const $ = cheerio.load(response.data);
    
    const teams: Team[] = [];
    
    $(".ranked-team").each((index: number, element: Element) => {
      if (index >= 30) return false;
      
      const $team = $(element);
      
      const rankText = $team.find(".position").text().trim();
      const rank = parseInt(rankText.replace("#", ""), 10) || index + 1;
      
      const name = $team.find(".name").text().trim() || 
                   $team.find(".teamName").text().trim() ||
                   `Team ${rank}`;
      
      const teamLink = $team.find("a.moreLink").attr("href") || 
                       $team.find(".lineup-con a").attr("href") || 
                       "";
      const teamUrl = teamLink ? `${HLTV_BASE_URL}${teamLink}` : "";
      
      const teamIdMatch = teamLink.match(/\/team\/(\d+)\//);
      const id = teamIdMatch ? teamIdMatch[1] : `team-${rank}`;
      
      const logoUrl = $team.find(".team-logo img").attr("src") || 
                      $team.find("img.logo").attr("src") || 
                      "";
      
      const countryFlag = $team.find(".flag").attr("src") || "";
      const countryMatch = countryFlag.match(/\/(\w+)\.gif$/);
      let countryCode = "";
      let country = "";
      
      if (countryMatch) {
        countryCode = countryMatch[1].toLowerCase();
        country = countryCode.toUpperCase();
      }
      
      const countryTitle = $team.find(".flag").attr("title") || "";
      if (countryTitle) {
        country = countryTitle;
      }
      
      const pointsText = $team.find(".points").text().trim();
      const pointsMatch = pointsText.match(/(\d+)/);
      const points = pointsMatch ? parseInt(pointsMatch[1], 10) : undefined;

      teams.push({
        id,
        rank,
        name,
        logo: logoUrl || undefined,
        country: country || "Unknown",
        countryCode: countryCode || "xx",
        points,
        teamUrl,
        matches: [],
        matchesLoaded: false,
        matchesLoading: false,
      });
    });

    return teams;
  } catch (error) {
    console.error("Error scraping from HLTV:", (error as Error).message);
    return [];
  }
}

export async function scrapeTop30Teams(): Promise<Team[]> {
  let teams = await scrapeFromEGamersWorld();
  
  if (teams.length === 0) {
    console.log("EGamersWorld scraping failed, trying HLTV directly...");
    teams = await scrapeFromHLTV();
  }
  
  if (teams.length === 0) {
    console.log("All scraping methods failed. Using cached HLTV ranking data (December 2025).");
    return [...currentTop30Teams];
  }
  
  console.log(`Successfully scraped ${teams.length} teams from live source`);
  return teams;
}

const matchRequestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 3;
const MATCH_CACHE_TTL = 30 * 60 * 1000;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  while (matchRequestTimestamps.length > 0 && matchRequestTimestamps[0] < oneMinuteAgo) {
    matchRequestTimestamps.shift();
  }
  
  if (matchRequestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestRequest = matchRequestTimestamps[0];
    const waitTime = oldestRequest + 60000 - now + 1000;
    console.log(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await delay(waitTime);
  }
  
  matchRequestTimestamps.push(Date.now());
}

export async function scrapeTeamMatches(teamId: string, limit: number = 20): Promise<Match[]> {
  const cacheKey = `matches-${teamId}`;
  const cached = getCached<Match[]>(cacheKey);
  if (cached) {
    console.log(`Returning cached matches for team ${teamId}`);
    return cached;
  }

  try {
    await waitForRateLimit();
    
    const axiosInstance = createAxiosInstance();
    await delay(2000 + Math.random() * 2000);
    
    const response = await axiosInstance.get(`${HLTV_BASE_URL}/results?team=${teamId}`);
    const $ = cheerio.load(response.data);
    
    const matches: Match[] = [];
    let currentDate = "";
    
    $(".results-sublist").each((_: number, sublist: Element) => {
      const $sublist = $(sublist);
      const headline = $sublist.find(".standard-headline").first().text().trim();
      const dateMatch = headline.match(/Results for (.+)/i);
      if (dateMatch) {
        currentDate = dateMatch[1];
      }
      
      $sublist.find(".result-con").each((index: number, element: Element) => {
        if (matches.length >= limit) return false;
        
        const $match = $(element);
        const $result = $match.find("a.a-reset");
        
        const matchLink = $result.attr("href") || "";
        const matchUrl = matchLink ? `${HLTV_BASE_URL}${matchLink}` : "";
        
        const matchIdMatch = matchLink.match(/\/matches\/(\d+)\//);
        const id = matchIdMatch ? matchIdMatch[1] : `match-${matches.length}`;
        
        const team1 = $match.find(".team1 .team").text().trim();
        const team2 = $match.find(".team2 .team").text().trim();
        
        const score1 = $match.find(".team1 .score-won, .team1 .score-lost").text().trim();
        const score2 = $match.find(".team2 .score-won, .team2 .score-lost").text().trim();
        
        let result = "";
        if (score1 && score2) {
          result = `${score1}-${score2}`;
        }
        
        const event = $match.find(".event-name").text().trim() || 
                      $match.find(".event .name").text().trim() || 
                      "Unknown Event";
        
        matches.push({
          id,
          date: currentDate || "Unknown date",
          opponent: team2 || team1 || "Unknown",
          event,
          result,
          matchUrl,
        });
      });
    });

    if (matches.length > 0) {
      const result = matches.slice(0, limit);
      setCache(cacheKey, result);
      console.log(`Successfully scraped ${result.length} matches for team ${teamId}`);
      return result;
    }
    
    console.log(`No matches found for team ${teamId}`);
    return [];
  } catch (error) {
    console.error(`Error scraping matches for team ${teamId}:`, (error as Error).message);
    return [];
  }
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CachedData<unknown>>();
const CACHE_TTL = 10 * 60 * 1000;

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
