import { Loader2 } from "lucide-react";

interface HeaderProps {
  isLoading: boolean;
  lastUpdated?: string;
}

export function Header({ isLoading, lastUpdated }: HeaderProps) {
  return (
    <header 
      className="sticky top-0 z-50 w-full h-16 bg-card border-b border-card-border shadow-md flex items-center justify-between px-6"
      data-testid="header"
    >
      <div className="flex items-center gap-3">
        <span className="material-icons text-primary text-3xl">sports_esports</span>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-foreground">
            HLTV Match Tracker
          </h1>
          <p className="text-xs text-muted-foreground">
            Top 30 CS2 Teams & Match History
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground hidden sm:block" data-testid="text-last-updated">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-primary" data-testid="loading-indicator">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium hidden sm:block">Loading...</span>
          </div>
        )}
      </div>
    </header>
  );
}
