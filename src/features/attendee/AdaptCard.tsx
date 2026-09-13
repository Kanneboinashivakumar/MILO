import { useState } from 'react';
import { useEventStore } from '../../store/useEventStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { StatBlock } from '../../components/StatBlock';
import { IconWarning, IconCheck } from '../../components/Icons';
import { applyAdaptation } from '../../engine/adaptationEngine';

export function AdaptCard() {
  const suggestion    = useEventStore(s => s.adaptationSuggestion);
  const itinerary     = useEventStore(s => s.itinerary);
  const sessions      = useEventStore(s => s.sessions);
  const zones         = useEventStore(s => s.zones);
  const attendee      = useEventStore(s => s.attendee);
  const crowdStates   = useEventStore(s => s.crowdStates);
  const setItinerary  = useEventStore(s => s.setItinerary);
  const setSuggestion = useEventStore(s => s.setAdaptationSuggestion);

  const [selectedChoice, setSelectedChoice] = useState<'suggested' | 'current'>('suggested');

  if (!suggestion || !itinerary) return null;

  const originalSession  = sessions.find(s => s.id === suggestion.originalSessionId);
  const suggestedSession = sessions.find(s => s.id === suggestion.suggestedSessionId);
  const originalZone     = originalSession ? zones.find(z => z.id === originalSession.zoneId) : null;
  const suggestedZone    = suggestedSession ? zones.find(z => z.id === suggestedSession.zoneId) : null;
  const originalCrowd    = originalZone ? crowdStates.find(cs => cs.zoneId === originalZone.id) : null;
  const suggestedCrowd   = suggestedZone ? crowdStates.find(cs => cs.zoneId === suggestedZone.id) : null;

  function handleProceed() {
    if (!itinerary) return;
    if (selectedChoice === 'suggested') {
      const newItinerary = applyAdaptation(itinerary, suggestion!, sessions, zones, attendee);
      setItinerary(newItinerary);
      setSuggestion(null);
    } else {
      // Keep current: dismiss the recommendation
      setSuggestion(null);
    }
  }

  return (
    <Card className="border-ember border-2 shadow-card" role="alert" aria-live="polite">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <IconWarning className="w-5 h-5 text-ember flex-shrink-0" />
        <h2 className="text-base font-semibold text-ink tracking-tight">Your plan needs attention</h2>
      </div>

      {/* Trigger reason */}
      <p className="text-sm text-ink mb-3 font-medium">{suggestion.triggerReason}</p>

      {/* Selection prompt */}
      <p className="text-xs text-midGray mb-2.5">
        Select one option below to update your itinerary:
      </p>

      {/* Before / After comparison with Interactive Selection */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* CURRENT */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={selectedChoice === 'current'}
          aria-label={`Current option: ${originalSession?.title ?? 'Session'}. ${selectedChoice === 'current' ? 'Selected' : 'Unselected'}. Press Enter or Space to select.`}
          onClick={() => setSelectedChoice('current')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedChoice('current');
            }
          }}
          className={`cursor-pointer rounded-nested p-3 transition-all flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-ink ${
            selectedChoice === 'current'
              ? 'bg-paper border-2 border-ink shadow-sm'
              : 'bg-canvas border border-hairline opacity-70 hover:opacity-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-midGray">Current</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                selectedChoice === 'current' ? 'bg-ink text-paper' : 'text-midGray'
              }`}>
                {selectedChoice === 'current' ? '● Selected' : '○ Select'}
              </span>
            </div>
            <p className="text-sm font-semibold text-ink leading-snug mb-1">{originalSession?.title ?? ' · '}</p>
            <p className="text-xs text-midGray mb-2">{originalZone?.name}</p>
          </div>
          <div>
            {originalCrowd && <StatusBadge status={originalCrowd.status} pct={originalCrowd.utilizationPct} className="mb-2" />}
            <StatBlock label="Walk" value={suggestion.beforeWalkMinutes + 'm'} size="sm" />
          </div>
        </div>

        {/* SUGGESTED */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={selectedChoice === 'suggested'}
          aria-label={`Suggested option: ${suggestedSession?.title ?? 'Session'}. ${selectedChoice === 'suggested' ? 'Selected' : 'Unselected'}. Press Enter or Space to select.`}
          onClick={() => setSelectedChoice('suggested')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedChoice('suggested');
            }
          }}
          className={`cursor-pointer rounded-nested p-3 transition-all flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
            selectedChoice === 'suggested'
              ? 'bg-emerald-50/40 border-2 border-emerald-600 shadow-sm'
              : 'bg-canvas border border-hairline opacity-70 hover:opacity-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Suggested (AI)</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                selectedChoice === 'suggested' ? 'bg-emerald-600 text-paper' : 'text-midGray'
              }`}>
                {selectedChoice === 'suggested' ? '● Selected' : '○ Select'}
              </span>
            </div>
            <p className="text-sm font-semibold text-ink leading-snug mb-1">{suggestedSession?.title ?? ' · '}</p>
            <p className="text-xs text-midGray mb-2">{suggestedZone?.name}</p>
          </div>
          <div>
            {suggestedCrowd && <StatusBadge status={suggestedCrowd.status} pct={suggestedCrowd.utilizationPct} className="mb-2" />}
            <StatBlock label="Walk" value={suggestion.afterWalkMinutes + 'm'} size="sm" />
          </div>
        </div>
      </div>

      {/* Benefits */}
      {suggestion.benefits.length > 0 && selectedChoice === 'suggested' && (
        <ul className="mb-4 flex flex-col gap-1.5 bg-emerald-50/60 p-3 rounded-nested border border-emerald-200" aria-label="Why this alternative was selected">
          {suggestion.benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <IconCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <Button
        fullWidth
        onClick={handleProceed}
        aria-label={selectedChoice === 'suggested' ? 'Adapt plan to suggested session' : 'Keep current session and dismiss alert'}
      >
        {selectedChoice === 'suggested'
          ? '✓ Switch to Suggested Session & Adapt Plan'
          : 'Keep Current Session (Dismiss Alert)'}
      </Button>
    </Card>
  );
}
