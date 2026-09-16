import {
  UserProfile,
  BeaconModule,
  TicketSummary,
  TestCaseHeaderMeta,
  TestCaseItem,
  ObservationHeaderMeta,
  ObservationItem,
  DeveloperTestItem,
  DeveloperTestHeaderMeta,
  AppSettings,
  UserManualDoc,
  DailyTaskItem,
  UserNotepad,
} from '../types';
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
  USER_MANUALS: 'qa_hub_user_manuals',
  DAILY_TASKS: 'qa_hub_daily_tasks',
  USER_NOTEPADS: 'qa_hub_user_notepads',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'Default',
  font: 'Inter',
};

// Registered Users & Roles:
// Only Maseera Sayyed (Super Admin) is default registered.
// Other users appear when they create an account / login with their official email.
export const REGISTERED_USERS: UserProfile[] = [
  {
    name: 'Maseera Sayyed',
    email: 'maseerasayyed@quantumphinance.com',
    role: 'Super Admin',
    department: 'Quality Assurance',
    status: 'Active',
    joiningDate: '2025-01-15',
  },
];

/**
 * Determine Role based on official email ID:
 * - Maseera -> Super Admin
 * - Others -> Selected role (e.g. QA, Developer, BA)
 */
export function getRoleByEmail(email: string): UserProfile['role'] {
  const norm = email.toLowerCase().trim();
  if (norm.includes('maseera')) return 'Super Admin';
  return 'QA';
}

/**
 * Initialize / Load DB state from LocalStorage
 */
export function loadInitialData() {
  // Purge any legacy sample data so all modules start with 0 items
  const CLEAN_SLATE_KEY = 'beacon_qa_clean_slate_v6';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!localStorage.getItem(CLEAN_SLATE_KEY)) {
        localStorage.removeItem(STORAGE_KEYS.TICKETS);
        localStorage.removeItem(STORAGE_KEYS.TEST_CASES_MAP);
        localStorage.removeItem(STORAGE_KEYS.TEST_CASE_HEADERS_MAP);
        localStorage.removeItem(STORAGE_KEYS.OBSERVATIONS_MAP);
        localStorage.removeItem(STORAGE_KEYS.DEV_TESTING_MAP);
        localStorage.removeItem(STORAGE_KEYS.DEV_TESTING_HEADERS_MAP);
        localStorage.removeItem(STORAGE_KEYS.MODULES);
        localStorage.setItem(CLEAN_SLATE_KEY, 'true');
      }
    }
  } catch (e) {
    console.error('Failed to clean slate localStorage', e);
  }

  // Load User Session
  // REQUIREMENT: Whenever any user opens the link, the login page must always open!
  // Do NOT auto-login so the user always sees the Login Page (with Sign in with Google).
  let user: UserProfile | null = null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem('qa_hub_current_user');
      if (window.sessionStorage) {
        sessionStorage.removeItem('qa_hub_active_session_user');
      }
    }
  } catch (e) {
    console.error('Failed to reset user session', e);
  }

  // Load Modules (Ensure all 18 modules start with 0 active tickets)
  let modules: BeaconModule[] = INITIAL_MODULES.map((m) => ({ ...m, activeTicketsCount: 0 }));
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

  // Load Tickets (0 dummy tickets allowed; filter out any old legacy 21653/21890 samples)
  let tickets: TicketSummary[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          tickets = parsed
            .filter((t: TicketSummary) => t.ticketNumber !== '21653' && t.ticketNumber !== '21890')
            .map((t: TicketSummary) => ({
              ...t,
              createdBy: t.createdBy || t.qaAssignee || 'Maseera Sayyed',
              creatorEmail: t.creatorEmail || 'maseerasayyed@quantumphinance.com',
            }));
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse tickets from localStorage', e);
  }

  // Load Test Cases Map (Start empty: user creates their own)
  let testCasesMap: Record<string, TestCaseItem[]> = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_CASES_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Remove legacy sample 21653
          delete parsed['21653'];
          delete parsed['21890'];
          testCasesMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse test cases map from localStorage', e);
  }

  // Load Test Case Headers Map
  let testCaseHeadersMap: Record<string, TestCaseHeaderMeta> = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_CASE_HEADERS_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          delete parsed['21653'];
          delete parsed['21890'];
          testCaseHeadersMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse test case headers map from localStorage', e);
  }

  // Load Observations Map
  let observationsMap: Record<string, ObservationItem[]> = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          delete parsed['21653'];
          delete parsed['21890'];
          observationsMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse observations map from localStorage', e);
  }

  // Load Developer Testing Map
  let devTestingMap: Record<string, DeveloperTestItem[]> = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.DEV_TESTING_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          delete parsed['21653'];
          delete parsed['21890'];
          devTestingMap = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse dev testing map from localStorage', e);
  }

  // Load Developer Testing Headers Map
  let devTestingHeadersMap: Record<string, DeveloperTestHeaderMeta> = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.DEV_TESTING_HEADERS_MAP);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          delete parsed['21653'];
          delete parsed['21890'];
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

  // Load User Manuals
  let userManuals: UserManualDoc[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_MANUALS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          userManuals = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse user manuals from localStorage', e);
  }

  // Load Daily Tasks
  let dailyTasks: DailyTaskItem[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.DAILY_TASKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          dailyTasks = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse daily tasks from localStorage', e);
  }

  // Load User Notepads
  let userNotepads: UserNotepad[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_NOTEPADS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          userNotepads = parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse user notepads from localStorage', e);
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
    userManuals,
    dailyTasks,
    userNotepads,
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

export interface SavedUserRecord {
  email: string;
  name: string;
  role: UserProfile['role'];
}

export const USER_REGISTRY_KEY = 'qa_hub_registered_users_registry';

/**
 * Retrieve all registered users saved on this system, defaulting to Maseera Sayyed (Super Admin)
 */
export function getSavedUserRegistry(): SavedUserRecord[] {
  const defaultList: SavedUserRecord[] = [
    {
      name: 'Maseera Sayyed',
      email: 'maseerasayyed@quantumphinance.com',
      role: 'Super Admin',
    },
  ];

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(USER_REGISTRY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const map = new Map<string, SavedUserRecord>();
          defaultList.forEach((u) => map.set(u.email.toLowerCase(), u));
          parsed.forEach((u) => {
            if (u && u.email) {
              const emailLower = u.email.toLowerCase();
              const isMaseera = emailLower === 'maseerasayyed@quantumphinance.com' || emailLower.includes('maseera');
              map.set(emailLower, {
                ...u,
                role: !isMaseera && u.role === 'Super Admin' ? 'QA' : u.role,
              });
            }
          });
          return Array.from(map.values());
        }
      }
    }
  } catch (e) {
    console.error('Failed to get user registry', e);
  }
  return defaultList;
}

/**
 * Save / lock a user with their chosen role in the persistent registry
 */
export function saveUserToRegistry(user: { email: string; name: string; role: UserProfile['role'] }): void {
  try {
    const list = getSavedUserRegistry();
    const cleanEmail = user.email.toLowerCase().trim();
    const existingIndex = list.findIndex((u) => u.email.toLowerCase().trim() === cleanEmail);

    const isMaseera = cleanEmail === 'maseerasayyed@quantumphinance.com' || cleanEmail.includes('maseera');
    const safeRole = !isMaseera && user.role === 'Super Admin' ? 'QA' : user.role;

    if (existingIndex >= 0) {
      // Keep established role to enforce strict role permanence per user request
      const existingRole = list[existingIndex].role;
      const guardedRole = !isMaseera && existingRole === 'Super Admin' ? 'QA' : existingRole;
      list[existingIndex] = {
        email: cleanEmail,
        name: user.name || list[existingIndex].name,
        role: guardedRole,
      };
    } else {
      list.push({
        email: cleanEmail,
        name: user.name,
        role: safeRole,
      });
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to save user to registry', e);
  }
}

/**
 * Get all ticket headers created on this system across all modules
 */
export function getAllCreatedTicketsOnSystem(): TicketSummary[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to get tickets on system', e);
  }
  return [];
}

/**
 * Save user session to sessionStorage and sync with backend
 */
export function saveUserSession(user: UserProfile) {
  try {
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        sessionStorage.setItem('qa_hub_active_session_user', JSON.stringify(user));
      }
      if (window.localStorage) {
        localStorage.setItem('qa_hub_last_user', JSON.stringify(user));
      }
    }

    // Persist in local user registry
    saveUserToRegistry({
      email: user.email,
      name: user.name,
      role: user.role,
    });

    fetch('/api/users/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': user.name,
        'x-user-role': user.role,
      },
      body: JSON.stringify({ userName: user.name, role: user.role, email: user.email }),
    }).catch(() => {});
  } catch (e) {
    console.error(e);
  }
}

/**
 * Logout / clear user session
 */
export function logoutUserSession() {
  try {
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        sessionStorage.removeItem('qa_hub_active_session_user');
      }
      if (window.localStorage) {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
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

/**
 * Save user manuals to storage
 */
export function saveUserManualsToStorage(manuals: UserManualDoc[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_MANUALS, JSON.stringify(manuals));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save daily tasks to storage
 */
export function saveDailyTasksToStorage(tasks: DailyTaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Save user notepads to storage
 */
export function saveUserNotepadsToStorage(notepads: UserNotepad[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_NOTEPADS, JSON.stringify(notepads));
  } catch (e) {
    console.error(e);
  }
}

