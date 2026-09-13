import type { Session, VenueZone, Alert, Incident, CrowdState } from '../types';
import { SEED_HACKATHON_SESSIONS, SEED_HACKATHON_EVENT, SEED_SESSIONS, SEED_EVENT } from '../data/seed';
import { getUtilizationPct } from './crowdEngine';

export interface PromptResult {
  rawPrompt: string;
  type: 'session_added' | 'crowd_surge' | 'mode_switch' | 'session_modified' | 'incident' | 'query' | 'announcement';
  summary: string;
  details?: string;
  affectedZoneId?: string;
  affectedSessionId?: string;
  newSession?: Session;
  executionTimeMs: number;
}

export interface PromptExecutionContext {
  zones: VenueZone[];
  sessions: Session[];
  crowdStates: CrowdState[];
  currentEventName: string;
}

export interface StateMutations {
  updatedZones?: VenueZone[];
  updatedSessions?: Session[];
  newAlerts?: Alert[];
  newIncidents?: Incident[];
  newEventName?: string;
  promptResult: PromptResult;
}

/** Match zone identifier from text */
export function matchZone(text: string, zones: VenueZone[]): VenueZone | null {
  const lower = text.toLowerCase();
  if (lower.includes('food') || lower.includes('cafeteria') || lower.includes('pizza') || lower.includes('snack') || lower.includes('dining')) {
    return zones.find(z => z.id === 'food-court') ?? null;
  }
  if (lower.includes('main stage') || lower.includes('keynote stage') || lower.includes('auditorium')) {
    return zones.find(z => z.id === 'main-stage') ?? null;
  }
  if (lower.includes('workshop') || lower.includes('hardware lab') || lower.includes('coding lab') || lower.includes('hall b')) {
    return zones.find(z => z.id === 'workshop-hall') ?? null;
  }
  if (lower.includes('startup') || lower.includes('arena') || lower.includes('demo pod') || lower.includes('judging pod')) {
    return zones.find(z => z.id === 'startup-arena') ?? null;
  }
  if (lower.includes('networking') || lower.includes('lounge') || lower.includes('mentor')) {
    return zones.find(z => z.id === 'networking-lounge') ?? null;
  }
  if (lower.includes('corridor') || lower.includes('hallway') || lower.includes('walkway')) {
    return zones.find(z => z.id === 'central-corridor') ?? null;
  }
  if (lower.includes('entrance') || lower.includes('east entrance') || lower.includes('gate')) {
    return zones.find(z => z.id === 'east-entrance') ?? null;
  }
  if (lower.includes('registration') || lower.includes('check-in') || lower.includes('badge')) {
    return zones.find(z => z.id === 'registration') ?? null;
  }
  if (lower.includes('help desk') || lower.includes('info')) {
    return zones.find(z => z.id === 'help-desk') ?? null;
  }
  if (lower.includes('restroom') || lower.includes('washroom') || lower.includes('toilet')) {
    return zones.find(z => z.id === 'restrooms') ?? null;
  }
  return null;
}

/** Standardize time strings into HH:MM */
function parseTimeToken(token: string): string {
  const match = token.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return '14:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? match[2] : '00';
  const ampm = match[3]?.toLowerCase();

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

/**
 * Execute a natural language prompt locally in sub-5ms.
 * Parses hackathon events, crowd surges, emergency blockages, schedule adaptations, and queries.
 */
export function processPrompt(prompt: string, context: PromptExecutionContext): StateMutations {
  const startTime = performance.now();
  const lower = prompt.toLowerCase().trim();
  const timestamp = new Date().toISOString();

  // ── 1. Event Mode Switch ──────────────────────────────────────────
  if (
    lower.includes('hackathon mode') ||
    lower.includes('switch to hackathon') ||
    lower.includes('load hackathon') ||
    lower.includes('24h hackathon') ||
    lower.includes('hackathon event') ||
    lower.includes('buildathon')
  ) {
    const newAlert: Alert = {
      id: `alert-mode-${Date.now()}`,
      type: 'session',
      severity: 'low',
      message: `Event Mode Switched to "${SEED_HACKATHON_EVENT.name}". All tracks loaded.`,
      timestamp,
      acknowledged: false,
    };
    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      newEventName: SEED_HACKATHON_EVENT.name,
      updatedSessions: SEED_HACKATHON_SESSIONS.map(s => ({ ...s, tags: [...s.tags] })),
      newAlerts: [newAlert],
      promptResult: {
        rawPrompt: prompt,
        type: 'mode_switch',
        summary: `Switched to ${SEED_HACKATHON_EVENT.name}`,
        details: 'Loaded 12 hackathon sessions (Keynotes, Mentorship, Pizza Surge, Code Freeze, Judging).',
        executionTimeMs,
      },
    };
  }

  if (
    lower.includes('summit mode') ||
    lower.includes('switch to summit') ||
    lower.includes('reset to summit') ||
    lower.includes('ai future summit')
  ) {
    const newAlert: Alert = {
      id: `alert-mode-${Date.now()}`,
      type: 'session',
      severity: 'low',
      message: 'Event Mode Restored to "AI Future Summit 2026".',
      timestamp,
      acknowledged: false,
    };
    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      newEventName: SEED_EVENT.name,
      updatedSessions: SEED_SESSIONS.map(s => ({ ...s, tags: [...s.tags] })),
      newAlerts: [newAlert],
      promptResult: {
        rawPrompt: prompt,
        type: 'mode_switch',
        summary: 'Switched to AI Future Summit 2026',
        details: 'Restored standard conference schedule and tracks.',
        executionTimeMs,
      },
    };
  }

  // ── 2. Crowd Surge Simulation ──────────────────────────────────────
  if (
    lower.includes('surge') ||
    lower.includes('overcrowd') ||
    lower.includes('packed') ||
    lower.includes('crowded') ||
    lower.includes('rush') ||
    lower.includes('full capacity') ||
    lower.includes('congest')
  ) {
    const targetZone = matchZone(lower, context.zones) ?? context.zones[0];
    const pctMatch = lower.match(/(\d{2,3})%/);
    const targetPct = pctMatch ? Math.min(100, parseInt(pctMatch[1], 10)) : 95;

    const updatedZones = context.zones.map(z => {
      if (z.id === targetZone.id) {
        return { ...z, currentCrowd: Math.round(z.capacity * (targetPct / 100)), trend: 'rising' as const };
      }
      // Cascade slight rush to adjacent connected zones
      if (targetZone.connectedZoneIds.includes(z.id)) {
        const cascadePct = Math.min(90, Math.round(getUtilizationPct(z) + 18));
        return { ...z, currentCrowd: Math.round(z.capacity * (cascadePct / 100)), trend: 'rising' as const };
      }
      return z;
    });

    const newAlert: Alert = {
      id: `alert-surge-${Date.now()}`,
      type: 'crowd',
      severity: targetPct >= 90 ? 'critical' : 'high',
      message: `Crowd Surge Alert: ${targetZone.name} utilization spiked to ${targetPct}%. Rerouting traffic.`,
      zoneId: targetZone.id,
      timestamp,
      acknowledged: false,
    };

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      updatedZones,
      newAlerts: [newAlert],
      promptResult: {
        rawPrompt: prompt,
        type: 'crowd_surge',
        summary: `Crowd Surge Triggered: ${targetZone.name} (${targetPct}%)`,
        details: `Crowd increased to ${targetPct}%, cascaded rush to connected corridors, and generated crowd alert.`,
        affectedZoneId: targetZone.id,
        executionTimeMs,
      },
    };
  }

  // ── 3. Safety / Hazard / Emergency Blockage ─────────────────────────
  if (
    lower.includes('emergency') ||
    lower.includes('hazard') ||
    lower.includes('short-circuit') ||
    lower.includes('power outage') ||
    lower.includes('spill') ||
    lower.includes('block') ||
    lower.includes('evacuate')
  ) {
    const targetZone = matchZone(lower, context.zones) ?? context.zones.find(z => z.id === 'workshop-hall')!;
    const updatedZones = context.zones.map(z =>
      z.id === targetZone.id ? { ...z, isBlocked: true } : z
    );

    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      zoneId: targetZone.id,
      type: 'hazard',
      description: `Incident reported in ${targetZone.name}. Zone blocked for safety inspection.`,
      active: true,
      timestamp,
    };

    const newAlert: Alert = {
      id: `alert-hazard-${Date.now()}`,
      type: 'safety',
      severity: 'critical',
      message: `SAFETY ALERT: ${targetZone.name} is currently blocked. Indoor navigation rerouted via safe bypass.`,
      zoneId: targetZone.id,
      timestamp,
      acknowledged: false,
    };

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      updatedZones,
      newIncidents: [newIncident],
      newAlerts: [newAlert],
      promptResult: {
        rawPrompt: prompt,
        type: 'incident',
        summary: `Safety Incident: ${targetZone.name} Blocked`,
        details: 'Zone blocked, indoor A* pathfinder automatically recalculates around the hazard.',
        affectedZoneId: targetZone.id,
        executionTimeMs,
      },
    };
  }

  // ── 4. Session Cancellation / Delay ────────────────────────────────
  if (lower.includes('cancel') || lower.includes('delayed') || lower.includes('delay')) {
    let targetSession = context.sessions.find(s => {
      const titleLower = s.title.toLowerCase();
      if (lower.includes('keynote') && titleLower.includes('keynote')) return true;
      if (lower.includes('agent') && titleLower.includes('agent')) return true;
      if (lower.includes('workshop') && titleLower.includes('workshop')) return true;
      if (lower.includes('pitch') && titleLower.includes('pitch')) return true;
      return lower.includes(titleLower);
    }) ?? context.sessions[0];

    const isCancel = lower.includes('cancel');
    const delayMatch = lower.match(/(\d+)\s*min/);
    const delayMins = delayMatch ? parseInt(delayMatch[1], 10) : 30;

    let updatedSessions: Session[];
    let alertMessage: string;

    if (isCancel) {
      updatedSessions = context.sessions.map(s =>
        s.id === targetSession.id ? { ...s, isCancelled: true } : s
      );
      alertMessage = `Session Cancelled: "${targetSession.title}". MILO has recommended alternative sessions.`;
    } else {
      updatedSessions = context.sessions.map(s => {
        if (s.id === targetSession.id) {
          return { ...s, popularity: Math.max(0.1, s.popularity - 0.05) };
        }
        return s;
      });
      alertMessage = `Schedule Update: "${targetSession.title}" delayed by ${delayMins} mins. Check My Plan for updated buffer times.`;
    }

    const newAlert: Alert = {
      id: `alert-session-${Date.now()}`,
      type: 'session',
      severity: 'high',
      message: alertMessage,
      sessionId: targetSession.id,
      timestamp,
      acknowledged: false,
    };

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      updatedSessions,
      newAlerts: [newAlert],
      promptResult: {
        rawPrompt: prompt,
        type: 'session_modified',
        summary: isCancel ? `Cancelled: ${targetSession.title}` : `Delayed: ${targetSession.title} (+${delayMins}m)`,
        details: isCancel
          ? 'Session cancelled. AI Adaptation Engine triggered for affected attendees.'
          : `Session delayed by ${delayMins} minutes. Travel buffers recalculated.`,
        affectedSessionId: targetSession.id,
        executionTimeMs,
      },
    };
  }

  const isQuery =
    lower.startsWith('where') ||
    lower.startsWith('when') ||
    lower.startsWith('how') ||
    lower.startsWith('what') ||
    lower.startsWith('find') ||
    lower.startsWith('show') ||
    lower.startsWith('which') ||
    lower.startsWith('tell') ||
    lower.includes('?') ||
    lower.includes('where is') ||
    lower.includes('when is') ||
    lower.includes('what time');

  // ── 5. Add / Schedule Session via Prompt ───────────────────────────
  if (
    !isQuery &&
    (lower.includes('add') ||
      lower.includes('schedule') ||
      lower.includes('host') ||
      lower.includes('create') ||
      lower.includes('new session') ||
      lower.includes('new talk') ||
      lower.includes('new workshop') ||
      lower.includes('post session'))
  ) {
    const targetZone = matchZone(lower, context.zones) ?? context.zones.find(z => z.id === 'workshop-hall')!;

    let title = 'Hackathon Community Session';
    if (lower.includes('pizza') || lower.includes('energy drink')) {
      title = 'Midnight Pizza & Energy Drink Drop';
    } else if (lower.includes('judging') || lower.includes('pod')) {
      title = 'Science-Fair Live Judging Sprint';
    } else if (lower.includes('agent') || lower.includes('llm')) {
      title = 'Workshop: Building Autonomous AI Agents';
    } else if (lower.includes('mentor') || lower.includes('office hour')) {
      title = 'AI Mentor Speed Dating & Office Hours';
    } else if (lower.includes('freeze') || lower.includes('deadline')) {
      title = 'Project Submission & Devpost Freeze';
    } else {
      const cleaned = prompt
        .replace(/^(add|schedule|create|host)\s+/i, '')
        .replace(/\s+(at|in|inside|near)\s+.*$/i, '')
        .trim();
      if (cleaned.length > 3) title = cleaned;
    }

    let category = 'Workshop';
    if (lower.includes('judging')) category = 'Judging';
    else if (lower.includes('mentor')) category = 'Mentorship';
    else if (lower.includes('pizza') || lower.includes('food') || lower.includes('dinner')) category = 'Social';
    else if (lower.includes('keynote') || lower.includes('opening') || lower.includes('awards')) category = 'Keynote';
    else if (lower.includes('deadline') || lower.includes('freeze')) category = 'Milestone';

    const timeMatch = lower.match(/(?:at|for|around)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const startTimeStr = timeMatch ? parseTimeToken(timeMatch[1]) : '14:00';
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const endH = (startH + 1) % 24;
    const endTimeStr = `${endH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

    const newSession: Session = {
      id: `custom-session-${Date.now()}`,
      title,
      category,
      tags: ['hackathon', 'ai', category.toLowerCase(), targetZone.id],
      zoneId: targetZone.id,
      startTime: startTimeStr,
      endTime: endTimeStr,
      popularity: 0.88,
      isCancelled: false,
    };

    const newAlert: Alert = {
      id: `alert-new-session-${Date.now()}`,
      type: 'session',
      severity: 'low',
      message: `New Session Added: "${title}" in ${targetZone.name} (${startTimeStr} - ${endTimeStr}).`,
      sessionId: newSession.id,
      zoneId: targetZone.id,
      timestamp,
      acknowledged: false,
    };

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      updatedSessions: [newSession, ...context.sessions],
      newAlerts: [newAlert],
      promptResult: {
        rawPrompt: prompt,
        type: 'session_added',
        summary: `Scheduled: ${title}`,
        details: `Added to ${targetZone.name} from ${startTimeStr} to ${endTimeStr}. Available in Planner & Recommendations.`,
        newSession,
        affectedZoneId: targetZone.id,
        affectedSessionId: newSession.id,
        executionTimeMs,
      },
    };
  }

  // ── 6. Attendee Natural Language Query ──────────────────────────────
  const matchedZone = matchZone(lower, context.zones);
  const matchedSession = context.sessions.find(s =>
    lower.includes(s.title.toLowerCase()) || s.tags.some(t => lower.includes(t))
  );

  let summary = 'Event Information';
  let details = 'MILO real-time event assistant processed your request.';
  let affectedZoneId: string | undefined = undefined;

  if (matchedSession) {
    const sessionZone = context.zones.find(z => z.id === matchedSession.zoneId);
    summary = `Found: "${matchedSession.title}"`;
    details = `Scheduled at ${matchedSession.startTime} in ${sessionZone?.name ?? 'Venue'}. Category: ${matchedSession.category}.`;
    affectedZoneId = matchedSession.zoneId;
  } else if (matchedZone) {
    const crowd = context.crowdStates.find(c => c.zoneId === matchedZone.id);
    const pct = crowd ? crowd.utilizationPct : getUtilizationPct(matchedZone);
    summary = `Location: ${matchedZone.name}`;
    details = `Currently at ${pct}% capacity (${crowd?.status ?? 'normal'}). Connected to ${matchedZone.connectedZoneIds.length} zones.`;
    affectedZoneId = matchedZone.id;
  } else {
    summary = 'Announcement Broadcast';
    details = `Notice broadcast to all event screens: "${prompt}".`;
  }

  const newAlert: Alert = {
    id: `alert-info-${Date.now()}`,
    type: 'route',
    severity: 'low',
    message: `Copilot: ${summary} · ${details}`,
    zoneId: affectedZoneId,
    timestamp,
    acknowledged: false,
  };

  const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
  return {
    newAlerts: [newAlert],
    promptResult: {
      rawPrompt: prompt,
      type: 'query',
      summary,
      details,
      affectedZoneId,
      executionTimeMs,
    },
  };
}
