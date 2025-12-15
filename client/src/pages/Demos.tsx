import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  Loader2,
  FileVideo
} from "lucide-react";

interface SupabaseMatch {
  id: number;
  team_id: string;
  hltv_match_id: string;
  date: string;
  opponent: string;
  opponent_logo: string | null;
  event: string;
  result: string;
  is_win: boolean;
  match_url: string;
  map_score: string | null;
  created_at: string;
  team_name?: string;
  team_logo?: string | null;
}

interface SupabaseTeam {
  id: string;
  hltv_id: string;
  name: string;
  country: string;
  logo_url: string | null;
  rank: number;
}

interface MatchesResponse {
  matches: SupabaseMatch[];
  count: number;
}

interface TeamsResponse {
  teams: SupabaseTeam[];
  count: number;
}

interface DownloadResult {
  matchId: number;
  matchUrl: string;
  demoLink: string | null;
  downloaded: boolean;
  filePath?: string;
  message?: string;
}

export default function Demos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [downloadResults, setDownloadResults] = useState<Map<number, DownloadResult>>(new Map());
  const { toast } = useToast();

  const { data: matchesData, isLoading: matchesLoading, refetch } = useQuery<MatchesResponse>({
    queryKey: ["/api/supabase/matches"],
  });

  const { data: teamsData } = useQuery<TeamsResponse>({
    queryKey: ["/api/supabase/teams"],
  });

  const downloadMutation = useMutation({
    mutationFn: async (matchId: number) => {
      const response = await apiRequest("POST", `/api/supabase/matches/${matchId}/download-demo`);
      return await response.json() as DownloadResult;
    },
    onMutate: (matchId) => {
      setDownloadingIds(prev => new Set(prev).add(matchId));
    },
    onSuccess: (data, matchId) => {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
      setDownloadResults(prev => new Map(prev).set(matchId, data));
      
      if (data.downloaded) {
        toast({
          title: "Demo Downloaded",
          description: `Demo for match ${matchId} downloaded successfully`,
        });
      } else {
        toast({
          title: "Demo Not Available",
          description: data.message || "Demo link was not found on the match page",
          variant: "destructive",
        });
      }
    },
    onError: (error, matchId) => {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download demo",
        variant: "destructive",
      });
    },
  });

  const getTeamName = (match: SupabaseMatch): string => {
    return match.team_name || "Unknown Team";
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const matches = matchesData?.matches || [];
  
  const filteredMatches = matches.filter(match => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      match.opponent.toLowerCase().includes(query) ||
      match.event.toLowerCase().includes(query) ||
      getTeamName(match).toLowerCase().includes(query)
    );
  });

  const handleDownload = (matchId: number) => {
    downloadMutation.mutate(matchId);
  };

  const handleRefresh = () => {
    setDownloadResults(new Map());
    refetch();
  };

  return (
    <div className="min-h-screen bg-background" data-testid="demos-page">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <FileVideo className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Demo Downloads</h1>
                <p className="text-sm text-muted-foreground">
                  Download CS2 demo files from matches in the database
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={matchesLoading}
              data-testid="button-refresh-demos"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${matchesLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by team, opponent, or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-demos"
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-4">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground" data-testid="text-match-count">
            {filteredMatches.length} matches {searchQuery && `matching "${searchQuery}"`}
          </p>
        </div>

        {matchesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileVideo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Matches Found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No matches match your search criteria" 
                  : "No matches in the database yet. Sync teams and matches first."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const isDownloading = downloadingIds.has(match.id);
              const result = downloadResults.get(match.id);
              
              return (
                <Card key={match.id} data-testid={`card-match-${match.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate" data-testid={`text-team-${match.id}`}>
                            {getTeamName(match)}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium truncate" data-testid={`text-opponent-${match.id}`}>
                            {match.opponent}
                          </span>
                          <Badge 
                            variant={match.is_win ? "default" : "secondary"}
                            className="ml-2"
                            data-testid={`badge-result-${match.id}`}
                          >
                            {match.result}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span data-testid={`text-date-${match.id}`}>{formatDate(match.date)}</span>
                          <span data-testid={`text-event-${match.id}`}>{match.event}</span>
                          {match.map_score && (
                            <span data-testid={`text-score-${match.id}`}>Maps: {match.map_score}</span>
                          )}
                        </div>
                        
                        {result && (
                          <div className="mt-2 flex items-center gap-2">
                            {result.downloaded ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-600 dark:text-green-400">
                                  Downloaded: {result.filePath?.split("/").pop()}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-600 dark:text-red-400">
                                  {result.message || "Demo not available"}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {match.match_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            data-testid={`button-view-match-${match.id}`}
                          >
                            <a href={match.match_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        
                        <Button
                          variant="default"
                          onClick={() => handleDownload(match.id)}
                          disabled={isDownloading || result?.downloaded}
                          data-testid={`button-download-${match.id}`}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : result?.downloaded ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Downloaded
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download Demo
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Demos are downloaded from HLTV.org. Download times may vary based on file size.
          </p>
        </footer>
      </main>
    </div>
  );
}
