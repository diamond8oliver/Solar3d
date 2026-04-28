import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sun } from 'lucide-react';

export default function App() {
  const { pathname } = useLocation();

  const navItems = [
    { to: '/quote', label: 'Get Quote' },
    { to: '/sales', label: 'Dashboard' },
    { to: '/pricing', label: 'Pricing' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Sun className="h-6 w-6" />
            Solar3d
          </Link>
          <nav className="flex gap-1">
            {navItems.map(({ to, label }) => {
              const active = pathname === to || (to === '/quote' && pathname === '/');
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
