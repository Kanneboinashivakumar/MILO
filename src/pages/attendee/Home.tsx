import { useEventStore } from '../../store/useEventStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatBlock } from '../../components/StatBlock';
import { Badge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const FILTER_CHIPS = [
  { id: 'popular',      label: 'Popular'       },
  { id: 'low-crowd',    label: 'Low Crowd'      },
  { id: 'accessible',   label: 'Accessible Now' },
  { id: 'soon',         label: 'Starting Soon'  },
];

const TOP_ZONE_IDS = ['main-stage', 'central-corridor', 'startup-arena', 'workshop-hall'];

export function HomePage() {
  const navigate    = useNavigate();
  const eventName   = useEventStore(s => s.eventState.name);
  const executePrompt = useEventStore(s => s.executePrompt);
  const zones       = useEventStore(s => s.zones);
  const crowdStates = useEventStore(s => s.crowdStates);
  const sessions    = useEventStore(s => s.sessions);
  const itinerary   = useEventStore(s => s.itinerary);
  const attendee    = useEventStore(s => s.attendee);
  const setAttendee = useEventStore(s => s.setAttendee);
  const setSelectedZone = useEventStore(s => s.setSelectedZone);
  const setHighlightedRoute = useEventStore(s => s.setHighlightedRoute);

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotFeedback, setCopilotFeedback] = useState<{ summary: string; details?: string; zoneId?: string } | null>(null);

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  function handleCopilotSubmit(q?: string) {
    const query = q ?? copilotQuery;
    if (!query.trim()) return;
    const res = executePrompt(query);
    setCopilotFeedback({
      summary: res.summary,
      details: res.details,
      zoneId: res.affectedZoneId,
    });
    if (!q) setCopilotQuery('');
  }

  const nextItem = itinerary?.items[0];
  const nextSession = nextItem ? sessions.find(s => s.id === nextItem.sessionId) : null;
  const nextZone    = nextSession ? zones.find(z => z.id === nextSession.zoneId) : null;
  const nextCrowd   = nextZone ? crowdStates.find(cs => cs.zoneId === nextZone.id) : null;

  function handleNavigateNext() {
    if (nextZone && nextItem) {
      setSelectedZone(nextZone.id);
      setHighlightedRoute(nextItem.routeZoneIds);
    }
    navigate('/attendee/map');
  }

  function handleRouteToSession(zoneId: string) {
    setSelectedZone(zoneId);
    navigate('/attendee/map');
  }

  const topZones = zones
    .filter(z => TOP_ZONE_IDS.includes(z.id))
    .map(z => ({ zone: z, crowd: crowdStates.find(cs => cs.zoneId === z.id) }));

  let filteredSessions = sessions.filter(s => !s.isCancelled);
  if (activeFilters.includes('popular'))    filteredSessions = filteredSessions.sort((a, b) => b.popularity - a.popularity);
  if (activeFilters.includes('low-crowd')) {
    filteredSessions = filteredSessions.filter(s => {
      const cs = crowdStates.find(c => c.zoneId === s.zoneId);
      return cs && cs.status === 'low';
    });
  }
  if (activeFilters.includes('accessible')) {
    filteredSessions = filteredSessions.filter(s => {
      const zone = zones.find(z => z.id === s.zoneId);
      return zone?.hasAccessibleRoute;
    });
  }
  if (activeFilters.includes('soon')) {
    filteredSessions = [...filteredSessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const displaySessions = filteredSessions.slice(0, 4);

  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <p className="text-xs text-midGray uppercase tracking-widest mb-0.5 font-bold">{eventName}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Hello, {attendee.name}
        </h1>
        <p className="text-sm text-midGray mt-0.5">Make every moment count.</p>
      </div>

      {/* MILO AI Event Copilot Card */}
      <Card className="bg-gradient-to-br from-paper via-paper to-canvas border border-inkSoft/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">✨</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink">MILO Real-Time AI Copilot</span>
          </div>
          <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-pill border border-green-200 font-medium">
            Sub-5ms Local
          </span>
        </div>

        <div className="flex gap-1.5 mb-2.5">
          <input
            id="home-copilot-input"
            type="text"
            value={copilotQuery}
            onChange={(e) => setCopilotQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCopilotSubmit();
            }}
            placeholder="Ask or prompt MILO (e.g. 'Where is pizza?', 'AI workshop')"
            aria-label="Ask or prompt MILO AI Copilot"
            className="flex-1 text-xs bg-canvas rounded-nested border border-hairline px-3 py-2 text-ink placeholder-midGray focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
          />
          <Button
            className="px-3.5 py-1.5 text-xs h-auto"
            onClick={() => handleCopilotSubmit()}
            disabled={!copilotQuery.trim()}
          >
            Ask
          </Button>
        </div>

        {/* Quick Copilot Pills */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: '🍕 Free Pizza', query: 'Where is pizza drop?' },
            { label: '🛠️ AI Workshops', query: 'AI Agent Workshop' },
            { label: '👨‍🏫 Mentors', query: 'Find mentor sessions' },
            { label: '🏆 Judging Pods', query: 'Where is judging?' },
            { label: '🏃 Low Crowd', query: 'Show low crowd spots' },
          ].map((pill) => (
            <button
              key={pill.label}
              onClick={() => handleCopilotSubmit(pill.query)}
              className="text-[11px] px-2.5 py-1 rounded-pill bg-canvas hover:bg-hairline text-ink border border-hairline font-medium transition-colors"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Real-time Response Banner */}
        {copilotFeedback && (
          <div className="mt-3 p-2.5 rounded-nested bg-canvas border border-hairline flex flex-col gap-1.5 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink">✦ {copilotFeedback.summary}</p>
                {copilotFeedback.details && (
                  <p className="text-[11px] text-midGray mt-0.5">{copilotFeedback.details}</p>
                )}
              </div>
              <button
                onClick={() => setCopilotFeedback(null)}
                className="text-midGray hover:text-ink text-xs px-1"
              >
                ✕
              </button>
            </div>
            {copilotFeedback.zoneId && (
              <div className="flex gap-2 pt-1 border-t border-hairline/60">
                <Button
                  variant="outline"
                  className="text-[11px] px-3 py-1 h-auto"
                  onClick={() => handleRouteToSession(copilotFeedback.zoneId!)}
                >
                  Show on Live Map &rarr;
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {nextSession && nextItem ? (
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Next for you</p>
          <p className="text-xl font-semibold tracking-tight text-ink mb-3">{nextSession.title}</p>
          <div className="flex gap-5 mb-4">
            <StatBlock label="Walk" value={nextItem.walkMinutes + 'm'} size="sm" />
            <StatBlock label="Start" value={nextSession.startTime} size="sm" />
            <StatBlock label="Zone" value={nextZone?.name.split(' ')[0] ?? ' · '} size="sm" />
          </div>
          {nextCrowd && <StatusBadge status={nextCrowd.status} pct={nextCrowd.utilizationPct} />}
          <Button
            className="mt-4 w-full"
            onClick={handleNavigateNext}
            aria-label={'Navigate to ' + nextSession.title}
          >
            Navigate &rarr;
          </Button>
        </Card>
      ) : (
        <Card className="text-center py-6">
          <p className="text-base font-semibold text-ink mb-1">No plan yet</p>
          <p className="text-sm text-midGray mb-4">Build a personalized schedule in seconds.</p>
          <Button onClick={() => navigate('/attendee/planner')} aria-label="Plan my experience">
            ✦ Plan my experience
          </Button>
        </Card>
      )}

      {nextSession && (
        <Button variant="outline" onClick={() => navigate('/attendee/planner')} aria-label="Rebuild plan">
          ✦ Build new plan
        </Button>
      )}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Discover Sessions</p>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Session filters">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.id}
              onClick={() => toggleFilter(chip.id)}
              aria-pressed={activeFilters.includes(chip.id)}
              className={[
                'rounded-pill px-3 py-1 text-xs font-medium border transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                activeFilters.includes(chip.id)
                  ? 'bg-inkSoft text-paper border-inkSoft'
                  : 'bg-paper text-ink border-hairline hover:bg-canvas',
              ].join(' ')}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {displaySessions.map(session => {
          const zone  = zones.find(z => z.id === session.zoneId);
          const crowd = crowdStates.find(cs => cs.zoneId === session.zoneId);
          return (
            <Card key={session.id} className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink leading-snug">{session.title}</p>
                  <p className="text-xs text-midGray mt-0.5">{zone?.name} &middot; {session.startTime} · {session.endTime}</p>
                </div>
                {crowd && <StatusBadge status={crowd.status} pct={crowd.utilizationPct} />}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-hairline">
                <div className="flex gap-1.5 flex-wrap">
                  {session.tags.map(tag => (
                    <Badge key={tag} variant="soft" className="!text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="!text-xs !py-1 !px-2.5 text-ink font-semibold"
                  onClick={() => handleRouteToSession(session.zoneId)}
                  aria-label={'View ' + session.title + ' on venue map'}
                >
                  Map &rarr;
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Live Venue Status</p>
        <div className="flex flex-col gap-2">
          {topZones.map(({ zone, crowd }) => (
            <div key={zone.id} className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
              <span className="text-sm font-medium text-ink">{zone.name}</span>
              {crowd && <StatusBadge status={crowd.status} pct={crowd.utilizationPct} />}
            </div>
          ))}
        </div>
      </div>

      <Card className="!p-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Accessibility Preferences</p>
        <div className="flex flex-col gap-2.5">
          {[
            { key: 'avoidStairs',         label: 'Avoid stairs (Step-free routing)' },
            { key: 'wheelchairAccessible', label: 'Wheelchair accessible routes only' },
            { key: 'avoidCrowds',         label: 'Prefer low-crowd corridors' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer text-sm text-ink font-medium">
              <input
                type="checkbox"
                checked={attendee.accessibilityProfile[key as keyof typeof attendee.accessibilityProfile]}
                onChange={e => setAttendee({
                  ...attendee,
                  accessibilityProfile: { ...attendee.accessibilityProfile, [key]: e.target.checked },
                })}
                className="rounded w-4 h-4 accent-inkSoft"
                aria-label={label}
              />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="!p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-midGray">Help Center</p>
            <p className="text-sm font-semibold text-ink">Venue Info &amp; FAQs</p>
          </div>
          <Button
            variant="outline"
            className="!text-xs !py-1 !px-2.5"
            onClick={() => setShowHelpCenter(!showHelpCenter)}
            aria-expanded={showHelpCenter}
          >
            {showHelpCenter ? 'Hide' : 'View'}
          </Button>
        </div>
        {showHelpCenter && (
          <div className="mt-3 pt-3 border-t border-hairline flex flex-col gap-2 text-xs text-ink">
            <p><strong>Help Desk:</strong> Located near Central Corridor. Staff available 09:00 · 18:00.</p>
            <p><strong>First Aid:</strong> Adjacent to Help Desk, equipped for medical emergencies.</p>
            <p><strong>Accessibility:</strong> All main corridors feature step-free routes. Enable preferences above for automated rerouting.</p>
            <p><strong>Emergency:</strong> Tap the red SOS button from any screen to view direct evacuation paths.</p>
          </div>
        )}
      </Card>

      <p className="text-[10px] text-midGray text-center pb-2">
        Simulated Event Data · Demo Simulation
      </p>
    </div>
  );
}
