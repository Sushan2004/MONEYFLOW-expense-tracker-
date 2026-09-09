import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import TransactionDetail from './pages/TransactionDetail.jsx';
import AddEntry from './pages/AddEntry.jsx';
import Budget from './pages/Budget.jsx';
import Reports from './pages/Reports.jsx';
import Categories from './pages/Categories.jsx';
import Wallet from './pages/Wallet.jsx';
import Goals from './pages/Goals.jsx';
import Settings from './pages/Settings.jsx';
import Auth from './pages/Auth.jsx';
import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';
import { useSession } from './state/SessionState.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/signup" element={<LegacySignupRoute />} />
      <Route path="/about" element={<AboutRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/:id" element={<TransactionDetail />} />
          <Route path="add" element={<AddEntry />} />
          <Route path="budget" element={<Budget />} />
          <Route path="reports" element={<Reports />} />
          <Route path="categories" element={<Categories />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="goals" element={<Goals />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function HomeRoute() {
  const { isAuthenticated } = useSession();
  const location = useLocation();

  if (isAuthenticated && !location.hash) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function AuthRoute() {
  const { isAuthenticated } = useSession();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />;
}

function LegacySignupRoute() {
  const { isAuthenticated } = useSession();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/auth?mode=signup'} replace />;
}

function AboutRoute() {
  return <Navigate to="/#about" replace />;
}

function ProtectedRoute() {
  const { isAuthenticated } = useSession();
  const location = useLocation();

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?mode=login&from=${encodeURIComponent(from)}`} replace />;
  }

  return <Outlet />;
}
