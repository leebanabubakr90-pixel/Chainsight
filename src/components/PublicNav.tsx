import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

export const PublicNav = () => {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
          <Link to="/demo" className="text-muted-foreground hover:text-foreground transition-colors">Live Demo</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard"><Button variant="default">Open dashboard</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
              <Link to="/auth?mode=signup"><Button>Get started</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};