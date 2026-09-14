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
  { id: 'mod-1', name: 'Term Loan', code: 'TL', category: 'Lending', description: 'Long-term and scheduled amortization loans', activeTicketsCount: 4 },
  { id: 'mod-2', name: 'Short Term Loan (STL)', code: 'STL', category: 'Lending', description: 'Short duration revolving credit facilities', activeTicketsCount: 2 },
  { id: 'mod-3', name: 'Working Capital Demand Loan', code: 'WCDL', category: 'Lending', description: 'Working capital financing and tenure roll-overs', activeTicketsCount: 1 },
  { id: 'mod-4', name: 'Letter of Credit (LOC)', code: 'LOC', category: 'Lending', description: 'Trade finance, issuance, and maturity settlements', activeTicketsCount: 2 },
  { id: 'mod-5', name: 'Cash Credit (CC)', code: 'CC', category: 'Lending', description: 'Continuous drawing limit against hypothecation', activeTicketsCount: 0 },
  { id: 'mod-6', name: 'Overdraft (OD)', code: 'OD', category: 'Lending', description: 'Account overdraft limits and penal interest calculations', activeTicketsCount: 1 },
  { id: 'mod-7', name: 'Investments', code: 'INV', category: 'Investments', description: 'Portfolio positions, valuations, and yield monitoring', activeTicketsCount: 3 },
  { id: 'mod-8', name: 'Non-Convertible Debentures', code: 'NCD', category: 'Investments', description: 'Coupon payment schedules, debentures, and redemptions', activeTicketsCount: 2 },
  { id: 'mod-9', name: 'Government Securities (GSec)', code: 'GSEC', category: 'Investments', description: 'Sovereign paper, yields, clean/dirty pricing', activeTicketsCount: 1 },
  { id: 'mod-10', name: 'Commercial Paper (CP)', code: 'CP', category: 'Investments', description: 'Money market instruments and discounted pricing', activeTicketsCount: 0 },
  { id: 'mod-11', name: 'Fixed Deposit (FD)', code: 'FD', category: 'Treasury', description: 'Tenure deposits, compounding logic, and TDS rules', activeTicketsCount: 1 },
  { id: 'mod-12', name: 'Mutual Funds (MF)', code: 'MF', category: 'Investments', description: 'NAV tracking, dividend options, purchase/redemption', activeTicketsCount: 2 },
  { id: 'mod-13', name: 'Treasury & ALM', code: 'TRSY', category: 'Treasury', description: 'Asset Liability Management, liquidity buckets, maturity gaps', activeTicketsCount: 3 },
  { id: 'mod-14', name: 'Interest Calculations', code: 'INT', category: 'Core', description: 'Day-count conventions (30/360, Actual/365), compounding & resets', activeTicketsCount: 5 },
  { id: 'mod-15', name: 'Cashflow Projections', code: 'CF', category: 'Core', description: 'Projected inflows/outflows, settlement matching, variance', activeTicketsCount: 3 },
  { id: 'mod-16', name: 'Accounting & Ledger', code: 'ACC', category: 'Accounting', description: 'Journal vouchers, chart of accounts, double-entry validation', activeTicketsCount: 2 },
  { id: 'mod-17', name: 'Financial Reports', code: 'REP', category: 'Core', description: 'Regulatory, P&L, balance sheets, and audit trail exports', activeTicketsCount: 1 },
  { id: 'mod-18', name: 'Payment Bulk & Sanction', code: 'PAY', category: 'Core', description: 'Maker-checker workflows, batch processing, reversal handling', activeTicketsCount: 2 },
];

export const INITIAL_TICKETS: TicketSummary[] = [
  {
    id: 'ticket-21653',
    ticketNumber: '21653',
    featureName: 'penalty overdue report',
    moduleId: 'mod-1',
    moduleName: 'Term Loan',
    developer: 'Kunal Joshi',
    qaAssignee: 'Maseera Sayyed',
    signOffBy: 'Ashwini Poke',
    clientName: 'Treasury Master',
    shaCommit: 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
    priority: 'High',
    status: 'In Testing',
    testCasesCount: 3,
    passedCount: 3,
    failedCount: 0,
    blockedCount: 0,
    observationsCount: 2,
    receivedDate: '2026-09-02',
    description: 'Verify penalty calculation and cashflow display when loan interest or principal is overdue after disbursement.',
    scenarioDetails: '1. Penalty entries in cashflow when overdue occurs after disbursement.\n2. Penalty entries suppressed when zero disbursement.\n3. Overdue report grid reflects penalty entries.',
    impactPoints: ['Term Loan Engine', 'Cashflow Projections', 'Financial Reports'],
    testingScenarios: 'Positive overdue interest calculation; Pre-disbursement guard condition; Overdue report Excel export.',
  },
];

export const INITIAL_TEST_CASE_HEADER: import('../types').TestCaseHeaderMeta = {
  ticketNo: '21653',
  clientName: 'Treasury Master',
  sha: 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
  taskName: 'penalty overdue report',
  taskDoneBy: 'Maseera Sayyed',
  signOffBy: 'Ashwini Poke',
  reviewStatus: 'Draft',
  version: '1.0',
};

export const INITIAL_TEST_CASES: import('../types').TestCaseItem[] = [
  {
    id: 'tc-21653-1',
    testCaseId: 'TC1',
    testModule: 'term loan',
    featureTab: 'penalty',
    testScenario: 'Penalty entries appear in the cashflow when overdue occurs after loan disbursement.',
    preconditions: 'Financial module setup and user permissions available.',
    testCases: 'Verify that penalty is applied and displayed in cashflow when interest or principal becomes overdue after disbursement.',
    testInputs: 'TL-23-24-00001\npenalty interest - 10%\npenalty principal - 10%',
    expectedResult: 'The cashflow should display the deal with penalty entries whenever overdue occurs on interest or principal after loan disbursement.',
    actualResult: 'The cashflow is displaying the deal with penalty entries',
    status: 'pass',
    reviewStatus: 'Approved',
    version: '1.0',
    validationScenario: 'Penalty calculation matches 10% rate on overdue days.',
    additionalCoverage: 'Cashflow settlement integrity validated.',
    attachments: [
      { id: 'att-1', name: 'disbursed_cashflow_p...', url: '' }
    ],
  },
  {
    id: 'tc-21653-2',
    testCaseId: 'TC2',
    testModule: 'term loan',
    featureTab: 'penalty',
    testScenario: 'If no disbursement has occurred, penalty entries should not be displayed in cashflow.',
    preconditions: 'Term Loan contract created in approved state without disbursement voucher.',
    testCases: 'Verify that penalty entries are suppressed in cashflow when loan has zero disbursement.',
    testInputs: 'TL-23-24-00002\ninterest - 10%',
    expectedResult: 'If no disbursement has occurred, penalty entries should not be displayed in cashflow.',
    actualResult: 'Penalty entries are not being displayed in cashflow.',
    status: 'pass',
    reviewStatus: 'Approved',
    version: '1.0',
    validationScenario: 'Pre-disbursement guard prevents premature penalty triggering.',
    additionalCoverage: 'Contract lifecycle state validation.',
    attachments: [
      { id: 'att-2', name: 'no_disbursement_gua...', url: '' }
    ],
  },
  {
    id: 'tc-21653-3',
    testCaseId: 'TC3',
    testModule: 'term loan',
    featureTab: 'penalty',
    testScenario: 'The overdue report should display the deal with penalty entries whenever overdue occurs.',
    preconditions: 'Financial Reports module configured with Overdue Report parameters.',
    testCases: 'Verify that overdue report correctly consolidates all overdue deals with active penalty flags.',
    testInputs: 'TL-23-24-00002\ninterest - 10%',
    expectedResult: 'The overdue report should display the deal with penalty entries whenever overdue occurs.',
    actualResult: 'The overdue report correctly displays the deal with penalty entries',
    status: 'pass',
    reviewStatus: 'Approved',
    version: '1.0',
    validationScenario: 'Overdue grid report reconciliation with staging cashflow table.',
    additionalCoverage: 'Audit export consistency verified.',
    attachments: [
      { id: 'att-3', name: 'overdue_grid_breakd...', url: '' },
      { id: 'att-4', name: 'exported_excel_audit...', url: '' }
    ],
  },
];

export const INITIAL_OBSERVATION_HEADER: import('../types').ObservationHeaderMeta = {
  ticketName: 'penalty overdue report',
  ticketNo: '21653',
  qaOwner: 'Maseera Sayyed',
  clientName: 'Treasury Master',
  date: new Date().toISOString().split('T')[0],
};

export const INITIAL_OBSERVATIONS: import('../types').ObservationItem[] = [
  {
    id: 'obs-init-1',
    serialNo: 'OBS-01',
    ticketId: '21653',
    ticketName: 'penalty overdue report',
    type: 'Observation',
    observationRFE: 'Cashflow penalty row calculation rounds off paise incorrectly on leap year dates.',
    status: 'Open',
    retesting: 1,
    remark: 'Observed during 29-Feb cycle test execution.',
    priority: 'High',
    reportedBy: 'Maseera Sayyed',
    createdDate: '2026-09-03',
    attachments: [],
  },
  {
    id: 'obs-init-2',
    serialNo: 'RFE-01',
    ticketId: '21653',
    ticketName: 'penalty overdue report',
    type: 'RFE',
    observationRFE: 'Provide automated toggle in Term Loan settings to waive penalty for government holiday grace days.',
    status: 'In Progress',
    retesting: 1,
    remark: 'Requested by Treasury Master team for RBI holiday adherence.',
    priority: 'Medium',
    reportedBy: 'Maseera Sayyed',
    createdDate: '2026-09-04',
    attachments: [],
  },
];

export const INITIAL_DEV_TEST_HEADER: import('../types').DeveloperTestHeaderMeta = {
  ticketNo: '21653',
  featureName: 'penalty overdue report',
  developer: 'Kunal Joshi',
  devTestDate: '2026-09-04',
  signOffBy: 'Ashwini poke',
  shaCommit: 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
};

export const INITIAL_DEV_TEST_ITEMS: import('../types').DeveloperTestItem[] = [
  {
    id: 'dev-1',
    scenarioId: 'DEV-01',
    scenario: 'Post-Disbursement Penalty Overdue Calculation',
    testDescription: '1. Create term loan with Principal ₹50,00,000.\n2. Disburse full amount.\n3. Advance system date by 15 days past repayment due date.\n4. Call penalty calculation endpoint.',
    testData: 'Principal: ₹50,00,000 | Overdue Days: 15 | Grace: 5 | Rate: 10%',
    expectedResult: 'Penalty interest and penalty principal calculated on overdue installment for 10 chargeable days.',
    actualResult: 'Net penalty ₹13,698.63 correctly posted to staging cashflow table.',
    status: 'Passed',
    attachments: [
      { id: 'dev-att-1', name: 'disbursement_cashflow_screen.png', url: '' },
      { id: 'dev-att-2', name: 'postgres_penalty_query.sql', url: '' },
    ],
    remarks: 'Disbursed deal verified on test database schema.',
  },
  {
    id: 'dev-2',
    scenarioId: 'DEV-02',
    scenario: 'Suppression of Penalty When Loan Not Disbursed',
    testDescription: '1. Create loan deal in Approved but Un-disbursed status.\n2. Force overdue flag trigger.\n3. Verify overdue report output.',
    testData: 'Deal ID: TL-24-0092 | Status: SANCTIONED | Disbursed: ₹0.00',
    expectedResult: 'Overdue report must suppress penalty rows when disbursement is zero.',
    actualResult: 'Zero penalty rows returned, HTTP 200 OK with empty array.',
    status: 'Passed',
    attachments: [
      { id: 'dev-att-3', name: 'undisbursed_suppress_check.png', url: '' },
    ],
    remarks: 'Pre-disbursement guard condition validated.',
  },
  {
    id: 'dev-3',
    scenarioId: 'DEV-03',
    scenario: 'Negative Penalty Percentage Value Validation',
    testDescription: '1. In penalty configuration form, enter -2.5% in Penalty Rate.\n2. Submit payload.',
    testData: 'penalty_interest_rate = -2.5',
    expectedResult: 'Backend validation rejects negative rate with 422 Unprocessable Entity.',
    actualResult: 'Validation error thrown: "Rate cannot be less than 0.00%".',
    status: 'Passed',
    attachments: [
      { id: 'dev-att-4', name: 'validation_error_screenshot.png', url: '' },
    ],
    remarks: 'Edge case handled in validation middleware.',
  },
  {
    id: 'dev-4',
    scenarioId: 'DEV-04',
    scenario: 'Leap Year Amortization February 29 Day Count',
    testDescription: '1. Set deal start date in Feb 2028 (leap year).\n2. Calculate interest accrual for February.',
    testData: 'Principal: ₹1,00,00,000 | Year: 2028 | Days: 29',
    expectedResult: 'Day count must be 29/366 under Actual/Actual convention.',
    actualResult: 'Interest computed on 29 days matching financial benchmark.',
    status: 'Passed with Limitations',
    attachments: [
      { id: 'dev-att-5', name: 'leap_year_amortization_log.txt', url: '' },
    ],
    remarks: 'Restructuring and moratorium periods were not tested.',
  },
];
