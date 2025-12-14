interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = "sports_esports" }: EmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      data-testid="empty-state"
    >
      <span className="material-icons text-muted-foreground/50 text-6xl mb-4">
        {icon}
      </span>
      <h3 className="font-display font-semibold text-xl text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md">
        {message}
      </p>
    </div>
  );
}

export function ErrorState({ 
  title, 
  message, 
  onRetry 
}: { 
  title: string; 
  message: string; 
  onRetry?: () => void;
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      data-testid="error-state"
    >
      <span className="material-icons text-destructive/60 text-6xl mb-4">
        error_outline
      </span>
      <h3 className="font-display font-semibold text-xl text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          data-testid="button-retry"
        >
          <span className="material-icons text-sm">refresh</span>
          Try Again
        </button>
      )}
    </div>
  );
}

export function NoMatchesState() {
  return (
    <div 
      className="flex items-center justify-center py-8 px-4 text-center"
      data-testid="no-matches-state"
    >
      <span className="material-icons text-muted-foreground/40 text-3xl mr-3">
        inbox
      </span>
      <p className="text-muted-foreground text-sm">
        No matches found for this team
      </p>
    </div>
  );
}
