import { Outlet, Link, useLocation } from 'react-router-dom';

export default function App() {
  const location = useLocation();
  const isQuote = !location.pathname.startsWith('/sales');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">
          Solar3d
        </Link>
        <nav className="flex gap-4">
          <Link
            to="/quote"
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              isQuote
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Quote
          </Link>
          <Link
            to="/sales"
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              !isQuote
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sales
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
