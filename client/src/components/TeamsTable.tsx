import { useState } from "react";
import type { Team } from "@shared/schema";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchesTable } from "./MatchesTable";
import { TeamsTableSkeleton } from "./LoadingSkeletons";
import { EmptyState } from "./EmptyState";

interface TeamsTableProps {
  teams: Team[];
  isLoading: boolean;
  onLoadMatches: (teamId: string) => void;
  expandedTeams: Set<string>;
  onToggleExpand: (teamId: string) => void;
}

function TeamRow({ 
  team, 
  isExpanded, 
  onToggle, 
  onLoadMatches 
}: { 
  team: Team; 
  isExpanded: boolean;
  onToggle: () => void;
  onLoadMatches: () => void;
}) {
  const handleExpand = () => {
    if (!team.matchesLoaded && !team.matchesLoading) {
      onLoadMatches();
    }
    onToggle();
  };

  const countryFlag = team.countryCode 
    ? `https://flagcdn.com/24x18/${team.countryCode.toLowerCase()}.png`
    : null;

  return (
    <>
      <tr 
        className={`border-b border-border hover-elevate transition-colors ${
          isExpanded ? "bg-muted/30" : ""
        }`}
        data-testid={`team-row-${team.id}`}
      >
        <td className="px-4 py-3 w-20">
          <span className="font-display font-bold text-lg text-primary">
            #{team.rank}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {team.logo ? (
              <img 
                src={team.logo} 
                alt={`${team.name} logo`}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="material-icons text-muted-foreground text-sm">groups</span>
              </div>
            )}
            <a 
              href={team.teamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors"
              data-testid={`link-team-${team.id}`}
            >
              {team.name}
            </a>
          </div>
        </td>
        <td className="px-4 py-3 w-16 hidden md:table-cell">
          {countryFlag && (
            <img 
              src={countryFlag} 
              alt={team.country}
              title={team.country}
              className="w-6 h-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </td>
        <td className="px-4 py-3 w-32">
          <div className="flex items-center gap-2">
            {team.matchesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : team.matchesLoaded ? (
              <Badge variant="secondary" className="text-xs">
                {team.matches?.length || 0} matches
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Not loaded
              </Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3 w-24">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleExpand}
            disabled={team.matchesLoading}
            data-testid={`button-expand-${team.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        </td>
      </tr>
      
      {isExpanded && (
        <tr data-testid={`team-matches-row-${team.id}`}>
          <td colSpan={5} className="p-0">
            <div className="bg-muted/20 border-b border-border pl-8 pr-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons text-primary text-sm">history</span>
                <h4 className="font-display font-semibold text-sm text-foreground">
                  Match History - {team.name}
                </h4>
              </div>
              <MatchesTable 
                matches={team.matches || []}
                isLoading={team.matchesLoading}
                error={team.matchesError}
                teamName={team.name}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function TeamsTable({ 
  teams, 
  isLoading, 
  onLoadMatches, 
  expandedTeams, 
  onToggleExpand 
}: TeamsTableProps) {
  if (isLoading) {
    return <TeamsTableSkeleton rows={10} />;
  }

  if (!teams || teams.length === 0) {
    return (
      <EmptyState 
        title="No Teams Found"
        message="We couldn't find any teams matching your criteria. Try adjusting your search or filters."
        icon="search_off"
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto" data-testid="teams-table">
      <table className="w-full">
        <thead className="sticky top-[7.5rem] z-30 bg-card border-b border-card-border">
          <tr className="text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 w-20">Rank</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3 w-16 hidden md:table-cell">Country</th>
            <th className="px-4 py-3 w-32">Matches</th>
            <th className="px-4 py-3 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              isExpanded={expandedTeams.has(team.id)}
              onToggle={() => onToggleExpand(team.id)}
              onLoadMatches={() => onLoadMatches(team.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
