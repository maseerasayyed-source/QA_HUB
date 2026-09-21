import { BeaconModule, TicketSummary, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  name: 'Maseera Sayyed',
  email: 'maseerasayyed@quantumphinance.com',
  role: 'Super Admin',
  department: 'Quality Assurance',
  status: 'Active',
  joiningDate: '2025-01-15',
};

export const INITIAL_MODULES: BeaconModule[] = [
  { id: 'mod-1', name: 'Term Loan', code: 'TL', category: 'Lending', description: 'Long-term and scheduled amortization loans', activeTicketsCount: 0 },
  { id: 'mod-2', name: 'Short Term Loan (STL)', code: 'STL', category: 'Lending', description: 'Short duration revolving credit facilities', activeTicketsCount: 0 },
  { id: 'mod-3', name: 'Working Capital Demand Loan', code: 'WCDL', category: 'Lending', description: 'Working capital financing and tenure roll-overs', activeTicketsCount: 0 },
  { id: 'mod-4', name: 'Letter of Credit (LOC)', code: 'LOC', category: 'Lending', description: 'Trade finance, issuance, and maturity settlements', activeTicketsCount: 0 },
  { id: 'mod-5', name: 'Cash Credit (CC)', code: 'CC', category: 'Lending', description: 'Continuous drawing limit against hypothecation', activeTicketsCount: 0 },
  { id: 'mod-6', name: 'Overdraft (OD)', code: 'OD', category: 'Lending', description: 'Account overdraft limits and penal interest calculations', activeTicketsCount: 0 },
  { id: 'mod-7', name: 'Investments', code: 'INV', category: 'Investments', description: 'Portfolio positions, valuations, and yield monitoring', activeTicketsCount: 0 },
  { id: 'mod-8', name: 'Non-Convertible Debentures', code: 'NCD', category: 'Investments', description: 'Coupon payment schedules, debentures, and redemptions', activeTicketsCount: 0 },
  { id: 'mod-9', name: 'Government Securities (GSec)', code: 'GSEC', category: 'Investments', description: 'Sovereign paper, yields, clean/dirty pricing', activeTicketsCount: 0 },
  { id: 'mod-10', name: 'Commercial Paper (CP)', code: 'CP', category: 'Investments', description: 'Money market instruments and discounted pricing', activeTicketsCount: 0 },
  { id: 'mod-11', name: 'Fixed Deposit (FD)', code: 'FD', category: 'Treasury', description: 'Tenure deposits, compounding logic, and TDS rules', activeTicketsCount: 0 },
  { id: 'mod-12', name: 'Mutual Funds (MF)', code: 'MF', category: 'Investments', description: 'NAV tracking, dividend options, purchase/redemption', activeTicketsCount: 0 },
  { id: 'mod-13', name: 'Treasury & ALM', code: 'TRSY', category: 'Treasury', description: 'Asset Liability Management, liquidity buckets, maturity gaps', activeTicketsCount: 0 },
  { id: 'mod-14', name: 'Interest Calculations', code: 'INT', category: 'Core', description: 'Day-count conventions (30/360, Actual/365), compounding & resets', activeTicketsCount: 0 },
  { id: 'mod-15', name: 'Cashflow Projections', code: 'CF', category: 'Core', description: 'Projected inflows/outflows, settlement matching, variance', activeTicketsCount: 0 },
  { id: 'mod-16', name: 'Accounting & Ledger', code: 'ACC', category: 'Accounting', description: 'Journal vouchers, chart of accounts, double-entry validation', activeTicketsCount: 0 },
  { id: 'mod-17', name: 'Financial Reports', code: 'REP', category: 'Core', description: 'Regulatory, P&L, balance sheets, and audit trail exports', activeTicketsCount: 0 },
  { id: 'mod-18', name: 'Payment Bulk & Sanction', code: 'PAY', category: 'Core', description: 'Maker-checker workflows, batch processing, reversal handling', activeTicketsCount: 0 },
];

// Completely clean tickets list: 0 sample tickets allowed
export const INITIAL_TICKETS: TicketSummary[] = [];

export const INITIAL_TEST_CASE_HEADER: import('../types').TestCaseHeaderMeta = {
  ticketNo: '',
  clientName: 'Treasury Master',
  sha: '',
  taskName: '',
  taskDoneBy: '',
  signOffBy: '',
  reviewStatus: 'Draft',
  version: '1.0',
};

// Completely clean test cases: 0 sample cases allowed
export const INITIAL_TEST_CASES: import('../types').TestCaseItem[] = [];

export const INITIAL_OBSERVATION_HEADER: import('../types').ObservationHeaderMeta = {
  ticketName: '',
  ticketNo: '',
  qaOwner: '',
  clientName: 'Treasury Master',
  date: new Date().toISOString().split('T')[0],
};

// Completely clean observations: 0 sample observations allowed
export const INITIAL_OBSERVATIONS: import('../types').ObservationItem[] = [];

export const INITIAL_DEV_TEST_HEADER: import('../types').DeveloperTestHeaderMeta = {
  ticketNo: '',
  featureName: '',
  developer: '',
  devTestDate: new Date().toISOString().split('T')[0],
  signOffBy: '',
  shaCommit: '',
};

// Completely clean developer testing: 0 sample items allowed
export const INITIAL_DEV_TEST_ITEMS: import('../types').DeveloperTestItem[] = [];
