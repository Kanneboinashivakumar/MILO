import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Badge } from '../../components/Badge';
import { AdaptCard } from '../../features/attendee/AdaptCard';
import { useEventStore } from '../../store/useEventStore';
import type { ItineraryItem } from '../../types';

export function MyPlanPage() {
  const navigate                = useNavigate();
  const itinerary               = useEventStore(s => s.itinerary);
  const sessions                = useEventStore(s => s.sessions);
  const zones                   = useEventStore(s => s.zones);
  const crowdStates             = useEventStore(s => s.crowdStates);
  const suggestion              = useEventStore(s => s.adaptationSuggestion);
  const setItinerary            = useEventStore(s => s.setItinerary);
  const setSelectedZone         = useEventStore(s => s.setSelectedZone);
  const setHighlighted          = useEventStore(s => s.setHighlightedRoute);
  const savedPlanHistory        = useEventStore(s => s.savedPlanHistory);
  const restorePlanFromHistory  = useEventStore(s => s.restorePlanFromHistory);
  const deletePlanFromHistory   = useEventStore(s => s.deletePlanFromHistory);
  const saveCurrentPlanToHistory = useEventStore(s => s.saveCurrentPlanToHistory);

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  function removeItem(itemId: string) {
    if (!itinerary) return;
    setItinerary({ ...itinerary, items: itinerary.items.filter(i => i.id !== itemId) });
  }

  function handleNavigateItem(item: ItineraryItem, zoneId?: string) {
    if (zoneId) setSelectedZone(zoneId);
    setHighlighted(item.routeZoneIds);
    navigate('/attendee/map');
  }

  function handleSaveCurrentVersion() {
    if (!itinerary) return;
    saveCurrentPlanToHistory();
    setSaveSuccessMsg('Current plan archived to history!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header with Title & Tab Switcher */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">My Schedule</h1>
            <p className="text-xs text-midGray mt-0.5">
              Personalized real-time itinerary &amp; version archives
            </p>
          </div>
          {itinerary && activeTab === 'current' && (
            <Badge variant="soft">
              {new Date(itinerary.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
        </div>

        {/* Segmented Tab Navigation */}
        <div className="flex rounded-nested bg-canvas p-1 border border-hairline text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-1.5 rounded-nested transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-paper text-ink shadow-sm'
                : 'text-midGray hover:text-ink'
            }`}
          >
            <span>📌 Active Plan</span>
            {itinerary && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-pill bg-inkSoft text-paper font-bold">
                {itinerary.items.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-nested transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-paper text-ink shadow-sm'
                : 'text-midGray hover:text-ink'
            }`}
          >
            <span>📜 Plan History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-pill bg-canvas border border-hairline text-midGray font-bold">
              {savedPlanHistory.length}
            </span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-2.5 rounded-nested bg-green-50 border border-green-200 text-green-800 text-xs font-medium animate-fadeIn">
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* ─── TAB 1: ACTIVE LIVE PLAN ────────────────────────────── */}
      {activeTab === 'current' && (
        <>
          {(!itinerary || itinerary.items.length === 0) ? (
            <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center text-xl">
                📅
              </div>
              <h2 className="text-xl font-semibold text-ink">No active plan</h2>
              <p className="text-sm text-midGray max-w-xs">
                {savedPlanHistory.length > 0
                  ? `You have ${savedPlanHistory.length} saved plans in your history. You can activate one, or build a new schedule.`
                  : 'Use the AI Planner to build a personalized schedule tailored to your hackathon interests.'}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button onClick={() => navigate('/attendee/planner')} aria-label="Go to AI planner">
                  ✦ Plan my experience
                </Button>
                {savedPlanHistory.length > 0 && (
                  <Button variant="outline" onClick={() => setActiveTab('history')}>
                    Browse History ({savedPlanHistory.length}) &rarr;
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {suggestion && (
                <div role="region" aria-label="MILO adaptation suggestion">
                  <AdaptCard />
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-midGray px-1">
                <span>{itinerary.items.length} sessions &middot; {itinerary.totalMinutes} min total</span>
                <button
                  onClick={handleSaveCurrentVersion}
                  className="text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  Save as Version in History
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {itinerary.items.map((item, idx) => {
                  const session = sessions.find(s => s.id === item.sessionId);
                  const zone    = session ? zones.find(z => z.id === session.zoneId) : null;
                  const crowd   = zone ? crowdStates.find(cs => cs.zoneId === zone.id) : null;
                  const isAffected = suggestion?.affectedItemId === item.id;

                  return (
                    <Card key={item.id} className={isAffected ? '!border-ember !border-2' : ''}>
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-inkSoft text-paper flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-base font-semibold tracking-tight text-ink leading-snug">
                              {session?.title ?? 'Session'}
                            </p>
                            <span className="text-xs text-midGray flex-shrink-0 font-medium">
                              {item.arrivalTime}
                            </span>
                          </div>

                          <p className="text-xs text-midGray mb-2">
                            {zone?.name} &middot; {item.walkMinutes} min walk
                          </p>

                          {crowd && (
                            <StatusBadge status={crowd.status} pct={crowd.utilizationPct} className="mb-2" />
                          )}

                          {isAffected && (
                            <Badge variant="ember" className="mb-2">CRITICAL · needs attention</Badge>
                          )}

                          <p className="text-xs text-midGray italic mb-3">"{item.reason}"</p>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="!text-xs !px-3 !py-1.5"
                              onClick={() => handleNavigateItem(item, session?.zoneId)}
                              aria-label={'Navigate to ' + (session?.title ?? 'session')}
                            >
                              Navigate &rarr;
                            </Button>
                            <Button
                              variant="ghost"
                              className="!text-xs !px-3 !py-1.5 text-midGray hover:text-ink"
                              onClick={() => removeItem(item.id)}
                              aria-label={'Remove ' + (session?.title ?? 'session') + ' from plan'}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/attendee/planner')}
                  className="flex-1 text-xs"
                  aria-label="Rebuild plan from scratch"
                >
                  &larr; Rebuild plan
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSaveCurrentVersion}
                  className="text-xs text-midGray hover:text-ink"
                >
                  Archive Version 💾
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: PLAN HISTORY & ARCHIVES ──────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-3">
          {savedPlanHistory.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
              <span className="text-2xl">📜</span>
              <p className="text-sm font-semibold text-ink">No Saved Plan History Yet</p>
              <p className="text-xs text-midGray max-w-xs">
                When you create and save schedules using the AI Planner, each version is archived here so you can switch plans anytime.
              </p>
              <Button onClick={() => navigate('/attendee/planner')} className="mt-2 text-xs">
                ✦ Create First Plan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-midGray px-1">
                Archived schedule versions. Click <strong>Activate</strong> to restore any past plan.
              </p>

              {savedPlanHistory.map((archivedPlan) => {
                const isActive = archivedPlan.active || (itinerary?.id === archivedPlan.itinerary.id);
                const planDate = new Date(archivedPlan.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Card
                    key={archivedPlan.id}
                    className={`transition-all ${
                      isActive ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-ink">{archivedPlan.name}</p>
                          {isActive && (
                            <span className="text-[10px] px-2 py-0.2 rounded-pill bg-green-100 text-green-800 font-semibold border border-green-200">
                              ● Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-midGray mt-0.5">
                          Saved: {planDate} &middot; {archivedPlan.sessionCount} sessions &middot; {archivedPlan.totalMinutes} min
                        </p>
                      </div>
                      <button
                        onClick={() => deletePlanFromHistory(archivedPlan.id)}
                        className="text-midGray hover:text-red-600 text-xs px-1.5 py-0.5 rounded"
                        title="Delete this archived version"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Preview of sessions included */}
                    <div className="flex flex-wrap gap-1.5 my-2.5">
                      {archivedPlan.itinerary.items.map((item, i) => {
                        const s = sessions.find(sess => sess.id === item.sessionId);
                        return (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-canvas border border-hairline text-ink truncate max-w-[170px]"
                          >
                            {s?.title ?? 'Session'}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-hairline">
                      <span className="text-[11px] text-midGray">
                        {archivedPlan.itinerary.items[0]?.arrivalTime ?? '09:00'} - {archivedPlan.totalMinutes} min track
                      </span>
                      {isActive ? (
                        <button
                          onClick={() => setActiveTab('current')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Viewing Current &rarr;
                        </button>
                      ) : (
                        <Button
                          variant="outline"
                          className="!text-xs !py-1 !px-3"
                          onClick={() => {
                            restorePlanFromHistory(archivedPlan.id);
                            setActiveTab('current');
                          }}
                        >
                          ✦ Activate this Plan
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-midGray text-center pb-2">
        Simulated Event Data &middot; Demo Simulation
      </p>
    </div>
  );
}
