
export interface Patient {
  id: string;
  name: string;
  dob?: string; // Date of birth as 'YYYY-MM-DD'
  gender: 'ذكر' | 'أنثى' | 'آخر';
  phone: string;
  address: string;
  avatarUrl?: string;
  createdAt?: any; // To support Firestore serverTimestamp
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image: string;
  nextAvailable: string;
  isAvailableToday: boolean;
  availability: {
    date: string;
    slots: string[];
  }[];
  servicePrice?: number;
  freeReturnDays?: number;
  availableDays?: string[];
}

export interface Appointment {
  id:string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  dateTime: string;
  status: 'Scheduled' | 'Waiting' | 'Completed' | 'Follow-up';
}

export interface RecentActivity {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  patientId: string;
  patientName: string;
  date: any; // To support Firestore serverTimestamp
  amount: number;
  status: 'Success' | 'Failed';
  service?: string;
}

export type UserRole = 'admin' | 'receptionist' | 'doctor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: 'online' | 'offline';
  createdAt?: any;
  presence?: UserPresence;
}

export interface UserPresence {
    state: 'online' | 'offline';
    last_changed: number; // Firestore server timestamp
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

export interface Conversation {
  userId: string;
  messages: Message[];
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    details: Record<string, any>;
    section: string;
    timestamp: any; // To support Firestore serverTimestamp
}
