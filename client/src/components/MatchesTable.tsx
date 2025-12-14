import type { Match } from "@shared/schema";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NoMatchesState } from "./EmptyState";
import { MatchesTableSkeleton } from "./LoadingSkeletons";

interface MatchesTableProps {
  matches: Match[];
  isLoading?: boolean;
  error?: string;
  teamName: string;
}

function getResultVariant(result: string): "default" | "secondary" | "destructive" {
  const lowerResult = result.toLowerCase();
  if (lowerResult.includes("w") || lowerResult.startsWith("1")) {
    return "default";
  }
  if (lowerResult.includes("l") || lowerResult.startsWith("0")) {
    return "destructive";
  }
  return "secondary";
}

export function MatchesTable({ matches, isLoading, error, teamName }: MatchesTableProps) {
  if (isLoading) {
    return <MatchesTableSkeleton rows={5} />;
  }

  if (error) {
    return (
      <div className="py-6 px-4 text-center">
        <span className="material-icons text-destructive/60 text-2xl mb-2">warning</span>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return <NoMatchesState />;
  }

  return (
    <div className="max-h-96 overflow-y-auto" data-testid={`matches-table-${teamName}`}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 w-32">Date</th>
            <th className="px-3 py-2">Opponent</th>
            <th className="px-3 py-2 w-48 hidden lg:table-cell">Event</th>
            <th className="px-3 py-2 w-24">Result</th>
            <th className="px-3 py-2 w-16">Link</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => (
            <tr 
              key={match.id || index} 
              className="border-b border-border/50 hover-elevate"
              data-testid={`match-row-${index}`}
            >
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                {match.date}
              </td>
              <td className="px-3 py-2 font-medium text-foreground">
                {match.opponent}
              </td>
              <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell truncate max-w-48" title={match.event}>
                {match.event}
              </td>
              <td className="px-3 py-2">
                <Badge 
                  variant={getResultVariant(match.result)}
                  className="text-xs"
                >
                  {match.result}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <a
                  href={match.matchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-primary transition-colors"
                  data-testid={`link-match-${index}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
