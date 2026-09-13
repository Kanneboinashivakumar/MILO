import { describe, it, expect, beforeEach } from 'vitest';
import { useEventStore } from '../src/store/useEventStore';
import type { UserProfile, Itinerary } from '../src/types';

describe('Auth Gateway & Plan History Archives', () => {
  beforeEach(() => {
    useEventStore.getState().resetDemo();
  });

  it('initializes to MILO Smart Event 2026 as the default event', () => {
    const eventName = useEventStore.getState().eventState.name;
    expect(eventName).toContain('MILO');
    expect(eventName).not.toContain('AI Future Summit');

    const sessions = useEventStore.getState().sessions;
    expect(sessions.some(s => s.tags.includes('hackathon'))).toBe(true);
  });

  it('logs in user and updates attendee profile', () => {
    const mockUser: UserProfile = {
      id: 'test-user-1',
      name: 'Kshiv Hacker',
      role: 'attendee',
      interests: ['ai', 'hackathon', 'hardware'],
    };

    useEventStore.getState().login(mockUser);

    expect(useEventStore.getState().currentUser?.name).toBe('Kshiv Hacker');
    expect(useEventStore.getState().attendee.name).toBe('Kshiv Hacker');
    expect(useEventStore.getState().attendee.interests).toContain('hackathon');

    useEventStore.getState().logout();
    expect(useEventStore.getState().currentUser).toBeNull();
  });

  it('records generated itineraries into savedPlanHistory automatically', () => {
    const mockItinerary: Itinerary = {
      id: 'plan-101',
      attendeeId: 'user-alex',
      totalMinutes: 90,
      generatedAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          sessionId: 'hack-1',
          arrivalTime: '09:00',
          walkMinutes: 3,
          crowdAtArrival: 45,
          routeZoneIds: ['registration', 'main-stage'],
          reason: 'Opening briefing for hackers',
        },
      ],
    };

    useEventStore.getState().setItinerary(mockItinerary);

    const history = useEventStore.getState().savedPlanHistory;
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].itinerary.id).toBe('plan-101');
    expect(history[0].active).toBe(true);
  });

  it('can restore an archived plan version from history', () => {
    const planA: Itinerary = {
      id: 'plan-a',
      attendeeId: 'user-alex',
      totalMinutes: 60,
      generatedAt: new Date().toISOString(),
      items: [
        {
          id: 'item-a',
          sessionId: 'hack-1',
          arrivalTime: '09:00',
          walkMinutes: 2,
          crowdAtArrival: 30,
          routeZoneIds: ['registration', 'main-stage'],
          reason: 'Track A',
        },
      ],
    };

    const planB: Itinerary = {
      id: 'plan-b',
      attendeeId: 'user-alex',
      totalMinutes: 120,
      generatedAt: new Date().toISOString(),
      items: [
        {
          id: 'item-b',
          sessionId: 'hack-2',
          arrivalTime: '10:15',
          walkMinutes: 4,
          crowdAtArrival: 50,
          routeZoneIds: ['main-stage', 'workshop-hall'],
          reason: 'Track B',
        },
      ],
    };

    useEventStore.getState().setItinerary(planA);
    useEventStore.getState().setItinerary(planB);

    // Active should now be planB
    expect(useEventStore.getState().itinerary?.id).toBe('plan-b');

    // Restore planA
    useEventStore.getState().restorePlanFromHistory('plan-a');
    expect(useEventStore.getState().itinerary?.id).toBe('plan-a');
  });

  it('can delete a plan from history', () => {
    const planToDelete: Itinerary = {
      id: 'plan-to-del',
      attendeeId: 'user-alex',
      totalMinutes: 45,
      generatedAt: new Date().toISOString(),
      items: [
        {
          id: 'item-del',
          sessionId: 'hack-1',
          arrivalTime: '09:00',
          walkMinutes: 2,
          crowdAtArrival: 30,
          routeZoneIds: ['registration'],
          reason: 'Test delete',
        },
      ],
    };

    useEventStore.getState().setItinerary(planToDelete);
    expect(useEventStore.getState().savedPlanHistory.some(p => p.id === 'plan-to-del')).toBe(true);

    useEventStore.getState().deletePlanFromHistory('plan-to-del');
    expect(useEventStore.getState().savedPlanHistory.some(p => p.id === 'plan-to-del')).toBe(false);
  });

  it('handles organizer login and retains role permissions', () => {
    const organizerUser: UserProfile = {
      id: 'user-sarah',
      name: 'Sarah',
      email: 'sarah@milo.events',
      role: 'organizer',
      interests: ['operations', 'safety', 'schedule'],
    };

    useEventStore.getState().login(organizerUser);
    expect(useEventStore.getState().currentUser?.role).toBe('organizer');
    expect(useEventStore.getState().currentUser?.email).toBe('sarah@milo.events');
  });
});
