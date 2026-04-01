import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navLinks = [
  { label: "Dashboard", path: "/" },
  { label: "Discovery", path: "/discovery" },
  { label: "Tests", path: "/test-arena" },
  { label: "Analytics", path: "/review" },
];

const TopNav = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full top-0 sticky z-50 bg-background border-b border-outline-variant/20">
      <div className="flex justify-between items-center px-4 md:px-8 py-4 w-full max-w-full mx-auto">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2 text-xl md:text-2xl font-black tracking-tight text-primary font-headline">
            <span className="material-symbols-outlined text-primary filled text-2xl">bolt</span>
            Test Arena
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path ||
                (link.path === "/test-arena" && location.pathname.startsWith("/test-arena"));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-headline font-bold text-base transition-colors ${
                    isActive
                      ? "text-primary border-b-2 border-primary pb-1"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors" data-testid="btn-notifications">
            <span className="material-symbols-outlined text-muted-foreground text-xl">notifications</span>
          </button>
          <button
            className="md:hidden p-2 rounded-full hover:bg-surface-container transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="btn-mobile-menu"
          >
            <span className="material-symbols-outlined text-muted-foreground">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden flex flex-col gap-1 px-4 pb-4 bg-background border-b border-outline-variant">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`font-headline font-bold text-base py-3 px-4 rounded-lg transition-colors ${
                  isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-surface-container"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};

export default TopNav;
