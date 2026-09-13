// Venue Map Layout Coordinates & Metadata
// viewBox: 0 0 800 420

export interface ZoneLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  displayName: string;
  subtitle: string;
  icon: string;
  category: 'stage' | 'facility' | 'hub' | 'entry';
}

export const MAP_LAYOUT: ZoneLayout[] = [
  { id: 'main-stage',       x: 20,  y: 20,  width: 220, height: 130, labelX: 130, labelY: 75,  displayName: 'Main Stage',       subtitle: 'Keynote Hall (500 cap)', icon: '🎤', category: 'stage' },
  { id: 'registration',     x: 260, y: 20,  width: 125, height: 65,  labelX: 322, labelY: 52,  displayName: 'Registration',     subtitle: 'Badge Pickup',            icon: '🎟️', category: 'entry' },
  { id: 'east-entrance',    x: 405, y: 20,  width: 155, height: 65,  labelX: 482, labelY: 52,  displayName: 'East Entrance',    subtitle: 'Main Venue Entry',        icon: '🚪', category: 'entry' },
  { id: 'security',         x: 580, y: 20,  width: 100, height: 65,  labelX: 630, labelY: 52,  displayName: 'Security',         subtitle: 'Access Check',            icon: '🛡️', category: 'facility' },
  { id: 'central-corridor', x: 260, y: 105, width: 420, height: 75,  labelX: 470, labelY: 142, displayName: 'Central Corridor', subtitle: 'Main Concourse Hub',       icon: '🚶', category: 'hub' },
  { id: 'workshop-hall',    x: 20,  y: 175, width: 210, height: 115, labelX: 125, labelY: 232, displayName: 'Workshop Hall',    subtitle: 'Hands-on Labs (150 cap)', icon: '🛠️', category: 'stage' },
  { id: 'startup-arena',    x: 250, y: 200, width: 195, height: 110, labelX: 347, labelY: 255, displayName: 'Startup Arena',    subtitle: 'Demos & Pitches (200 cap)',icon: '🚀', category: 'stage' },
  { id: 'networking-lounge',x: 465, y: 200, width: 185, height: 110, labelX: 557, labelY: 255, displayName: 'Networking Lounge',subtitle: 'Meet & Connect (100 cap)', icon: '💬', category: 'hub' },
  { id: 'food-court',       x: 670, y: 105, width: 115, height: 205, labelX: 727, labelY: 205, displayName: 'Food Court',       subtitle: 'Café & Dining',           icon: '☕', category: 'facility' },
  { id: 'help-desk',        x: 20,  y: 310, width: 120, height: 75,  labelX: 80,  labelY: 347, displayName: 'Help Desk',        subtitle: 'Info & Support',          icon: 'ℹ️', category: 'facility' },
  { id: 'first-aid',        x: 160, y: 310, width: 120, height: 75,  labelX: 220, labelY: 347, displayName: 'First Aid',        subtitle: 'Medical Station',         icon: '✚',  category: 'facility' },
  { id: 'restrooms',        x: 300, y: 325, width: 135, height: 75,  labelX: 367, labelY: 362, displayName: 'Restrooms',        subtitle: 'Accessible Facilities',   icon: '🚻', category: 'facility' },
  { id: 'emergency-exit',   x: 655, y: 330, width: 130, height: 70,  labelX: 720, labelY: 365, displayName: 'Emergency Exit',   subtitle: 'Direct Safe Egress',      icon: '🚨', category: 'entry' },
];

export const MAP_VIEWBOX = '0 0 800 420';
