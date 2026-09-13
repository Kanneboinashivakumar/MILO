import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthPage } from './pages/auth/AuthPage';
import { AttendeeLayout } from './pages/attendee/AttendeeLayout';
import { OrganizerLayout } from './pages/organizer/OrganizerLayout';
import { HomePage } from './pages/attendee/Home';
import { PlannerPage } from './pages/attendee/Planner';
import { MyPlanPage } from './pages/attendee/MyPlan';
import { LiveMapPage } from './pages/attendee/LiveMap';
import { ProtectPage } from './pages/attendee/Protect';
import { OverviewPage } from './pages/organizer/Overview';
import { LiveVenuePage } from './pages/organizer/LiveVenue';
import { EventTwinPage } from './pages/organizer/EventTwin';
import { AlertsPage } from './pages/organizer/Alerts';
import { DemoPanel } from './components/DemoPanel';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/welcome" element={<AuthPage />} />
          <Route path="/attendee" element={<AttendeeLayout />}>
            <Route index element={<HomePage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="my-plan" element={<MyPlanPage />} />
            <Route path="map" element={<LiveMapPage />} />
            <Route path="protect" element={<ProtectPage />} />
          </Route>
          <Route path="/organizer" element={<OrganizerLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="live-venue" element={<LiveVenuePage />} />
            <Route path="event-twin" element={<EventTwinPage />} />
            <Route path="alerts" element={<AlertsPage />} />
          </Route>
        </Routes>
        <DemoPanel />
      </BrowserRouter>
    </ErrorBoundary>
  );
}