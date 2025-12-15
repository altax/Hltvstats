import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Demos from "@/pages/Demos";
import { Users, FileVideo } from "lucide-react";

function NavTabs() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-card border-b" data-testid="nav-tabs">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1">
          <Link href="/">
            <Button
              variant="ghost"
              className={`rounded-none border-b-2 ${
                location === "/" 
                  ? "border-primary text-foreground" 
                  : "border-transparent text-muted-foreground"
              }`}
              data-testid="nav-tab-teams"
            >
              <Users className="w-4 h-4 mr-2" />
              Teams
            </Button>
          </Link>
          <Link href="/demos">
            <Button
              variant="ghost"
              className={`rounded-none border-b-2 ${
                location === "/demos" 
                  ? "border-primary text-foreground" 
                  : "border-transparent text-muted-foreground"
              }`}
              data-testid="nav-tab-demos"
            >
              <FileVideo className="w-4 h-4 mr-2" />
              Demos
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/demos" component={Demos} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="min-h-screen flex flex-col">
          <NavTabs />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
