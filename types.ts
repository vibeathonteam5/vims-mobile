
export enum UserRole {
  GUARD = 'GUARD',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  AUX_POLICE = 'AUX_POLICE'
}

export type VisitorPersona = 'CORPORATE_VISITOR' | 'CONTRACTOR' | 'DELIVERY' | 'VIP' | 'INTERVIEW_CANDIDATE' | 'INTERNAL_STAFF';

export interface Visitor {
  id: string;
  name: string;
  nric?: string; // National ID from scanner
  hostName?: string;
  tower: string;
  floor: string;
  purpose: string;
  status: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'EXPIRED';
  checkInTime?: string;
  durationHours?: number;
  qrCode: string;
  accessType: 'QR' | 'FACE' | 'NFC';
  parkingSlot?: string;
  evRequired: boolean;
  persona?: VisitorPersona;
  department?: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  location: string;
}

export interface ParkingBay {
  id: string;
  type: 'STANDARD' | 'EV' | 'VIP';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  tower: string;
}

export interface AnalyticsData {
  time: string;
  visitors: number;
  guards: number;
}
