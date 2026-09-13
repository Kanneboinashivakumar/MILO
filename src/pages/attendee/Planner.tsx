import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Badge } from '../../components/Badge';
import { useEventStore } from '../../store/useEventStore';
import { parseAttendeeInput, generateItinerary } from '../../engine/recommendationEngine';
import type { Itinerary } from '../../types';

export function PlannerPage() {
  const navigate   = useNavigate();
  const zones      = useEventStore(s => s.zones);
  const sessions   = useEventStore(s => s.sessions);
  const attendee   = useEventStore(s => s.attendee);
  const setAttendee = useEventStore(s => s.setAttendee);
  const setItinerary = useEventStore(s => s.setItinerary);
  const crowdStates = useEventStore(s => s.crowdStates);

  const [inputText, setInputText] = useState('');
  const [preview, setPreview]     = useState<Itinerary | null>(null);
  const [loading, setLoading]     = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  function handleBuild() {
    if (!inputText.trim()) return;
    setLoading(true);

    // Deterministic keyword fallback (P0 requirement — no LLM needed)
    const { interests, availableMinutes } = parseAttendeeInput(inputText);
    const updatedAttendee = { ...attendee, interests, availableMinutes };
    setAttendee(updatedAttendee);

    const itin = generateItinerary(updatedAttendee, sessions, zones, availableMinutes);
    setPreview(itin);
    setSelectedItemIds(itin.items.map(i => i.id));
    setLoading(false);
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }

  function handleSave() {
    if (!preview) return;
    const filteredItems = preview.items.filter(i => selectedItemIds.includes(i.id));
    if (filteredItems.length === 0) return;
    const filteredItinerary: Itinerary = {
      ...preview,
      items: filteredItems,
      totalMinutes: filteredItems.length * 60,
    };
    setItinerary(filteredItinerary);
    navigate('/attendee/my-plan');
  }

  return (
    <div className="p-4 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">AI Event Planner</h1>
        <p className="text-sm text-midGray mt-1">
          Describe your interests and available time — MILO builds your personalized schedule.
        </p>
      </div>

      <Card>
        <label htmlFor="planner-input" className="block text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">
          Tell MILO what you want
        </label>
        <textarea
          id="planner-input"
          rows={3}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="e.g. I have 2 hours and want to attend hackathon workshops and meet mentors."
          className="w-full bg-canvas rounded-nested border border-hairline px-4 py-3 text-sm text-ink placeholder-midGray resize-none focus:outline-none focus-visible:border-inkSoft focus-visible:ring-1 focus-visible:ring-inkSoft"
          aria-label="Describe your interests and available time"
        />

        {/* Quick Prompt Templates */}
        <div className="flex gap-1.5 flex-wrap mt-2.5">
          {[
            { label: '💻 2h Hackathon Sprint', text: 'I have 2 hours and want to focus on hackathon AI workshops and mentors.' },
            { label: '🍕 Food & Networking', text: 'I have 90 minutes and want food, snacks, and founder networking.' },
            { label: '🛠️ AI Agent Workshops', text: 'I have 2 hours and want hands-on AI agent and developer workshops.' },
            { label: '🏆 Demos & Judging', text: 'I have 90 minutes and want to see startup demos, judging, and pitches.' },
          ].map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => setInputText(template.text)}
              className="text-[11px] px-2.5 py-1 rounded-pill bg-canvas hover:bg-hairline text-ink border border-hairline font-medium transition-colors"
            >
              {template.label}
            </button>
          ))}
        </div>

        <Button
          className="mt-3 w-full"
          onClick={handleBuild}
          disabled={loading || !inputText.trim()}
          aria-label="Build my personalized plan"
        >
          {loading ? 'Building…' : '✦ Build my plan'}
        </Button>
      </Card>

      {/* Result itinerary */}
      {preview && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-midGray">
              Your Personalized Plan · {preview.items.length} sessions
            </p>
            <Badge variant="soft">{attendee.availableMinutes} min budget</Badge>
          </div>

          {preview.items.length === 0 ? (
            <Card>
              <p className="text-sm text-midGray text-center py-4">
                No sessions matched your criteria. Try different interests or a longer time window.
              </p>
            </Card>
          ) : (
            <>
              {/* Clarification banner: Sequential schedule vs Individual selection */}
              <div className="bg-canvas border border-hairline rounded-nested p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-ink">
                    <span>🗓️</span>
                    <span>
                      {selectedItemIds.length === preview.items.length
                        ? `Both ${preview.items.length} sessions selected (Sequential Schedule)`
                        : `${selectedItemIds.length} of ${preview.items.length} sessions selected`}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds(preview.items.map(i => i.id))}
                      className="text-[10px] px-2 py-0.5 rounded bg-paper border border-hairline font-semibold text-ink hover:bg-surfaceAlt transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds([])}
                      className="text-[10px] px-2 py-0.5 rounded bg-paper border border-hairline font-semibold text-midGray hover:text-ink transition-colors"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-midGray leading-relaxed">
                  💡 <strong>Both sessions are selected by default</strong> to form your step-by-step event schedule. If you only want to attend one specific session, simply click on the other session to uncheck it!
                </p>
              </div>

              {preview.items.map((item, idx) => {
                const session = sessions.find(s => s.id === item.sessionId);
                const zone    = session ? zones.find(z => z.id === session.zoneId) : null;
                const crowd   = zone ? crowdStates.find(cs => cs.zoneId === zone.id) : null;
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Session ${idx + 1}: ${session?.title ?? 'Session'}. ${isSelected ? 'Selected' : 'Unselected'}. Tap or press Enter to toggle.`}
                    onClick={() => toggleItemSelection(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItemSelection(item.id);
                      }
                    }}
                    className={`cursor-pointer transition-all rounded-nested border focus:outline-none focus:ring-2 focus:ring-accent ${
                      isSelected
                        ? 'bg-paper border-ink shadow-sm'
                        : 'bg-canvas/50 border-hairline opacity-60'
                    }`}
                  >
                    <div className="p-3.5 flex gap-3 items-start">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isSelected ? 'bg-ink text-paper' : 'bg-midGray/30 text-midGray'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx < preview.items.length - 1 && (
                          <div className="w-px h-full min-h-[24px] bg-hairline mt-1" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-base font-semibold tracking-tight text-ink leading-snug">
                            {session?.title ?? '—'}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>
                            {isSelected ? '✓ Included' : '+ Tap to Select'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-midGray mb-2">
                          <span>{item.arrivalTime}</span>
                          <span>&middot;</span>
                          <span>{zone?.name}</span>
                          <span>&middot;</span>
                          <span>{item.walkMinutes}m walk</span>
                        </div>
                        {crowd && <StatusBadge status={crowd.status} pct={crowd.utilizationPct} className="mb-2" />}
                        {/* AI Explainability — required, never omit */}
                        <p className="text-xs text-midGray italic">"{item.reason}"</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                onClick={handleSave}
                disabled={selectedItemIds.length === 0}
                fullWidth
                aria-label="Save plan and view my itinerary"
              >
                {selectedItemIds.length === 0
                  ? 'Select at least 1 session to proceed'
                  : `Save ${selectedItemIds.length} ${selectedItemIds.length === 1 ? 'Session' : 'Sessions'} to My Plan →`}
              </Button>
            </>
          )}
        </div>
      )}

      <p className="text-[10px] text-midGray text-center">⬡ Simulated Event Data — Demo Simulation</p>
    </div>
  );
}