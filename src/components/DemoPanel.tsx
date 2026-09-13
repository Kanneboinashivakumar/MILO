import { useState, useEffect, useRef } from 'react';
import { useEventStore } from '../store/useEventStore';
import { useNavigate, useLocation } from 'react-router-dom';

const HACKATHON_PRESETS = [
  { label: '🍕 Midnight Pizza Surge', prompt: 'Midnight pizza drop at Food Court crowd surge 98%' },
  { label: '🏆 Judging Round 1', prompt: 'Science-Fair Judging Round 1 starts at Startup Arena crowd surge 94%' },
  { label: '🛠️ Add AI Agent Workshop', prompt: 'Schedule Building Autonomous AI Agents workshop at 14:00 in Workshop Hall' },
  { label: '⏳ Extend Deadline +1h', prompt: 'Project submission deadline extended by 1 hour' },
  { label: '🚨 Hardware Lab Alert', prompt: 'Hardware Lab power outage and short-circuit in Workshop Hall block zone' },
  { label: '👥 Mentor Office Hours', prompt: 'Add AI Mentor Speed Dating at 15:00 in Networking Lounge' },
];

export function DemoPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'scenarios'>('prompt');
  const [promptText, setPromptText] = useState('');
  const [recentResult, setRecentResult] = useState<{ summary: string; time: number; type: string } | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const pulseIntervalRef = useRef<number | null>(null);

  const resetDemo                 = useEventStore(s => s.resetDemo);
  const triggerMainStageOverload  = useEventStore(s => s.triggerMainStageOverload);
  const triggerEmergency          = useEventStore(s => s.triggerEmergency);
  const triggerCancelSession      = useEventStore(s => s.triggerCancelSession);
  const triggerCongestEastEntrance = useEventStore(s => s.triggerCongestEastEntrance);
  const executePrompt             = useEventStore(s => s.executePrompt);
  const switchEventMode           = useEventStore(s => s.switchEventMode);
  const eventName                 = useEventStore(s => s.eventState.name);
  const livePulseEnabled          = useEventStore(s => s.livePulseEnabled);
  const toggleLivePulse           = useEventStore(s => s.toggleLivePulse);
  const tickSimulation            = useEventStore(s => s.tickSimulation);

  const isAttendee = location.pathname.startsWith('/attendee');
  const isHackathonMode = eventName.toLowerCase().includes('hackathon');

  // Background Live Pulse Ticker (when enabled)
  useEffect(() => {
    if (livePulseEnabled) {
      pulseIntervalRef.current = window.setInterval(() => {
        tickSimulation();
      }, 3500);
    } else if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    };
  }, [livePulseEnabled, tickSimulation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function handleRunPrompt(textToRun?: string) {
    const text = textToRun ?? promptText;
    if (!text.trim()) return;
    const res = executePrompt(text);
    setRecentResult({ summary: res.summary, time: res.executionTimeMs, type: res.type });
    if (!textToRun) setPromptText('');

    // If it was a crowd surge or navigation incident, point attendee to relevant view
    if (res.type === 'crowd_surge' && isAttendee) {
      navigate('/attendee/map');
    } else if (res.type === 'incident' && isAttendee) {
      navigate('/attendee/protect');
    } else if (res.type === 'session_added' && isAttendee) {
      navigate('/attendee/planner');
    }
  }

  return (
    <aside
      aria-label="Demo simulation controls"
      className="fixed bottom-3 left-3 z-50 flex flex-col items-start gap-2"
    >
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Demo scenario triggers"
          className="bg-paper border border-hairline shadow-card rounded-card p-4 w-84 sm:w-96 max-h-[85vh] overflow-y-auto flex flex-col gap-3 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⚡</span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                MILO Live Copilot & Control
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-midGray hover:text-ink text-sm px-2 py-0.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              aria-label="Close demo controller"
            >
              ✕
            </button>
          </div>

          {/* Tab Bar */}
          <div className="flex rounded-nested bg-canvas p-0.5 border border-hairline text-xs">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`flex-1 py-1.5 rounded-nested font-medium transition-all ${
                activeTab === 'prompt' ? 'bg-paper text-ink shadow-sm font-semibold' : 'text-midGray hover:text-ink'
              }`}
            >
              ✨ AI Live Prompt
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`flex-1 py-1.5 rounded-nested font-medium transition-all ${
                activeTab === 'scenarios' ? 'bg-paper text-ink shadow-sm font-semibold' : 'text-midGray hover:text-ink'
              }`}
            >
              🎯 Core Scenarios
            </button>
          </div>

          {/* TAB 1: AI LIVE PROMPT & HACKATHON */}
          {activeTab === 'prompt' && (
            <div className="flex flex-col gap-3">
              {/* Event Mode Switcher Card */}
              <div className="bg-canvas border border-hairline rounded-nested p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-midGray tracking-wider">Current Event Mode</p>
                  <p className="text-xs font-semibold text-ink truncate max-w-[170px]">{eventName}</p>
                </div>
                <button
                  onClick={() => switchEventMode(isHackathonMode ? 'summit' : 'hackathon')}
                  className="text-[11px] px-2.5 py-1 rounded-pill bg-inkSoft text-paper hover:bg-ink font-medium shadow-sm transition-colors"
                >
                  {isHackathonMode ? '🔄 AI Summit' : '💻 24h Hackathon'}
                </button>
              </div>

              {/* Natural Language Prompt Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="demo-prompt-input" className="text-[11px] font-semibold text-ink">
                  Enter Any Live Prompt / Event Instruction
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="demo-prompt-input"
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunPrompt();
                    }}
                    placeholder='e.g. "Midnight pizza surge at Food Court"'
                    className="flex-1 text-xs bg-canvas rounded-nested border border-hairline px-3 py-2 text-ink placeholder-midGray focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                  />
                  <button
                    onClick={() => handleRunPrompt()}
                    disabled={!promptText.trim()}
                    className="px-3 py-2 bg-inkSoft text-paper rounded-nested text-xs font-semibold hover:bg-ink disabled:opacity-40 transition-opacity"
                  >
                    ⚡ Apply
                  </button>
                </div>
              </div>

              {/* Quick Hackathon Presets */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-midGray">
                  1-Click Hackathon Scenarios
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {HACKATHON_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleRunPrompt(preset.prompt)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-nested bg-canvas hover:bg-hairline text-ink font-medium transition-colors border border-hairline/60 truncate"
                      title={preset.prompt}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-Time Pulse Heartbeat Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-hairline/80">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${livePulseEnabled ? 'bg-green-500 animate-pulse' : 'bg-midGray'}`} />
                  <span className="text-[11px] font-medium text-ink">Live Real-Time Pulse</span>
                </div>
                <button
                  onClick={toggleLivePulse}
                  className={`text-[11px] px-2.5 py-0.5 rounded-pill font-medium border transition-colors ${
                    livePulseEnabled
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-canvas text-midGray border-hairline hover:text-ink'
                  }`}
                >
                  {livePulseEnabled ? 'Active (Auto-Tick)' : 'Paused'}
                </button>
              </div>

              {/* Recent Result Confirmation Badge */}
              {recentResult && (
                <div className="bg-green-50 border border-green-200 text-green-900 rounded-nested p-2 text-xs flex items-start justify-between gap-2 animate-fadeIn">
                  <div>
                    <p className="font-semibold">✓ {recentResult.summary}</p>
                    <p className="text-[10px] text-green-700">Executed locally in {recentResult.time}ms (deterministic 0-latency)</p>
                  </div>
                  <button onClick={() => setRecentResult(null)} className="text-green-600 hover:text-green-900 text-xs">✕</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CORE SCENARIOS */}
          {activeTab === 'scenarios' && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-midGray mb-1">
                Standard baseline triggers for crowd and safety evaluation:
              </p>

              <button
                onClick={() => {
                  triggerMainStageOverload();
                  if (isAttendee) navigate('/attendee/my-plan');
                }}
                className="text-left text-xs px-3 py-2 rounded-nested bg-canvas hover:bg-hairline text-ink font-medium transition-colors border border-hairline"
              >
                🚨 <strong>Main Stage Overload</strong> (95% crowd surge)
              </button>

              <button
                onClick={() => {
                  triggerEmergency();
                  if (isAttendee) navigate('/attendee/protect');
                }}
                className="text-left text-xs px-3 py-2 rounded-nested bg-canvas hover:bg-hairline text-ink font-medium transition-colors border border-hairline"
              >
                ⚠️ <strong>Trigger Emergency</strong> (Corridor blockage + SOS)
              </button>

              <button
                onClick={() => {
                  triggerCancelSession();
                  if (isAttendee) navigate('/attendee/my-plan');
                }}
                className="text-left text-xs px-3 py-2 rounded-nested bg-canvas hover:bg-hairline text-ink font-medium transition-colors border border-hairline"
              >
                🔄 <strong>Cancel Keynote</strong> (Adaptive swap)
              </button>

              <button
                onClick={() => {
                  triggerCongestEastEntrance();
                  if (isAttendee) navigate('/attendee/map');
                }}
                className="text-left text-xs px-3 py-2 rounded-nested bg-canvas hover:bg-hairline text-ink font-medium transition-colors border border-hairline"
              >
                🚶 <strong>Congest Entrance</strong> (92% chokepoint)
              </button>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 border-t border-hairline flex items-center justify-between gap-2">
            <button
              onClick={() => {
                resetDemo();
                setRecentResult({ summary: 'Demo reset to initial baseline', time: 1, type: 'reset' });
              }}
              className="flex-1 text-xs py-1.5 px-2.5 rounded-pill border border-hairline bg-paper text-ink hover:bg-canvas font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink text-center"
            >
              🔄 Reset Demo
            </button>
            <button
              onClick={() => navigate(isAttendee ? '/organizer' : '/attendee')}
              className="flex-1 text-xs py-1.5 px-2.5 rounded-pill bg-inkSoft text-paper hover:bg-ink font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-paper text-center"
            >
              {isAttendee ? 'Organizer →' : '← Attendee'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-inkSoft text-paper border border-hairline px-3.5 py-1.5 rounded-pill text-xs font-semibold shadow-card hover:bg-ink flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        aria-expanded={isOpen}
      >
        <span>⚡</span>
        <span>AI Copilot & Controls</span>
      </button>
    </aside>
  );
}
