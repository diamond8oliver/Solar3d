import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import QuotePage from './pages/QuotePage';
import SalesPage from './pages/SalesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <QuotePage /> },
      { path: 'quote', element: <QuotePage /> },
      { path: 'quote/:id', element: <QuotePage /> },
      { path: 'sales', element: <SalesPage /> },
      { path: 'sales/:id', element: <SalesPage /> },
      { path: 'share/:token', element: <QuotePage /> },
    ],
  },
]);
