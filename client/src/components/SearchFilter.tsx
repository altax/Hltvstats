import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: "all" | "top10" | "top20" | "top30";
  onFilterChange: (filter: "all" | "top10" | "top20" | "top30") => void;
}

const filterOptions = [
  { id: "all" as const, label: "All Teams" },
  { id: "top10" as const, label: "Top 10" },
  { id: "top20" as const, label: "Top 20" },
  { id: "top30" as const, label: "Top 30" },
];

export function SearchFilter({ 
  searchQuery, 
  onSearchChange, 
  activeFilter, 
  onFilterChange 
}: SearchFilterProps) {
  return (
    <div 
      className="sticky top-16 z-40 w-full h-14 bg-background border-b border-border flex items-center gap-4 px-6"
      data-testid="search-filter-bar"
    >
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-10 pr-10 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          data-testid="input-search"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((filter) => (
          <Badge
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "secondary"}
            className={`cursor-pointer select-none ${
              activeFilter === filter.id 
                ? "bg-primary text-primary-foreground" 
                : ""
            }`}
            onClick={() => onFilterChange(filter.id)}
            data-testid={`filter-${filter.id}`}
          >
            {filter.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
