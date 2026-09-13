import { create } from 'zustand';
import type {
  VenueZone, Session, Attendee, Itinerary, CrowdState,
  Alert, Incident, SimulationScenario, SimulationResult,
  ResponsePlan, AdaptationSuggestion, EventState,
  UserProfile, SavedPlan,
} from '../types';
import {
  SEED_ZONES, SEED_SESSIONS, SEED_SCENARIOS,
  SEED_ATTENDEE, SEED_EVENT,
  SEED_HACKATHON_EVENT, SEED_HACKATHON_SESSIONS,
} from '../data/seed';
import { computeAllCrowdStates } from '../engine/crowdEngine';
import { computeHealth } from '../engine/healthEngine';
import { checkItineraryImpact, generateAdaptation } from '../engine/adaptationEngine';
import { processPrompt, type PromptResult } from '../engine/promptEngine';

function deepCloneZones(zones: VenueZone[]): VenueZone[] {
  return zones.map(z => ({
    ...z,
    facilities: z.facilities.map(f => ({ ...f })),
    connectedZoneIds: [...z.connectedZoneIds],
  }));
}
function deepCloneSessions(sessions: Session[]): Session[] {
  return sessions.map(s => ({ ...s, tags: [...s.tags] }));
}

function loadInitialUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('milo_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.email === 'string' && typeof parsed.role === 'string') {
      return {
        id: String(parsed.id || 'user-1'),
        email: String(parsed.email).slice(0, 100),
        name: String(parsed.name || 'Alex').slice(0, 100),
        role: parsed.role === 'organizer' ? 'organizer' : 'attendee',
        interests: Array.isArray(parsed.interests) ? parsed.interests : ['AI/ML', 'Design'],
      };
    }
    return null;
  } catch {
    return null;
  }
}

function loadInitialPlanHistory(): SavedPlan[] {
  try {
    const raw = localStorage.getItem('milo_plan_history');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.itinerary &&
        Array.isArray(item.itinerary.items)
      );
    }
    return [];
  } catch {
    return [];
  }
}

interface StoreState {
  eventState: EventState;
  zones: VenueZone[];
  sessions: Session[];
  crowdStates: CrowdState[];
  attendee: Attendee;
  itinerary: Itinerary | null;
  adaptationSuggestion: AdaptationSuggestion | null;
  alerts: Alert[];
  incidents: Incident[];
  scenarios: SimulationScenario[];
  simulationResult: SimulationResult | null;
  responsePlan: ResponsePlan | null;
  demoMode: boolean;
  highlightedRouteZoneIds: string[];
  selectedZoneId: string | null;
  lastPromptResult: PromptResult | null;
  livePulseEnabled: boolean;
  currentUser: UserProfile | null;
  savedPlanHistory: SavedPlan[];
}

interface StoreActions {
  updateZoneCrowd: (zoneId: string, newPct: number) => void;
  blockZone: (zoneId: string) => void;
  unblockZone: (zoneId: string) => void;
  cancelSession: (sessionId: string) => void;
  restoreSession: (sessionId: string) => void;
  setAttendee: (attendee: Attendee) => void;
  setItinerary: (itinerary: Itinerary | null) => void;
  setAdaptationSuggestion: (suggestion: AdaptationSuggestion | null) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  addIncident: (incident: Incident) => void;
  resolveIncident: (incidentId: string) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setResponsePlan: (plan: ResponsePlan | null) => void;
  applyResponsePlanToStore: (updatedZones: VenueZone[]) => void;
  setHighlightedRoute: (zoneIds: string[]) => void;
  setSelectedZone: (zoneId: string | null) => void;
  resetDemo: () => void;
  triggerMainStageOverload: () => void;
  triggerEmergency: () => void;
  triggerCancelSession: () => void;
  triggerCongestEastEntrance: () => void;
  executePrompt: (promptText: string) => PromptResult;
  switchEventMode: (mode: 'hackathon' | 'summit') => void;
  addSession: (session: Session) => void;
  toggleLivePulse: () => void;
  tickSimulation: () => void;
  login: (user: UserProfile) => void;
  logout: () => void;
  saveCurrentPlanToHistory: (customName?: string) => void;
  restorePlanFromHistory: (planId: string) => void;
  deletePlanFromHistory: (planId: string) => void;
}

const buildInitialState = (): StoreState => {
  const zones = deepCloneZones(SEED_ZONES);
  const crowdStates = computeAllCrowdStates(zones);
  const health = computeHealth(zones, [], []);
  const initialHistory = loadInitialPlanHistory();
  return {
    eventState: { ...SEED_HACKATHON_EVENT, health },
    zones,
    sessions: deepCloneSessions([...SEED_HACKATHON_SESSIONS, ...SEED_SESSIONS]),
    crowdStates,
    attendee: { ...SEED_ATTENDEE, accessibilityProfile: { ...SEED_ATTENDEE.accessibilityProfile } },
    itinerary: null,
    adaptationSuggestion: null,
    alerts: [
      {
        id: 'alert-init-1',
        type: 'accessibility',
        severity: 'low',
        message: 'Welcome to MILO Smart Event! Step-free indoor navigation and real-time crowd heatmaps are active.',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'alert-init-2',
        type: 'session',
        severity: 'moderate',
        message: 'Keynote Kickoff starts at 09:00 AM at Main Stage. Follow step-free wayfinding signs.',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ],
    incidents: [],
    scenarios: SEED_SCENARIOS,
    simulationResult: null,
    responsePlan: null,
    demoMode: true,
    highlightedRouteZoneIds: [],
    selectedZoneId: null,
    lastPromptResult: null,
    livePulseEnabled: false,
    currentUser: loadInitialUser(),
    savedPlanHistory: initialHistory,
  };
};

function evaluateImpact(
  itinerary: Itinerary | null,
  crowdStates: CrowdState[],
  sessions: Session[],
  zones: VenueZone[],
  attendee: Attendee
): AdaptationSuggestion | null {
  if (!itinerary || itinerary.items.length === 0) return null;
  const { affected, affectedItemIds } = checkItineraryImpact(itinerary, crowdStates, sessions);
  if (!affected) return null;
  return generateAdaptation(itinerary, affectedItemIds, sessions, zones, attendee);
}

export const useEventStore = create<StoreState & StoreActions>((set, get) => ({
  ...buildInitialState(),

  updateZoneCrowd: (zoneId, newPct) =>
    set((state) => {
      const zones = state.zones.map(z =>
        z.id === zoneId ? { ...z, currentCrowd: Math.round((newPct / 100) * z.capacity) } : z
      );
      const crowdStates = computeAllCrowdStates(zones);
      const health = computeHealth(zones, state.incidents, []);
      const adaptationSuggestion = evaluateImpact(state.itinerary, crowdStates, state.sessions, zones, state.attendee);
      return {
        zones,
        crowdStates,
        adaptationSuggestion,
        eventState: { ...state.eventState, health },
      };
    }),

  blockZone: (zoneId) =>
    set((state) => {
      const zones = state.zones.map(z => z.id === zoneId ? { ...z, isBlocked: true } : z);
      const health = computeHealth(zones, state.incidents, [zoneId]);
      return { zones, eventState: { ...state.eventState, health } };
    }),

  unblockZone: (zoneId) =>
    set((state) => {
      const zones = state.zones.map(z => z.id === zoneId ? { ...z, isBlocked: false } : z);
      const health = computeHealth(zones, state.incidents, []);
      return { zones, eventState: { ...state.eventState, health } };
    }),

  cancelSession: (sessionId) =>
    set((state) => {
      const sessions = state.sessions.map(s => s.id === sessionId ? { ...s, isCancelled: true } : s);
      const adaptationSuggestion = evaluateImpact(state.itinerary, state.crowdStates, sessions, state.zones, state.attendee);
      return { sessions, adaptationSuggestion };
    }),

  restoreSession: (sessionId) =>
    set((state) => {
      const sessions = state.sessions.map(s => s.id === sessionId ? { ...s, isCancelled: false } : s);
      const adaptationSuggestion = evaluateImpact(state.itinerary, state.crowdStates, sessions, state.zones, state.attendee);
      return { sessions, adaptationSuggestion };
    }),

  setAttendee: (attendee) => set({ attendee }),

  setItinerary: (itinerary) =>
    set((state) => {
      const adaptationSuggestion = evaluateImpact(itinerary, state.crowdStates, state.sessions, state.zones, state.attendee);
      let updatedHistory = state.savedPlanHistory;
      if (itinerary && itinerary.items.length > 0) {
        const existingIdx = state.savedPlanHistory.findIndex(p => p.itinerary.id === itinerary.id);
        const newRecord: SavedPlan = {
          id: itinerary.id || `plan-${Date.now()}`,
          name: existingIdx >= 0 ? state.savedPlanHistory[existingIdx].name : `Plan · ${itinerary.items.length} Sessions (${itinerary.totalMinutes}m)`,
          timestamp: new Date().toISOString(),
          itinerary,
          sessionCount: itinerary.items.length,
          totalMinutes: itinerary.totalMinutes,
          active: true,
        };
        const rest = state.savedPlanHistory.filter(p => p.itinerary.id !== itinerary.id).map(p => ({ ...p, active: false }));
        updatedHistory = [newRecord, ...rest];
        try {
          localStorage.setItem('milo_plan_history', JSON.stringify(updatedHistory));
        } catch {}
      }
      return { itinerary, adaptationSuggestion, savedPlanHistory: updatedHistory };
    }),

  setAdaptationSuggestion: (adaptationSuggestion) => set({ adaptationSuggestion }),

  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts] })),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a),
    })),

  addIncident: (incident) =>
    set((state) => {
      const incidents = [...state.incidents, incident];
      const health = computeHealth(state.zones, incidents, []);
      return { incidents, eventState: { ...state.eventState, health } };
    }),

  resolveIncident: (incidentId) =>
    set((state) => {
      const incident = state.incidents.find(i => i.id === incidentId);
      const incidents = state.incidents.map(i => i.id === incidentId ? { ...i, active: false } : i);
      // Unblock the zone associated with the resolved incident
      const zones = incident ? state.zones.map(z => z.id === incident.zoneId ? { ...z, isBlocked: false } : z) : state.zones;
      const activeIncidents = incidents.filter(i => i.active);
      const blockedZones = zones.filter(z => z.isBlocked).map(z => z.id);
      const health = computeHealth(zones, activeIncidents, blockedZones);
      return { zones, incidents, eventState: { ...state.eventState, health } };
    }),

  setSimulationResult: (simulationResult) => set({ simulationResult }),

  setResponsePlan: (responsePlan) => set({ responsePlan }),

  applyResponsePlanToStore: (updatedZones) =>
    set((state) => {
      const crowdStates = computeAllCrowdStates(updatedZones);
      const health = computeHealth(updatedZones, state.incidents, []);
      // Re-evaluate adaptation suggestion: if the intervention relieved the crowd, suggestion resolves cleanly
      const adaptationSuggestion = evaluateImpact(state.itinerary, crowdStates, state.sessions, updatedZones, state.attendee);
      return {
        zones: updatedZones,
        crowdStates,
        adaptationSuggestion,
        eventState: { ...state.eventState, health },
      };
    }),

  setHighlightedRoute: (highlightedRouteZoneIds) => set({ highlightedRouteZoneIds }),

  setSelectedZone: (selectedZoneId) => set({ selectedZoneId }),

  resetDemo: () => {
    try {
      localStorage.removeItem('milo_plan_history');
      localStorage.removeItem('milo_user');
    } catch {}
    set(buildInitialState());
  },

  triggerMainStageOverload: () => {
    const state = get();
    const zones = state.zones.map(z => {
      if (z.id === 'main-stage') return { ...z, currentCrowd: Math.round(z.capacity * 0.95), trend: 'rising' as const };
      if (z.id === 'central-corridor') return { ...z, currentCrowd: Math.round(z.capacity * 0.88), trend: 'rising' as const };
      return z;
    });
    const crowdStates = computeAllCrowdStates(zones);
    const health = computeHealth(zones, state.incidents, []);
    const alert: Alert = {
      id: `alert-${Date.now()}`,
      type: 'crowd',
      severity: 'critical',
      message: 'CRITICAL: Main Stage capacity at 95% · severe congestion detected.',
      zoneId: 'main-stage',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    const adaptationSuggestion = evaluateImpact(state.itinerary, crowdStates, state.sessions, zones, state.attendee);
    set({
      zones,
      crowdStates,
      alerts: [alert, ...state.alerts],
      adaptationSuggestion,
      eventState: { ...state.eventState, health },
    });
  },

  triggerEmergency: () => {
    const state = get();
    const incident: Incident = {
      id: `inc-${Date.now()}`,
      zoneId: 'central-corridor',
      type: 'emergency',
      description: 'Emergency corridor blockage · route rerouting activated.',
      active: true,
      timestamp: new Date().toISOString(),
    };
    const alert: Alert = {
      id: `alert-emg-${Date.now()}`,
      type: 'safety',
      severity: 'critical',
      message: 'EMERGENCY: Central Corridor blocked. Follow safe evacuation routes.',
      zoneId: 'central-corridor',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    const zones = state.zones.map(z => z.id === 'central-corridor' ? { ...z, isBlocked: true } : z);
    const incidents = [incident, ...state.incidents];
    const health = computeHealth(zones, incidents, ['central-corridor']);
    set({
      zones,
      incidents,
      alerts: [alert, ...state.alerts],
      eventState: { ...state.eventState, health },
    });
  },

  triggerCancelSession: () => {
    const state = get();
    get().cancelSession('session-1');
    const alert: Alert = {
      id: `alert-cancel-${Date.now()}`,
      type: 'session',
      severity: 'high',
      message: 'Notice: "Future of AI" keynote has been cancelled due to technical delays.',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    set({ alerts: [alert, ...state.alerts] });
  },

  triggerCongestEastEntrance: () => {
    get().updateZoneCrowd('east-entrance', 92);
    const alert: Alert = {
      id: `alert-entrance-${Date.now()}`,
      type: 'crowd',
      severity: 'high',
      message: 'East Entrance congested (92%). Attendees advised to use Registration Corridor.',
      zoneId: 'east-entrance',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    set((state) => ({ alerts: [alert, ...state.alerts] }));
  },

  executePrompt: (promptText) => {
    const state = get();
    const context = {
      zones: state.zones,
      sessions: state.sessions,
      crowdStates: state.crowdStates,
      currentEventName: state.eventState.name,
    };
    const mutations = processPrompt(promptText, context);
    const updatedZones = mutations.updatedZones ?? state.zones;
    const updatedSessions = mutations.updatedSessions ?? state.sessions;
    const crowdStates = mutations.updatedZones ? computeAllCrowdStates(updatedZones) : state.crowdStates;
    const incidents = mutations.newIncidents ? [...mutations.newIncidents, ...state.incidents] : state.incidents;
    const alerts = mutations.newAlerts ? [...mutations.newAlerts, ...state.alerts] : state.alerts;
    const blockedZoneIds = updatedZones.filter(z => z.isBlocked).map(z => z.id);
    const health = computeHealth(updatedZones, incidents, blockedZoneIds);
    const eventName = mutations.newEventName ?? state.eventState.name;
    const adaptationSuggestion = evaluateImpact(state.itinerary, crowdStates, updatedSessions, updatedZones, state.attendee);

    set({
      zones: updatedZones,
      sessions: updatedSessions,
      crowdStates,
      incidents,
      alerts,
      eventState: { ...state.eventState, name: eventName, health },
      adaptationSuggestion,
      lastPromptResult: mutations.promptResult,
    });

    return mutations.promptResult;
  },

  switchEventMode: (mode) => {
    if (mode === 'hackathon') {
      get().executePrompt('switch to hackathon mode');
    } else {
      get().executePrompt('reset to summit mode');
    }
  },

  addSession: (session) =>
    set((state) => {
      const updatedSessions = [session, ...state.sessions];
      const adaptationSuggestion = evaluateImpact(state.itinerary, state.crowdStates, updatedSessions, state.zones, state.attendee);
      return { sessions: updatedSessions, adaptationSuggestion };
    }),

  toggleLivePulse: () => set((state) => ({ livePulseEnabled: !state.livePulseEnabled })),

  tickSimulation: () =>
    set((state) => {
      // Subtle realistic crowd fluctuation (+/- 2-4 attendees) in open zones
      const updatedZones = state.zones.map(z => {
        if (z.isBlocked) return z;
        const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const newCrowd = Math.max(5, Math.min(z.capacity, z.currentCrowd + delta));
        return { ...z, currentCrowd: newCrowd };
      });
      const crowdStates = computeAllCrowdStates(updatedZones);
      const blockedZoneIds = updatedZones.filter(z => z.isBlocked).map(z => z.id);
      const health = computeHealth(updatedZones, state.incidents, blockedZoneIds);
      return {
        zones: updatedZones,
        crowdStates,
        eventState: { ...state.eventState, health },
      };
    }),

  login: (user) => {
    try {
      localStorage.setItem('milo_user', JSON.stringify(user));
    } catch {}
    set((state) => ({
      currentUser: user,
      attendee: {
        ...state.attendee,
        name: user.name,
        interests: user.interests.length > 0 ? user.interests : state.attendee.interests,
      },
    }));
  },

  logout: () => {
    try {
      localStorage.removeItem('milo_user');
    } catch {}
    set({ currentUser: null });
  },

  saveCurrentPlanToHistory: (customName) => {
    const state = get();
    if (!state.itinerary) return;
    const name = customName || `Plan · ${state.itinerary.items.length} Sessions (${state.itinerary.totalMinutes}m)`;
    const newRecord: SavedPlan = {
      id: `plan-${Date.now()}`,
      name,
      timestamp: new Date().toISOString(),
      itinerary: state.itinerary,
      sessionCount: state.itinerary.items.length,
      totalMinutes: state.itinerary.totalMinutes,
      active: true,
    };
    const updatedHistory = [newRecord, ...state.savedPlanHistory.map(p => ({ ...p, active: false }))];
    try {
      localStorage.setItem('milo_plan_history', JSON.stringify(updatedHistory));
    } catch {}
    set({ savedPlanHistory: updatedHistory });
  },

  restorePlanFromHistory: (planId) => {
    const state = get();
    const target = state.savedPlanHistory.find(p => p.id === planId);
    if (!target) return;
    const updatedHistory = state.savedPlanHistory.map(p => ({
      ...p,
      active: p.id === planId,
    }));
    try {
      localStorage.setItem('milo_plan_history', JSON.stringify(updatedHistory));
    } catch {}
    const adaptationSuggestion = evaluateImpact(target.itinerary, state.crowdStates, state.sessions, state.zones, state.attendee);
    set({
      itinerary: target.itinerary,
      savedPlanHistory: updatedHistory,
      adaptationSuggestion,
    });
  },

  deletePlanFromHistory: (planId) => {
    const state = get();
    const updatedHistory = state.savedPlanHistory.filter(p => p.id !== planId);
    try {
      localStorage.setItem('milo_plan_history', JSON.stringify(updatedHistory));
    } catch {}
    const wasActive = state.savedPlanHistory.find(p => p.id === planId)?.active;
    set({
      savedPlanHistory: updatedHistory,
      itinerary: wasActive ? null : state.itinerary,
    });
  },
}));

