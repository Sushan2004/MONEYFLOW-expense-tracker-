import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import FAB from './FAB.jsx';
import ToastHost from './ToastHost.jsx';
import { useAppState } from '../state/AppState.jsx';

const HIDE_FAB_ON = ['/add'];

export default function Layout() {
  const { state } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const hideFab = HIDE_FAB_ON.includes(location.pathname);

  return (
    <div className="app">
      <Sidebar user={state.user} />
      <main className="main" id="main">
        <Outlet />
      </main>
      {!hideFab && <FAB onClick={() => navigate('/add')} />}
      <ToastHost toast={state.toast} />
    </div>
  );
}
