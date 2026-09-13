import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { useEventStore } from '../../store/useEventStore';

const SIDEBAR_ITEMS = [
  { to: '/organizer',              label: 'Overview',       icon: '📊', end: true },
  { to: '/organizer/live-venue',   label: 'Live Venue',     icon: '🗺️', end: true },
  { to: '/organizer/event-twin',   label: 'Event Twin',     icon: '⚡', end: true },
  { to: '/organizer/alerts',       label: 'Alerts',         icon: '🚨', end: true },
];

export function OrganizerLayout() {
  const navigate = useNavigate();
  const eventState = useEventStore(s => s.eventState);
  const currentUser = useEventStore(s => s.currentUser);
  const logout = useEventStore(s => s.logout);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Skip to Main Content Link for Keyboard Accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-ink focus:text-paper focus:rounded text-xs font-semibold shadow-md"
      >
        Skip to main content
      </a>
      <Sidebar
        items={SIDEBAR_ITEMS}
        title="MILO Command"
        footer={
          <div className="text-xs text-midGray flex flex-col gap-2">
            <div>
              <div className="font-semibold text-ink truncate">{eventState.name}</div>
              <div>Health: {eventState.health}/100</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] text-red-600 hover:text-red-800 font-semibold text-left underline"
            >
              Log Out ({currentUser?.name || 'Sarah'})
            </button>
          </div>
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-paper border-b border-hairline px-6 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold tracking-tight text-ink">Organizer Command Center</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1 rounded-pill bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors font-semibold"
            >
              Log Out
            </button>
            <NavLink
              to="/attendee"
              className="text-xs px-3 py-1 rounded-pill bg-inkSoft text-paper hover:bg-ink transition-colors font-medium"
            >
              Attendee View &rarr;
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
