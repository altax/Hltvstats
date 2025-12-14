import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Team, TeamsResponse, MatchesResponse } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { SearchFilter } from "@/components/SearchFilter";
import { TeamsTable } from "@/components/TeamsTable";
import { ErrorState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type FilterType = "all" | "top10" | "top20" | "top30";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamsWithMatches, setTeamsWithMatches] = useState<Map<string, Team>>(new Map());

  const { 
    data: teamsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<TeamsResponse>({
    queryKey: ["/api/teams"],
  });

  const loadMatchesMutation = useMutation({
    mutationFn: async (teamId: string) => {
      setTeamsWithMatches(prev => {
        const newMap = new Map(prev);
        const team = teams.find(t => t.id === teamId);
        if (team) {
          newMap.set(teamId, { ...team, matchesLoading: true });
        }
        return newMap;
      });

      const response = await apiRequest("GET", `/api/teams/${teamId}/matches`);
      return await response.json() as MatchesResponse;
    },
    onSuccess: (data) => {
      setTeamsWithMatches(prev => {
        const newMap = new Map(prev);
        const team = teams.find(t => t.id === data.teamId);
        if (team) {
          newMap.set(data.teamId, {
            ...team,
            matches: data.matches,
            matchesLoaded: true,
            matchesLoading: false,
          });
        }
        return newMap;
      });
    },
    onError: (error, teamId) => {
      setTeamsWithMatches(prev => {
        const newMap = new Map(prev);
        const team = teams.find(t => t.id === teamId);
        if (team) {
          newMap.set(teamId, {
            ...team,
            matchesLoading: false,
            matchesError: "Failed to load matches. Please try again.",
          });
        }
        return newMap;
      });
    },
  });

  const baseTeams = teamsData?.teams || [];
  
  const teams = useMemo(() => {
    return baseTeams.map(team => {
      const updatedTeam = teamsWithMatches.get(team.id);
      return updatedTeam || team;
    });
  }, [baseTeams, teamsWithMatches]);

  const filteredTeams = useMemo(() => {
    let filtered = teams;

    if (activeFilter === "top10") {
      filtered = filtered.filter(t => t.rank <= 10);
    } else if (activeFilter === "top20") {
      filtered = filtered.filter(t => t.rank <= 20);
    } else if (activeFilter === "top30") {
      filtered = filtered.filter(t => t.rank <= 30);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.country.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [teams, activeFilter, searchQuery]);

  const handleToggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const handleLoadMatches = (teamId: string) => {
    loadMatchesMutation.mutate(teamId);
  };

  const handleRefresh = () => {
    setTeamsWithMatches(new Map());
    setExpandedTeams(new Set());
    refetch();
  };

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <Header 
        isLoading={isLoading} 
        lastUpdated={teamsData?.lastUpdated}
      />
      
      <SearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="font-display font-bold text-2xl text-foreground">
              Team Rankings
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredTeams.length} teams {searchQuery && `matching "${searchQuery}"`}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="default"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {error ? (
          <ErrorState
            title="Failed to Load Teams"
            message="We couldn't fetch the team rankings from HLTV. This might be due to network issues or the service being temporarily unavailable."
            onRetry={handleRefresh}
          />
        ) : (
          <div className="bg-card rounded-md border border-card-border overflow-hidden">
            <TeamsTable
              teams={filteredTeams}
              isLoading={isLoading}
              onLoadMatches={handleLoadMatches}
              expandedTeams={expandedTeams}
              onToggleExpand={handleToggleExpand}
            />
          </div>
        )}
        
        <footer className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Data sourced from HLTV.org. This is an unofficial tracker for educational purposes.
          </p>
        </footer>
      </main>
    </div>
  );
}
