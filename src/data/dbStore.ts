import { UserProfile, BeaconModule, TicketSummary, TestCaseHeaderMeta, TestCaseItem, ObservationHeaderMeta, ObservationItem, DeveloperTestItem, DeveloperTestHeaderMeta, AppSettings } from '../types';
import {
  INITIAL_USER,
  INITIAL_MODULES,
  INITIAL_TICKETS,
  INITIAL_TEST_CASE_HEADER,
  INITIAL_TEST_CASES,
  INITIAL_OBSERVATION_HEADER,
  INITIAL_OBSERVATIONS,
  INITIAL_DEV_TEST_HEADER,
  INITIAL_DEV_TEST_ITEMS,
} from './initialData';

const STORAGE_KEYS = {
  USER: 'qa_hub_current_user',
  TICKETS: 'qa_hub_tickets',
  MODULES: 'qa_hub_modules',
  TEST_CASES_MAP: 'qa_hub_test_cases_map',
  TEST_CASE_HEADERS_MAP: 'qa_hub_test_case_headers_map',
  OBSERVATIONS_MAP: 'qa_hub_observations_map',
  DEV_TESTING_MAP: 'qa_hub_dev_testing_map',
  DEV_TESTING_HEADERS_MAP: 'qa_hub_dev_testing_headers_map',
  APP_SETTINGS: 'qa_hub_app_settings',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'Default',
  font: 'Inter',
};

// Registered Users & Roles according to user requirements:
// Maseera -> Super Admin
// Ashwini -> Senior QA
// Others -> User (QA or Developer)
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
    role: 'Senior QA',
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
 * - Ashwini -> Senior QA
 * - Others -> User (or QA / Developer)
 */
export function getRoleByEmail(email: string): UserProfile['role'] {
  const norm = email.toLowerCase().trim();
  if (norm.includes('maseera')) return 'Super Admin';
  if (norm.includes('ashwini')) return 'Senior QA';
  return 'QA';
}

/**
 * Initialize / Load DB state from LocalStorage
 */
export function loadInitialData() {
  // Load User Session
  let user: UserProfile | null = INITIAL_USER;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed === 'object' && parsed.email) {
          user = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
  }

  // Load Modules
  let modules: BeaconModule[] = INITIAL_MODULES;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.MODULES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          modules = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse modules from localStorage', e);
  }

  // Load Tickets
  let tickets: TicketSummary[] = INITIAL_TICKETS;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tickets = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse tickets from localStorage', e);
  }

  // Load Test Cases Map
  let testCasesMap: Record<string, TestCaseItem[]> = {
    '21653': INITIAL_TEST_CASES,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_CASES_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          testCasesMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse test cases map from localStorage', e);
  }

  // Load Test Case Headers Map
  let testCaseHeadersMap: Record<string, TestCaseHeaderMeta> = {
    '21653': INITIAL_TEST_CASE_HEADER,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_CASE_HEADERS_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          testCaseHeadersMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse test case headers map from localStorage', e);
  }

  // Load Observations Map
  let observationsMap: Record<string, ObservationItem[]> = {
    '21653': INITIAL_OBSERVATIONS,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          observationsMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse observations map from localStorage', e);
  }

  // Load Developer Testing Map
  let devTestingMap: Record<string, DeveloperTestItem[]> = {
    '21653': INITIAL_DEV_TEST_ITEMS,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.DEV_TESTING_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          devTestingMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse dev testing map from localStorage', e);
  }

  // Load Developer Testing Headers Map
  let devTestingHeadersMap: Record<string, DeveloperTestHeaderMeta> = {
    '21653': INITIAL_DEV_TEST_HEADER,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.DEV_TESTING_HEADERS_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          devTestingHeadersMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse dev testing headers map from localStorage', e);
  }

  // Load App Settings
  let settings: AppSettings = DEFAULT_SETTINGS;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          settings = { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse app settings from localStorage', e);
  }


  return {
    user,
    modules,
    tickets,
    testCasesMap,
    testCaseHeadersMap,
    observationsMap,
    devTestingMap,
    devTestingHeadersMap,
    settings,
  };
}

export function saveAppSettingsToStorage(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Helper to compute pending observations count
 */
export function getPendingObservationsCount(
  ticketNumber: string,
  observationsMap: Record<string, ObservationItem[]>
): number {
  const items = observationsMap[ticketNumber] || [];
  return items.filter((obs) => obs.status === 'Open' || obs.status === 'In Progress' || (obs as any).status === 'Pending').length;
}

/**
 * Helper to compute total test cases written
 */
export function getTestCasesCountForTicket(
  ticketNumber: string,
  testCasesMap: Record<string, TestCaseItem[]>
): number {
  const items = testCasesMap[ticketNumber] || [];
  return items.length;
}

/**
 * Helper to sync ticket summary stats
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
    const pendingObsCount = obs.filter((o) => o.status === 'Open' || o.status === 'In Progress' || (o as any).status === 'Pending').length;

    return {
      ...t,
      testCasesCount: totalCases,
      passedCount,
      failedCount,
      blockedCount,
      observationsCount: pendingObsCount,
    };
  });
}

/**
 * Backend persistence sync helper
 */
async function syncStateToBackend(currentUser?: UserProfile | null) {
  try {
    const data = loadInitialData();
    const user = currentUser || data.user;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user?.name) headers['x-user-name'] = user.name;
    if (user?.role) headers['x-user-role'] = user.role;

    await fetch('/api/sync-state', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tickets: data.tickets,
        testCases: data.testCasesMap,
        observations: data.observationsMap,
        devTesting: data.devTestingMap
      }),
    });
  } catch (e) {
    // Fail silently in offline mode
  }
}

/**
 * Rehydrate initial state from backend database if available
 */
export async function fetchInitialDataFromBackend() {
  try {
    const res = await fetch('/api/sync-state');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tickets) && data.tickets.length > 0) {
        saveTicketsToStorage(data.tickets);
      }
      return data;
    }
  } catch (e) {
    // Offline mode
  }
  return null;
}

/**
 * Save user session to localStorage and sync with backend
 */
export function saveUserSession(user: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    fetch('/api/users/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': user.name,
        'x-user-role': user.role
      },
      body: JSON.stringify({ userName: user.name, role: user.role })
    }).catch(() => {});
  } catch (e) {
    console.error(e);
  }
}

/**
 * Logout / clear user session from localStorage
 */
export function logoutUserSession() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Clears all sample data
 */
export function clearSampleData() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.TICKETS);
      localStorage.removeItem(STORAGE_KEYS.TEST_CASES_MAP);
      localStorage.removeItem(STORAGE_KEYS.TEST_CASE_HEADERS_MAP);
      localStorage.removeItem(STORAGE_KEYS.OBSERVATIONS_MAP);
      localStorage.removeItem(STORAGE_KEYS.DEV_TESTING_MAP);
      localStorage.removeItem(STORAGE_KEYS.DEV_TESTING_HEADERS_MAP);
    }
  } catch (e) {
    console.error('Failed to clear sample data from localStorage', e);
  }
  return {
    tickets: [] as TicketSummary[],
    testCasesMap: {} as Record<string, TestCaseItem[]>,
    testCaseHeadersMap: {} as Record<string, TestCaseHeaderMeta>,
    observationsMap: {} as Record<string, ObservationItem[]>,
    devTestingMap: {} as Record<string, DeveloperTestItem[]>,
    devTestingHeadersMap: {} as Record<string, DeveloperTestHeaderMeta>,
  };
}

/**
 * Save tickets to localStorage
 */
export function saveTicketsToStorage(tickets: TicketSummary[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    syncStateToBackend();
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save test cases map
 */
export function saveTestCasesMapToStorage(map: Record<string, TestCaseItem[]>) {
  try {
    localStorage.setItem(STORAGE_KEYS.TEST_CASES_MAP, JSON.stringify(map));
    syncStateToBackend();
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save test case headers map
 */
export function saveTestCaseHeadersMapToStorage(map: Record<string, TestCaseHeaderMeta>) {
  try {
    localStorage.setItem(STORAGE_KEYS.TEST_CASE_HEADERS_MAP, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save observations map
 */
export function saveObservationsMapToStorage(map: Record<string, ObservationItem[]>) {
  try {
    localStorage.setItem(STORAGE_KEYS.OBSERVATIONS_MAP, JSON.stringify(map));
    syncStateToBackend();
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save developer testing map
 */
export function saveDevTestingMapToStorage(map: Record<string, DeveloperTestItem[]>) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEV_TESTING_MAP, JSON.stringify(map));
    syncStateToBackend();
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save developer testing headers map
 */
export function saveDevTestingHeadersMapToStorage(map: Record<string, DeveloperTestHeaderMeta>) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEV_TESTING_HEADERS_MAP, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}
