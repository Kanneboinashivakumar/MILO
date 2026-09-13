// MILO · Core Types (strict, no `any`)

export interface Facility {
  type: 'security' | 'firstAid' | 'exit' | 'restroom' | 'helpDesk' | 'registration';
  name: string;
  zoneId: string;
}

export interface VenueZone {
  id: string;
  name: string;
  capacity: number;
  currentCrowd: number;
  trend: 'rising' | 'falling' | 'stable';
  facilities: Facility[];
  connectedZoneIds: string[];
  hasStairs: boolean;
  hasAccessibleRoute: boolean;
  isBlocked: boolean;
}

export interface Session {
  id: string;
  title: string;
  category: string;
  tags: string[];
  zoneId: string;
  startTime: string;
  endTime: string;
  popularity: number;
  isCancelled: boolean;
}

export type CrowdStatus = 'low' | 'moderate' | 'high' | 'critical';

export interface CrowdState {
  zoneId: string;
  utilizationPct: number;
  status: CrowdStatus;
  trend: 'rising' | 'falling' | 'stable';
  predictedPct: number;
}

export interface AccessibilityProfile {
  wheelchairAccessible: boolean;
  avoidStairs: boolean;
  avoidCrowds: boolean;
}

export interface Attendee {
  id: string;
  name: string;
  currentZoneId: string;
  interests: string[];
  availableMinutes: number;
  accessibilityProfile: AccessibilityProfile;
}

export interface Route {
  fromZoneId: string;
  toZoneId: string;
  zoneIds: string[];
  walkMinutes: number;
  isAccessible: boolean;
}

export interface ItineraryItem {
  id: string;
  sessionId: string;
  arrivalTime: string;
  walkMinutes: number;
  crowdAtArrival: number;
  routeZoneIds: string[];
  reason: string;
}

export interface Itinerary {
  id: string;
  attendeeId: string;
  items: ItineraryItem[];
  totalMinutes: number;
  generatedAt: string;
}

export interface Alert {
  id: string;
  type: 'crowd' | 'session' | 'route' | 'safety' | 'accessibility';
  severity: CrowdStatus;
  message: string;
  zoneId?: string;
  sessionId?: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface Incident {
  id: string;
  zoneId: string;
  type: 'emergency' | 'overcrowding' | 'evacuation' | 'hazard';
  description: string;
  active: boolean;
  timestamp: string;
}

export interface Recommendation {
  sessionId: string;
  score: number;
  reason: string;
}

export interface AdaptationSuggestion {
  affectedItemId: string;
  originalSessionId: string;
  suggestedSessionId: string;
  triggerReason: string;
  beforeCrowd: number;
  afterCrowd: number;
  beforeWalkMinutes: number;
  afterWalkMinutes: number;
  benefits: string[];
}

export interface SimulationScenario {
  id: string;
  label: string;
  description: string;
  deltas: Array<{ zoneId: string; newPct: number }>;
}

export interface ZoneSimulationResult {
  zoneId: string;
  zoneName: string;
  beforePct: number;
  afterPct: number;
  beforeStatus: CrowdStatus;
  afterStatus: CrowdStatus;
  isPrimary: boolean;
}

export interface SimulationResult {
  scenarioId: string;
  zoneResults: ZoneSimulationResult[];
  affectedSessionIds: string[];
  estimatedAffectedAttendees: number;
  impactSummary: string;
}

export type ResponseActionStatus = 'pending' | 'applied';

export interface ResponseAction {
  id: string;
  label: string;
  targetZoneId?: string;
  status: ResponseActionStatus;
}

export interface ResponsePlan {
  id: string;
  scenarioId: string;
  actions: ResponseAction[];
  status: 'draft' | 'applied';
  healthBefore?: number;
  healthAfter?: number;
}

export interface EventState {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  health: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: 'attendee' | 'organizer' | 'mentor';
  interests: string[];
}

export interface SavedPlan {
  id: string;
  name: string;
  timestamp: string;
  itinerary: Itinerary;
  sessionCount: number;
  totalMinutes: number;
  active: boolean;
}
