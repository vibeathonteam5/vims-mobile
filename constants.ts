
import { UserRole, Visitor, ParkingBay, SecurityAlert } from './types';

export const TOWERS = ['Tower A (Finance)', 'Tower B (Tech)', 'Tower C (Operations)', 'Annex Building'];

export const MOCK_VISITORS: Visitor[] = [
  {
    id: 'V-101',
    name: 'Sarah Connor',
    hostName: 'John Smith',
    tower: 'Tower B (Tech)',
    floor: 'Level 14',
    purpose: 'System Audit',
    status: 'PENDING',
    qrCode: 'QR_SC_123',
    accessType: 'QR',
    evRequired: true
  },
  {
    id: 'V-102',
    name: 'Marcus Wright',
    hostName: 'Kyle Reese',
    tower: 'Tower A (Finance)',
    floor: 'Level 2',
    purpose: 'Interview',
    status: 'CHECKED_IN',
    checkInTime: new Date().toISOString(),
    qrCode: 'QR_MW_456',
    accessType: 'FACE',
    parkingSlot: 'P1-42',
    evRequired: false
  }
];

export const MOCK_PARKING: ParkingBay[] = Array.from({ length: 20 }, (_, i) => ({
  id: `P1-${i + 1}`,
  type: i % 5 === 0 ? 'EV' : 'STANDARD',
  status: Math.random() > 0.3 ? 'AVAILABLE' : 'OCCUPIED',
  tower: TOWERS[i % TOWERS.length]
}));

export const MOCK_ALERTS: SecurityAlert[] = [
  {
    id: 'A1',
    timestamp: '10:15 AM',
    level: 'LOW',
    message: 'Gate 3 sensor bypass detected',
    location: 'North Perimeter'
  },
  {
    id: 'A2',
    timestamp: '11:30 AM',
    level: 'HIGH',
    message: 'Unrecognized facial match at Server Room 4',
    location: 'Tower B, L12'
  }
];

export const ANALYTICS_CHART = [
  { time: '08:00', visitors: 12, guards: 4 },
  { time: '10:00', visitors: 45, guards: 6 },
  { time: '12:00', visitors: 82, guards: 8 },
  { time: '14:00', visitors: 65, guards: 8 },
  { time: '16:00', visitors: 30, guards: 5 },
  { time: '18:00', visitors: 15, guards: 4 },
];
