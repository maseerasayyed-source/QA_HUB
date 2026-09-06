import { UserProfile, BeaconModule, TicketSummary, TestCaseHeaderMeta, TestCaseItem, ObservationHeaderMeta, ObservationItem } from '../types';
import {
  INITIAL_USER,
  INITIAL_MODULES,
  INITIAL_TICKETS,
  INITIAL_TEST_CASE_HEADER,
  INITIAL_TEST_CASES,
  INITIAL_OBSERVATION_HEADER,
  INITIAL_OBSERVATIONS,
} from './initialData';

const STORAGE_KEYS = {
  USER: 'qa_hub_current_user',
  TICKETS: 'qa_hub_tickets',
  MODULES: 'qa_hub_modules',
  TEST_CASES_MAP: 'qa_hub_test_cases_map',
  OBSERVATIONS_MAP: 'qa_hub_observations_map',
};

// Registered Users & Roles according to user requirements:
// Maseera -> Super Admin
// Ashwini -> Admin
// Others -> User
export const REGISTERED_USERS: UserProfile[] = [
  {
    name: 'Maseera Sayyed',
    email: 'maseerasayyed@quantumphinance.com',
    role: 'Super Admin',
    department: 'Quality Assurance',
    status: 'Active',
    joiningDate: '2025-01-15',
  },
  {
    name: 'Ashwini Poke',
    email: 'ashwinipoke@quantumphinance.com',
    role: 'Admin',
    department: 'Quality Assurance Management',
    status: 'Active',
    joiningDate: '2025-01-10',
  },
  {
    name: 'Kunal Joshi',
    email: 'kunal.joshi@quantumphinance.com',
    role: 'Developer',
    department: 'Engineering',
    status: 'Active',
    joiningDate: '2025-02-01',
  },
  {
    name: 'Kavita Roy',
    email: 'kavita.roy@quantumphinance.com',
    role: 'QA',
    department: 'Quality Assurance',
    status: 'Active',
    joiningDate: '2025-03-01',
  },
];

/**
 * Determine Role based on official email ID:
 * - Maseera -> Super Admin
 * - Ashwini -> Admin
 * - Others -> User (or QA / Developer)
 */
export function getRoleByEmail(email: string): UserProfile['role'] {
  const norm = email.toLowerCase().trim();
  if (norm.includes('maseera')) return 'Super Admin';
  if (norm.includes('ashwini')) return 'Admin';
  return 'User';
}

/**
 * Initialize / Load DB state from LocalStorage
 */
export function loadInitialData() {
  // Load User
  let user: UserProfile = INITIAL_USER;
  try {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
  }

  // Load Modules
  let modules: BeaconModule[] = INITIAL_MODULES;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MODULES);
    if (stored) {
      modules = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse modules from localStorage', e);
  }

  // Load Tickets
  let tickets: TicketSummary[] = INITIAL_TICKETS;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TICKETS);
    if (stored) {
      tickets = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse tickets from localStorage', e);
  }

  // Load Test Cases Map (keyed by Ticket Number)
  let testCasesMap: Record<string, TestCaseItem[]> = {
    '21653': INITIAL_TEST_CASES,
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TEST_CASES_MAP);
    if (stored) {
      testCasesMap = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse test cases map from localStorage', e);
  }

  // Load Observations Map (keyed by Ticket Number)
  let observationsMap: Record<string, ObservationItem[]> = {
    '21653': INITIAL_OBSERVATIONS,
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS_MAP);
    if (stored) {
      observationsMap = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse observations map from localStorage', e);
  }

  return { user, modules, tickets, testCasesMap, observationsMap };
}

/**
 * Helper to compute pending observations count for a given ticket ID
 */
export function getPendingObservationsCount(
  ticketNumber: string,
  observationsMap: Record<string, ObservationItem[]>
): number {
  const items = observationsMap[ticketNumber] || [];
  return items.filter((obs) => obs.status === 'Pending').length;
}

/**
 * Helper to compute total test cases written for a given ticket ID
 */
export function getTestCasesCountForTicket(
  ticketNumber: string,
  testCasesMap: Record<string, TestCaseItem[]>
): number {
  const items = testCasesMap[ticketNumber] || [];
  return items.length;
}

/**
 * Helper to sync ticket summary stats from test cases & observations map
 */
export function syncTicketCounts(
  tickets: TicketSummary[],
  testCasesMap: Record<string, TestCaseItem[]>,
  observationsMap: Record<string, ObservationItem[]>
): TicketSummary[] {
  return tickets.map((t) => {
    const cases = testCasesMap[t.ticketNumber] || [];
    const obs = observationsMap[t.ticketNumber] || [];

    const totalCases = cases.length;
    const passedCount = cases.filter((c) => c.status === 'pass').length;
    const failedCount = cases.filter((c) => c.status === 'fail').length;
    const blockedCount = cases.filter((c) => c.status === 'blocked').length;
    const pendingObsCount = obs.filter((o) => o.status === 'Pending').length;

    return {
      ...t,
      testCasesCount: totalCases,
      passedCount,
      failedCount,
      blockedCount,
      observationsCount: pendingObsCount, // exact pending observations count
    };
  });
}

/**
 * Save user session to localStorage
 */
export function saveUserSession(user: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save tickets to localStorage
 */
export function saveTicketsToStorage(tickets: TicketSummary[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save test cases map to localStorage
 */
export function saveTestCasesMapToStorage(map: Record<string, TestCaseItem[]>) {
  try {
    localStorage.setItem(STORAGE_KEYS.TEST_CASES_MAP, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save observations map to localStorage
 */
export function saveObservationsMapToStorage(map: Record<string, ObservationItem[]>) {
  try {
    localStorage.setItem(STORAGE_KEYS.OBSERVATIONS_MAP, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}
