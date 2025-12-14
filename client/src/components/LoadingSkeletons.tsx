import { Skeleton } from "@/components/ui/skeleton";

export function TeamRowSkeleton() {
  return (
    <tr className="border-b border-border animate-pulse">
      <td className="px-4 py-3 w-20">
        <Skeleton className="h-6 w-8" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
      </td>
      <td className="px-4 py-3 w-16 hidden md:table-cell">
        <Skeleton className="h-4 w-6" />
      </td>
      <td className="px-4 py-3 w-32">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="px-4 py-3 w-24">
        <Skeleton className="h-9 w-9 rounded-md" />
      </td>
    </tr>
  );
}

export function TeamsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="w-full overflow-x-auto" data-testid="loading-skeleton">
      <table className="w-full">
        <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
          <tr className="text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 w-20">Rank</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3 w-16 hidden md:table-cell">Country</th>
            <th className="px-4 py-3 w-32">Matches</th>
            <th className="px-4 py-3 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TeamRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MatchRowSkeleton() {
  return (
    <tr className="border-b border-border/50 animate-pulse">
      <td className="px-3 py-2 w-32">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-3 py-2">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-3 py-2 w-48 hidden lg:table-cell">
        <Skeleton className="h-4 w-36" />
      </td>
      <td className="px-3 py-2 w-24">
        <Skeleton className="h-5 w-14" />
      </td>
      <td className="px-3 py-2 w-16">
        <Skeleton className="h-4 w-4" />
      </td>
    </tr>
  );
}

export function MatchesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="max-h-96 overflow-y-auto">
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
          {Array.from({ length: rows }).map((_, i) => (
            <MatchRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
