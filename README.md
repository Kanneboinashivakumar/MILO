# ⚡ MILO — Adaptive Smart Event Experience Platform & Venue Digital Twin

🌐 **Live Prototype:** [https://milo-two-liart.vercel.app/](https://milo-two-liart.vercel.app/) — Explore real-time attendee scheduling, interactive 13-zone Dijkstra routing, and organizer Event Twin simulations directly in your browser.  
💻 **GitHub Repository:** [https://github.com/Kanneboinashivakumar/MILO](https://github.com/Kanneboinashivakumar/MILO)  
🧪 **Automated Test Suite:** 83 / 83 Tests Passing (100% pass rate across 12 test files)  
⚡ **Production Build:** React 19 + TypeScript + Vite (0 errors, ~117 kB gzipped)  

Develop a web-based Smart Event Experience platform that makes large conferences, hackathons, and exhibitions more organized, accessible, safe, and engaging for attendees and organizers. The system provides real-time crowd telemetry, dynamically adapts personal schedules when rooms overflow, computes step-free indoor routes, and equips organizers with a predictive digital twin to simulate and dispatch venue response plans.

---

## 📌 Problem Statement & The Gap

Large events (conferences, expos, hackathons) are highly dynamic environments, but their digital infrastructure is fundamentally broken:

- **Passive & Static Catalogs:** Standard event apps are digital brochures. They show static schedule listings and flat PDF maps that fail the moment a keynote overflows or a stage shifts.
- **Overcrowding & Corridor Bottlenecks:** Attendees frequently trek across sprawling venues only to find sessions packed to 100% capacity, creating frustrated queues and unsafe hallway congestion.
- **Inaccessible Transit Routes:** Attendees requiring step-free navigation (wheelchair users, attendees with strollers or limited mobility) encounter stairs, obstacles, or steep corridors without warning.
- **Disconnected Incident Response:** Organizers rely on fragmented radios and delayed manual messages, lacking real-time visibility into cascade crowd spillovers and venue-wide stability.
- **Emergency Blind Spots:** During on-site incidents, attendees struggle to locate nearest safe exits, while generic muster maps risk directing fleeing crowds directly toward hazard zones.

---

## 💡 The MILO Solution

MILO transforms static event management into a closed-loop, adaptive event operating system:

- **Zero External Hardware:** Runs 100% in any modern web browser using client-side vector blueprints and pure TypeScript graph calculations.
- **The Intelligent Operational Loop:** Operates continuously on a 4-stage feedback cycle:
  $$\text{SENSE (Live Telemetry)} \longrightarrow \text{UNDERSTAND (Impact Analysis)} \longrightarrow \text{ADAPT (Side-by-Side Reroute)} \longrightarrow \text{ACT (1-Click Update)}$$
- **Deterministic-First Engine Suite:** Pure, zero-latency algorithms for Dijkstra pathfinding, multi-factor session scoring, cascade crowd propagation, and venue health scoring without network round-trips ($<5\text{ms}$).
- **Proactive Itinerary Adaptation (MILO ADAPT):** Scans active itineraries against real-time room occupancy ($\ge 90\%$) and provides instant side-by-side alternative recommendations.
- **Event Twin & Predictive Simulations:** Empowers organizers to test "what-if" surge scenarios, inspect corridor cascade spillovers, and deploy verified countermeasure response plans.
- **Safety & Step-Free Egress:** Dynamic hazard exclusion ensures emergency evacuation routes prune dangerous zones and respect hard step-free constraints.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Presentation ["1. Presentation Layer (React 19 + Tailwind CSS)"]
        A["Attendee Mobile Portal (/attendee)<br/>Home | Planner | My Plan | Live Map | Protect SOS"]
        O["Organizer Command Center (/organizer)<br/>Overview | Heatmap | Event Twin | Alerts"]
        D["Interactive Demo Controller<br/>Scenario & Telemetry State Injections"]
    end

    subgraph State ["2. Reactive State Layer (Zustand)"]
        S["Central Event Store (useEventStore.ts)<br/>Venue Topology | Session Catalog | Crowd Telemetry | Active Incidents"]
    end

    subgraph Engines ["3. Seven Deterministic Engines (/src/engine)"]
        E1["crowdEngine.ts<br/>Occupancy percentage & 4-tier crowd classification"]
        E2["routingEngine.ts<br/>Dijkstra indoor pathfinding with step-free stair exclusion"]
        E3["recommendationEngine.ts<br/>Multi-factor interest scoring & conflict-free itinerary packing"]
        E4["adaptationEngine.ts<br/>Proactive >=90% congestion detection & side-by-side rerouting"]
        E5["simulationEngine.ts<br/>Event Twin what-if cascade spillover modeling"]
        E6["healthEngine.ts<br/>Aggregate 0-100 venue stability scoring with incident penalties"]
        E7["safetyEngine.ts<br/>Dynamic hazard-avoidance emergency egress routing"]
    end

    subgraph Infra ["4. Infrastructure & Verification"]
        I1["Defensive LocalStorage with Schema Validation"]
        I2["83/83 Automated Tests Passing (Vitest)"]
        I3["Vercel Edge Deployment (Production Build: ~117 kB gzipped)"]
    end

    A <--> S
    O <--> S
    D --> S
    S <--> E1
    S <--> E2
    S <--> E3
    S <--> E4
    S <--> E5
    S <--> E6
    S <--> E7
    S --> I1
    Presentation --- I2
    Presentation --- I3
```

---

## ✨ Core Features

### 1. 🧭 AI Event Planner & Explainable Itinerary Generator (`/attendee/planner`)
Natural language schedule builder. Enter prompt constraints (e.g., *"I have 2 hours and want to focus on AI workshops and mentors"*); MILO generates a chronological, conflict-free itinerary with transparent reasoning for every selection. Interactive checkboxes allow attendees to review and toggle individual sessions or save the entire plan with 1-click.

### 2. 🗺️ Interactive 13-Zone Blueprint & Dijkstra Routing (`/attendee/map`)
Interactive SVG venue blueprint covering 13 interconnected zones. Provides live occupancy badges (*Low, Moderate, High, Critical*), category filter pills (*Stages, Facilities, Restrooms, First Aid*), and Dijkstra A* indoor pathfinding. Includes a **Wheelchair Accessible** toggle that performs hard stair pruning to guarantee step-free navigation.

### 3. 🔄 MILO ADAPT: Real-Time Congestion Rerouting
When a scheduled session's room reaches critical occupancy ($\ge 90\%$) or becomes blocked by an incident, MILO ADAPT triggers a proactive alert banner. Opening the card presents a **side-by-side comparison** (*Current vs. Suggested alternative*) showing crowd delta, walking distance, and matching interest tags. Attendees adapt their schedule and map route with a single tap.

### 4. 📊 Operations Command Center & Venue Health Telemetry (`/organizer`)
Real-time venue intelligence dashboard protected by administrative passcode (`OPS-ADMIN-2026`). Features the **Venue Health Score (0–100)** computed dynamically from crowd pressure, blocked corridors, and active incidents. Includes a spatial **Live Venue Heatmap** (`/organizer/live-venue`) with occupancy counts and rising/falling trend indicators.

### 5. ⚡ Event Twin: What-If Simulation & Response Plans (`/organizer/event-twin`)
Digital twin simulation engine allowing operators to model stress scenarios (*Main Stage Overload, Workshop Room Cancellation, Entrance Bottleneck, Emergency Incident*). Visualizes cascade crowd spillover into adjacent hallways and synthesizes executable **Automated Response Plans** with before-and-after health score projections.

### 6. 🚨 Protect & SOS Center: Safe Emergency Egress (`/attendee/protect`)
One-tap emergency screen with on-site staff telephone extensions (*Security: Ext. 911, Medical: Ext. 404, Help Desk: Ext. 101*), muster point guidance, and emergency exit routing that dynamically excludes active hazard corridors while maintaining step-free constraints.

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Framework** | React 19 + TypeScript | Strict typing, reactive state, component modularity |
| **Build Tool** | Vite 8 | Sub-second HMR, optimized production rollup (~117 kB gzipped) |
| **Styling** | Tailwind CSS | Modern high-contrast design system with fluid layouts |
| **State Management** | Zustand 5 | Lightweight centralized store with schema-validated persistence |
| **Indoor Routing** | Custom Dijkstra Graph | Deterministic indoor pathfinding with hard stair exclusion |
| **Simulation Engine** | Event Twin (`simulationEngine.ts`) | Topological adjacency cascade crowd modeling |
| **Testing Suite** | Vitest + Testing Library | 83 unit and integration tests (100% pass rate) |
| **Deployment** | Vercel Edge Network | Sub-second global edge distribution with security headers |

---

## 📂 Project Structure

```text
milo/
├── public/                     # Static branding assets and web icons
├── src/
│   ├── assets/                 # SVGs and UI graphics
│   ├── components/             # Reusable UI primitives (Button, Card, Badge, ErrorBoundary)
│   ├── data/                   # Seed venue topology (13 zones), sessions, and scenarios
│   ├── engine/                 # Seven pure deterministic computational engines
│   │   ├── adaptationEngine.ts # Proactive >=90% congestion detection & rerouting
│   │   ├── crowdEngine.ts      # Utilization % and 4-tier crowd classification
│   │   ├── healthEngine.ts     # Real-time 0-100 venue stability scoring
│   │   ├── promptEngine.ts     # Natural language intent & keyword planner
│   │   ├── recommendationEngine.ts # Multi-factor interest scoring & schedule packing
│   │   ├── routingEngine.ts    # Dijkstra pathfinding with step-free stair exclusion
│   │   ├── safetyEngine.ts     # Dynamic hazard-avoidance emergency egress
│   │   └── simulationEngine.ts # Event Twin what-if cascade spillover modeling
│   ├── features/               # Domain modules (AdaptCard, ResponsePlanCard)
│   ├── pages/
│   │   ├── attendee/           # Attendee views: Home, Planner, MyPlan, LiveMap, Protect
│   │   ├── auth/               # Clean credentials login & organizer passcode gate
│   │   └── organizer/          # Organizer views: Overview, LiveVenue, EventTwin, Alerts
│   ├── store/                  # Centralized Zustand reactive store (useEventStore.ts)
│   ├── types/                  # Strict TypeScript interfaces and discriminated unions
│   ├── App.tsx                 # Route tree with ErrorBoundary wrapper
│   └── main.tsx                # Application mount
├── tests/                      # 12 automated test suites (83 tests passing)
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🎯 2-Minute Judging Walkthrough

To experience the complete closed-loop adaptive cycle:

1. **Sign In (`/login`):** Select **Alex (Attendee)** -> click **Sign In**.
2. **AI Planner (`/attendee/planner`):** Click the template *"2h Hackathon Sprint"* -> click **Build my plan**. Both sessions are selected sequentially with transparent reasoning.
3. **Save Schedule:** Click **Save 2 Sessions to My Plan**. View the active itinerary and the **Plan History** archive.
4. **Live Map (`/attendee/map`):** Toggle **Wheelchair Accessible** and verify that Dijkstra pathfinding dynamically avoids stairs.
5. **Trigger Congestion:** In the floating **Demo Controller** (bottom right), click **Main Stage Overload** (surging Main Stage to 95%).
6. **Adapt Itinerary:** An alert banner appears (*"Your plan needs attention"*). Open the Adapt Card, review the side-by-side comparison (*Current vs Suggested*), and click **Switch to Suggested Session**. The schedule and map route update immediately.
7. **Organizer Command Center (`/organizer`):** Log out -> select **Sarah (Organizer)** -> enter passcode `OPS-ADMIN-2026`. Note that Venue Health has dropped due to congestion.
8. **Digital Twin Simulation (`/organizer/event-twin`):** Select **Main Stage Overload** -> click **Run Simulation** to see cascade corridor spillover. Click **Apply Response Plan** to execute operational countermeasures (Health Score recovers).
9. **Emergency SOS (`/attendee/protect`):** View direct emergency phone contacts and safe evacuation routing that circumvents active hazard zones.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- Modern web browser (Chrome, Edge, Safari, Firefox)

### 1. Clone the repository
```bash
git clone https://github.com/Kanneboinashivakumar/MILO.git
cd MILO/milo
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run automated tests
```bash
npm test
```
*Executes all 83 unit and integration tests across 12 test suites.*

### 4. Start the development server
```bash
npm run dev
```
*Open `http://localhost:5173` in your browser.*

### 5. Build for production
```bash
npm run build
```
*Compiles strict TypeScript and outputs an optimized production bundle in `dist/` (~117 kB gzipped).*

---

## 🔮 Future Roadmap

- **Hardware Sensor Ingestion:** Ingest live telemetry streams from overhead optical sensors, turnstiles, and Wi-Fi access point density logs.
- **Sub-Meter Indoor Positioning:** Bluetooth Low Energy (BLE) and Ultra-Wideband (UWB) positioning for turn-by-turn guidance in multi-floor venues.
- **Multi-Venue Scalability:** Extending the topological graph model to campus-wide conventions and sports stadiums.
- **Web Push Emergency Broadcasts:** Integration with Web Push API and SMS gateways for off-app emergency broadcasts.

---

## 📄 License

Distributed under the MIT License.
