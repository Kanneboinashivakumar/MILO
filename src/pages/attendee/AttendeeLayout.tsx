import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEventStore } from '../../store/useEventStore';
import { IconHome, IconPlanner, IconPlan, IconMap, IconProtect, IconWarning } from '../../components/Icons';

const NAV_ITEMS = [
  { to: '/attendee',           label: 'Home',    Icon: IconHome, end: true },
  { to: '/attendee/planner',   label: 'Plan',    Icon: IconPlanner },
  { to: '/attendee/my-plan',   label: 'My Plan', Icon: IconPlan },
  { to: '/attendee/map',       label: 'Map',     Icon: IconMap },
  { to: '/attendee/protect',   label: 'Protect', Icon: IconProtect },
];

export function AttendeeLayout() {
  const navigate             = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const adaptationSuggestion = useEventStore(s => s.adaptationSuggestion);
  const eventName            = useEventStore(s => s.eventState.name);
  const attendee             = useEventStore(s => s.attendee);
  const currentUser          = useEventStore(s => s.currentUser);
  const logout               = useEventStore(s => s.logout);
  const alerts               = useEventStore(s => s.alerts);
  const acknowledgeAlert     = useEventStore(s => s.acknowledgeAlert);

  const unreadAlerts = alerts.filter(a => !a.acknowledged);
  const unreadCount  = unreadAlerts.length;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative bg-canvas shadow-lg">
      {/* Skip to Main Content Link for Keyboard Accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-ink focus:text-paper focus:rounded text-xs font-semibold shadow-md"
      >
        Skip to main content
      </a>

      {/* Header with Logo, Notification Bell, User & Prominent Log Out */}
      <header className="bg-paper border-b border-hairline px-4 py-2.5 flex items-center justify-between sticky top-0 z-20">
        <NavLink to="/login" title={eventName ? `${eventName} — Return to Welcome Screen` : "Return to Welcome Screen"} className="flex items-center gap-2 hover:opacity-85 transition-opacity">
          <img src="/logo.png" alt="MILO logo" className="w-6 h-6 object-contain rounded" />
          <span className="text-base font-bold tracking-tight text-ink">MILO</span>
        </NavLink>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real-time Notification Bell */}
          <button
            onClick={() => setShowNotifications(v => !v)}
            aria-expanded={showNotifications}
            aria-controls="live-notifications-drawer"
            className="relative p-1.5 rounded-pill text-ink hover:bg-surfaceAlt transition-colors flex items-center justify-center"
            title="Real-Time Event Broadcasts & Alerts"
            aria-label={`Broadcast Announcements: ${unreadCount} unread`}
          >
            <span className="text-sm select-none" role="img" aria-hidden="true">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-ember text-paper text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <span className="text-[11px] text-ink font-semibold truncate max-w-[80px]">
            {currentUser?.name || attendee.name || 'Alex'}
          </span>
          <button
            onClick={handleLogout}
            className="text-[10px] px-2 py-0.5 rounded-pill bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold transition-colors flex-shrink-0"
            title="Log Out of MILO"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Slide-down Notification Drawer for Live Broadcasts */}
      {showNotifications && (
        <div
          id="live-notifications-drawer"
          role="region"
          aria-label="Event broadcasts and real-time alerts"
          className="absolute top-[49px] left-0 right-0 z-30 bg-paper border-b border-hairline shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-hairline mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">Live Broadcasts &amp; Alerts</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-ember/15 text-ember px-2 py-0.2 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => alerts.forEach(a => acknowledgeAlert(a.id))}
                  className="text-[10px] text-accent font-semibold hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-midGray hover:text-ink text-xs px-1.5 py-0.5 rounded border border-hairline"
                aria-label="Close notification drawer"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-0.5">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-midGray">
                No active announcements. You are all caught up!
              </div>
            ) : (
              alerts.map(a => {
                const typeIcons: Record<string, string> = {
                  safety: '🚨',
                  crowd: '👥',
                  session: '📅',
                  route: '🗺️',
                  accessibility: '♿',
                };
                const icon = typeIcons[a.type] || '📢';
                return (
                  <div
                    key={a.id}
                    className={`p-2.5 rounded border text-xs transition-colors flex items-start justify-between gap-2 ${
                      a.acknowledged
                        ? 'bg-canvas/50 border-hairline opacity-75'
                        : 'bg-paper border-ember/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                            a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            a.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            a.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {a.severity}
                          </span>
                          <span className="text-[9px] text-midGray uppercase font-medium">
                            {a.type}
                          </span>
                          <span className="text-[10px] text-midGray ml-auto">
                            {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-ink font-medium leading-snug">{a.message}</p>
                      </div>
                    </div>
                    {!a.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(a.id)}
                        title="Mark as read"
                        className="text-[10px] text-midGray hover:text-ink px-1.5 py-0.5 rounded border border-hairline hover:bg-surfaceAlt flex-shrink-0 self-center"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Adapt alert banner */}
      {adaptationSuggestion && (
        <div
          className="bg-ember text-paper text-xs font-medium px-4 py-2.5 flex items-center justify-between sticky top-[49px] z-10 shadow-sm"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <IconWarning className="w-4 h-4 flex-shrink-0" />
            <span>Your plan needs attention</span>
          </div>
          <NavLink
            to="/attendee/my-plan"
            className="underline font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-paper rounded"
          >
            View Adapt &rarr;
          </NavLink>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto pb-20" id="main-content">
        <Outlet />
      </main>

      {/* SOS floating button */}
      <NavLink
        to="/attendee/protect"
        className="fixed bottom-20 right-4 z-30 bg-ember text-paper rounded-pill px-4 py-2 text-sm font-semibold shadow-card hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember transition-transform active:scale-95"
        aria-label="SOS Emergency Support"
      >
        SOS
      </NavLink>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-paper border-t border-hairline flex justify-around z-20 py-1" aria-label="Attendee navigation">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center py-1.5 px-3 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink rounded ${
                isActive ? 'text-ink font-semibold' : 'text-midGray hover:text-ink'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
