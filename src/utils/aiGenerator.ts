import {
  TicketSummary,
  DeveloperTestItem,
  TestCaseItem,
  ObservationItem,
  AiReviewSummary,
  AiReviewIssue,
  AttachedDocOrImage,
} from '../types';

/**
 * Normalized token generator to detect semantic and exact duplicates
 */
export function normalizeTextForDuplicateCheck(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\b(verify|check|test|testing|that|the|system|a|an|of|to|for|in|is|with|and|from|ensure|validate|case|scenario|point)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a candidate scenario is already covered in existing items
 */
export function checkIsDuplicate(
  candidateTitle: string,
  existingList: { scenario?: string; testingPoint?: string; testScenario?: string; testCaseId?: string; scenarioId?: string }[]
): { isDup: boolean; matchedWith?: string } {
  const normCand = normalizeTextForDuplicateCheck(candidateTitle);
  if (!normCand || normCand.length < 3) return { isDup: false };

  const candTokens = new Set(normCand.split(' ').filter((t) => t.length > 2));

  for (const item of existingList) {
    const existingTitle = item.testScenario || item.testingPoint || item.scenario || '';
    const normExisting = normalizeTextForDuplicateCheck(existingTitle);
    if (!normExisting) continue;

    // Exact normalized match
    if (normCand === normExisting) {
      const id = item.testCaseId || item.scenarioId || 'existing row';
      return { isDup: true, matchedWith: `${id}: "${existingTitle.slice(0, 50)}"` };
    }

    // Substring match if long enough
    if (normCand.length > 15 && normExisting.includes(normCand)) {
      const id = item.testCaseId || item.scenarioId || 'existing row';
      return { isDup: true, matchedWith: `${id}: "${existingTitle.slice(0, 50)}"` };
    }
    if (normExisting.length > 15 && normCand.includes(normExisting)) {
      const id = item.testCaseId || item.scenarioId || 'existing row';
      return { isDup: true, matchedWith: `${id}: "${existingTitle.slice(0, 50)}"` };
    }

    // Token overlap check (> 70% shared significant words)
    const existingTokens = normExisting.split(' ').filter((t) => t.length > 2);
    if (candTokens.size >= 3 && existingTokens.length >= 3) {
      let matchCount = 0;
      for (const t of existingTokens) {
        if (candTokens.has(t)) matchCount++;
      }
      const similarity = matchCount / Math.max(candTokens.size, existingTokens.length);
      if (similarity >= 0.72) {
        const id = item.testCaseId || item.scenarioId || 'existing row';
        return { isDup: true, matchedWith: `${id}: "${existingTitle.slice(0, 50)}"` };
      }
    }
  }

  return { isDup: false };
}

/**
 * Result structure for multi-scenario generation
 */
export interface GenerateMultiScenariosResult<T> {
  newItems: T[];
  skippedDuplicates: { scenario: string; matchedWith: string }[];
  totalCandidateCount: number;
}

/**
 * 1. Generate Developer Testing Expected Result & details from a single testing point line
 */
export function generateDevTestingFromPoint(
  testingPoint: string,
  ticketNo: string = '21653',
  dealId: string = 'DEAL-8841',
  devName: string = 'Developer'
): Partial<DeveloperTestItem> {
  const norm = testingPoint.trim();
  if (!norm) {
    return {
      testingPoint: '',
      expectedResult: '',
      scenario: '',
      testData: '',
    };
  }

  const lower = norm.toLowerCase();
  let expectedResult = '';
  let testData = '';
  let scenario = norm;

  if (lower.includes('rate') || lower.includes('index')) {
    expectedResult = 'Effective Rate is dynamically recalculated using the new Index Rate and updated on deal schedule without rounding discrepancies.';
    testData = 'Index Rate: 8.5%, Spread: 1.5%, Effective Rate: 10.0%';
  } else if (lower.includes('gstin') || lower.includes('fee') || lower.includes('tax')) {
    expectedResult = 'System restricts invalid GSTIN format during upload and displays clear validation error toast.';
    testData = 'Invalid GSTIN: 27AAAAA0000A1Z5, Fee Code: FEE_001';
  } else if (lower.includes('disbursement') || lower.includes('loan')) {
    expectedResult = 'Disbursement entry posts accurately to ledger; repayment schedule updates automatically.';
    testData = 'Principal Amount: 50,00,000, Disbursement Date: T-0';
  } else if (lower.includes('penalty') || lower.includes('overdue')) {
    expectedResult = 'Penalty interest is accrued daily after grace period expiry and reflected in cashflow schedule.';
    testData = 'Grace Period: 5 Days, Penalty Rate: 2.0% p.a.';
  } else if (lower.includes('export') || lower.includes('excel')) {
    expectedResult = 'Exported Excel file preserves column headers, numeric precision, and cell formatting.';
    testData = 'Format: .xlsx, Row Count: 500+ records';
  } else {
    expectedResult = `Verified successfully: ${norm.replace(/^verify\s+that\s+/i, '')} completes as expected without errors.`;
    testData = `Ticket: #${ticketNo}, Deal: ${dealId}`;
  }

  return {
    dealId: dealId || 'DEAL-8841',
    developerName: devName || 'Developer',
    testingPoint: norm,
    scenario: scenario,
    testDescription: `Developer pre-QA verification: ${norm}`,
    testData: testData,
    expectedResult: expectedResult,
    actualResult: 'Verified & passed in dev local workspace',
    status: 'Passed',
    submissionState: 'Draft',
    isAiGenerated: true,
  };
}

/**
 * 2. Generate Developer Testing Points from Azure DevOps ticket info
 */
export function generateDevTestingFromTicket(ticket: TicketSummary): DeveloperTestItem[] {
  const tNo = ticket.ticketNumber || '';
  const feature = ticket.featureName || 'Feature Verification';
  const dev = ticket.developer || '';
  const deal = ticket.dealId || `DEAL-${tNo}`;
  const desc = ticket.description || ticket.qaRequirementDoc || ticket.acceptanceCriteria || feature;

  const points: { point: string; expected: string; data: string }[] = [
    {
      point: `Verify core functional workflow for "${feature}" under Ticket #${tNo}`,
      expected: `System successfully processes ${feature} operations with valid payload data and commits changes without exception.`,
      data: `Ticket: #${tNo}, Module: ${ticket.moduleName}`,
    },
    {
      point: `Validate edge-case boundary inputs for "${feature}"`,
      expected: `System handles boundary conditions, null/empty values, and out-of-bound inputs gracefully with appropriate validation messages.`,
      data: `Inputs: Min/Max thresholds, Special chars`,
    },
    {
      point: `Verify database schema and state updates for Deal ${deal}`,
      expected: `Relevant DB tables update accurately; transactional logs record state transition cleanly.`,
      data: `Tables: ${ticket.dbTables?.join(', ') || 'Deal_Schedule, Ledger_Entries'}`,
    },
    {
      point: `Verify API endpoint responses and response codes for ${feature}`,
      expected: `Endpoints return HTTP 200 OK with correct JSON payload structure and performance under 300ms.`,
      data: `Endpoints: ${ticket.apiEndpoints?.join(', ') || 'GET/POST /api/v1/deals'}`,
    },
  ];

  return points.map((p, idx) => ({
    id: `dt-gen-${Date.now()}-${idx}`,
    scenarioId: `DEV-0${idx + 1}`,
    dealId: deal,
    developerName: dev,
    testingPoint: p.point,
    scenario: p.point,
    testDescription: `Unit test verification: ${p.point}`,
    testData: p.data,
    expectedResult: p.expected,
    actualResult: 'Verified successfully in local build environment',
    status: 'Passed',
    submissionState: 'Draft',
    remarks: 'Auto-generated from Azure DevOps ticket details',
    isAiGenerated: true,
    attachments: [],
  }));
}

/**
 * 3. One-Line AI Test Case Generation
 */
export function generateTestCaseFromOneLine(
  requirementLine: string,
  ticket?: TicketSummary,
  caseIndex: number = 1
): Partial<TestCaseItem> {
  const line = requirementLine.trim();
  if (!line) return {};

  const lower = line.toLowerCase();
  const tModule = ticket ? ticket.moduleName.toLowerCase() : 'term loan';
  const feature = ticket ? ticket.featureName.toLowerCase().split(' ')[0] : 'general';
  const tcId = `TC${caseIndex}`;

  let scenario = line;
  let steps = `1. Navigate to ${tModule} module in Beacon QA environment.\n2. Open the designated input form / upload section.\n3. Input the required scenario details: ${line.slice(0, 60)}.\n4. Click Submit / Process and verify outcome.`;
  let expected = `System executes the operation as expected, enforcing validation constraints and updating transaction logs.`;
  let validation = `Negative Validation: Attempting invalid/malformed inputs produces a clear validation message and prevents form submission.`;
  let additionalCoverage = `Boundary & Bulk Impact: Verified behavior across min/max boundary values and batch processing.`;
  let inputs = `Module: ${tModule}\nRequirement: ${line.slice(0, 45)}`;

  if (lower.includes('gstin') || lower.includes('fee')) {
    scenario = `Verify restriction of invalid GSTIN details during Fees upload`;
    steps = `1. Open Fees Upload module.\n2. Upload file containing invalid GSTIN format (e.g. 27AAAAA0000A1Z5).\n3. Click Validate File.\n4. Verify error reporting.`;
    expected = `Invalid GSTIN records are flagged with clear validation errors; upload process blocks corrupted fee entries.`;
    validation = `Validation Scenario: Valid GSTIN records upload cleanly while invalid GSTINs are isolated in error report.`;
    additionalCoverage = `Bulk Impact: Multi-row Excel fee upload with mixed valid and invalid GSTIN rows.`;
    inputs = `Invalid GSTIN: 27AAAAA0000A1Z5\nFee Code: FEE_UPLOAD_01`;
  } else if (lower.includes('rate') || lower.includes('index')) {
    scenario = `Verify that changing the Index Rate updates the Effective Rate across deal schedules`;
    steps = `1. Select active deal.\n2. Modify Index Rate from 8.0% to 8.5%.\n3. Trigger rate recalculation job.\n4. Inspect deal cashflow schedule.`;
    expected = `Effective Rate recalculates automatically (Index Rate + Spread) and updates future cashflow schedule lines.`;
    validation = `Validation Scenario: Zero or negative index rate inputs trigger boundary validation errors.`;
    additionalCoverage = `Existing Functionality Impact: Historical interest accrual entries remain untouched.`;
    inputs = `Old Index Rate: 8.0%\nNew Index Rate: 8.5%\nSpread: 1.5%`;
  }

  return {
    testCaseId: tcId,
    testModule: tModule,
    featureTab: feature,
    testScenario: scenario,
    testCases: steps,
    testInputs: inputs,
    expectedResult: expected,
    validationScenario: validation,
    additionalCoverage: additionalCoverage,
    actualResult: 'Pending execution',
    status: 'not run',
    reviewStatus: 'Draft',
    isAiGenerated: true,
  };
}

/**
 * 4. AI Review of QA Test Cases against linked Azure DevOps ticket
 */
export function aiReviewTestCases(
  testCases: TestCaseItem[],
  ticket?: TicketSummary
): AiReviewSummary {
  const total = testCases.length;
  if (total === 0) {
    return {
      ticketId: ticket?.ticketNumber || '21653',
      totalReviewed: 0,
      goodCount: 0,
      duplicateCount: 0,
      missingValidationCount: 0,
      issues: [],
      reviewedAt: new Date().toISOString(),
    };
  }

  const issues: AiReviewIssue[] = [];
  let goodCount = 0;
  let duplicateCount = 0;
  let missingValidationCount = 0;

  const seenScenarios = new Set<string>();

  testCases.forEach((tc, idx) => {
    const scenarioNorm = tc.testScenario.trim().toLowerCase();
    let hasIssue = false;

    // 1. Duplicate check
    if (seenScenarios.has(scenarioNorm)) {
      duplicateCount++;
      hasIssue = true;
      issues.push({
        id: `rev-dup-${tc.id}`,
        testCaseId: tc.testCaseId,
        type: 'Duplicate',
        title: `Duplicate Test Scenario in ${tc.testCaseId}`,
        suggestion: `Test case "${tc.testCaseId}" duplicates scenario "${tc.testScenario.slice(0, 40)}...". Merge or differentiate test inputs.`,
      });
    } else {
      seenScenarios.add(scenarioNorm);
    }

    // 2. Negative / Validation scenario check
    const isNegativeOrValidation =
      scenarioNorm.includes('invalid') ||
      scenarioNorm.includes('restrict') ||
      scenarioNorm.includes('error') ||
      scenarioNorm.includes('boundary') ||
      scenarioNorm.includes('negative') ||
      tc.testCases.toLowerCase().includes('invalid');

    if (!isNegativeOrValidation && idx === total - 1 && missingValidationCount === 0) {
      missingValidationCount++;
      hasIssue = true;
      issues.push({
        id: `rev-val-${tc.id}`,
        testCaseId: tc.testCaseId,
        type: 'Missing Scenario',
        title: 'Missing Validation / Negative Scenario',
        suggestion: `Consider adding negative testing for invalid input parameters or boundary limits on ticket requirements.`,
      });
    }

    // 3. Expected Result Clarity check
    if (!tc.expectedResult || tc.expectedResult.trim().length < 15) {
      hasIssue = true;
      issues.push({
        id: `rev-clarity-${tc.id}`,
        testCaseId: tc.testCaseId,
        type: 'Expected Result Clarity',
        title: `Vague Expected Result in ${tc.testCaseId}`,
        suggestion: `Elaborate the expected outcome to specify exact system output, database state, or UI feedback.`,
      });
    }

    if (!hasIssue) {
      goodCount++;
    }
  });

  return {
    ticketId: ticket?.ticketNumber || '21653',
    totalReviewed: total,
    goodCount: Math.max(goodCount, total - issues.length),
    duplicateCount,
    missingValidationCount,
    issues,
    reviewedAt: new Date().toISOString(),
  };
}

/**
 * 5. Comprehensive AI Test Case Generation for a Ticket
 */
export function generateComprehensiveTestCasesForTicket(
  ticketOrId: TicketSummary | string,
  count: number = 4
): TestCaseItem[] {
  const isTicketObj = typeof ticketOrId === 'object' && ticketOrId !== null;
  const tNo = isTicketObj ? ticketOrId.ticketNumber : (ticketOrId || '21653');
  const feature = isTicketObj ? ticketOrId.featureName : 'Financial Transaction Processing';
  const mod = isTicketObj ? (ticketOrId.moduleName || 'Term Loan').toLowerCase() : 'term loan';
  const client = isTicketObj ? (ticketOrId.clientName || 'Treasury Master') : 'Treasury Master';

  const templates = [
    {
      scenario: `Positive Path: ${feature} standard workflow and ledger settlement`,
      steps: `1. Log in to Beacon QA portal with authorized credentials.\n2. Navigate to ${mod} module.\n3. Search and select Deal ID linked to Ticket #${tNo}.\n4. Execute ${feature} action with standard required parameters.\n5. Confirm transaction submission and check ledger update.`,
      inputs: `Deal Ref: DL-${tNo}-001\nModule: ${mod}\nAction: Execute ${feature}\nClient: ${client}`,
      expected: `Operation completes successfully with HTTP 200/201. Deal status updates, schedule reflects transaction, and ledger voucher is created cleanly.`,
      actual: `Pending execution`,
      validation: `Positive baseline execution conforms to specification and database integrity constraints.`,
      coverage: `Functional Core: Validates core happy-path flow under standard operational conditions.`,
      status: 'not run' as const,
    },
    {
      scenario: `Negative Validation: Restrict invalid or duplicate parameters in ${feature}`,
      steps: `1. Open ${mod} entry form for Ticket #${tNo}.\n2. Input corrupted/out-of-range parameters (e.g. negative amount, past dates, duplicate transaction reference).\n3. Attempt to save / post deal.\n4. Inspect system rejection and error toast message.`,
      inputs: `Invalid Amount: -50,000 / Zero\nDuplicate Ref: REF-${tNo}-DUP\nInvalid Rate: -2.5%`,
      expected: `System restricts operation with clear validation messages. Prevents corrupted data persistence and does not commit incomplete vouchers.`,
      actual: `Pending execution`,
      validation: `Negative Validation: Boundary & constraint check prevents erroneous posting.`,
      coverage: `Defensive Security: Guards against improper user input and duplicate state mutation.`,
      status: 'not run' as const,
    },
    {
      scenario: `Boundary & Leap Year / Grace Period handling for ${feature}`,
      steps: `1. Select active contract under ${mod}.\n2. Configure boundary condition (e.g. grace period expiry at 23:59:59 or leap year day count 29-Feb).\n3. Advance batch cycle date.\n4. Verify calculation logic and rounding of decimal fractions.`,
      inputs: `Calculation Date: 2028-02-29 (Leap Year)\nGrace Period: 5 Days (Boundary T+5)\nDay Count: Actual/365 vs Actual/Actual`,
      expected: `Calculations execute with high precision, applying appropriate grace period rules and leap year conventions without discrepancy.`,
      actual: `Pending execution`,
      validation: `Boundary Condition: Edge threshold behaves deterministically without off-by-one errors.`,
      coverage: `Financial Accuracy: Verifies day count and amortization accuracy.`,
      status: 'not run' as const,
    },
    {
      scenario: `Reporting & Export: Ensure ${feature} appears in Excel and Audit Trail`,
      steps: `1. Navigate to Reports / Audit Trail for ${mod}.\n2. Filter by Ticket #${tNo} / Deal ID.\n3. Verify UI grid columns matching transactional attributes.\n4. Export to Formatted Excel (.xlsx) and inspect downloaded dataset.`,
      inputs: `Export Format: Formatted Excel (.xlsx)\nFilter Criteria: Ticket #${tNo}\nRecords: Multi-row audit log`,
      expected: `Exported Excel accurately matches screen data, with proper column headers, cell types (currency, dates), and no missing rows.`,
      actual: `Pending execution`,
      validation: `Audit Compliance: Data consistency between database, UI table, and downloaded Excel artifact.`,
      coverage: `Reporting & Compliance: Guarantees audit readiness for external regulators and senior sign-off.`,
      status: 'not run' as const,
    },
  ];

  return templates.slice(0, count).map((tpl, i) => ({
    id: `ai-tc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
    testCaseId: `TC${i + 1}`,
    testModule: mod,
    featureTab: feature.toLowerCase().split(' ')[0] || 'general',
    testScenario: tpl.scenario,
    testCases: tpl.steps,
    testInputs: tpl.inputs,
    expectedResult: tpl.expected,
    actualResult: tpl.actual,
    status: tpl.status,
    validationScenario: tpl.validation,
    additionalCoverage: tpl.coverage,
    reviewStatus: 'Draft',
    version: '1.0',
    attachments: [],
    isAiGenerated: true,
  }));
}

/**
 * 6. Auto-Generate All Fields for "Test Case Solution & Steps" Modal (Image 3)
 */
export function generateTestCaseFieldsWithAi(
  promptOrScenario: string,
  ticket?: TicketSummary
): {
  scenario: string;
  preconditions: string;
  steps: string;
  inputs: string;
  expectedResult: string;
} {
  const norm = (promptOrScenario || ticket?.featureName || 'Penalty and Overdue processing').trim();
  const lower = norm.toLowerCase();
  const tNo = ticket?.ticketNumber || '21653';
  const mod = ticket?.moduleName || 'Term Loan';

  if (lower.includes('penalty') || lower.includes('overdue') || lower.includes('cashflow')) {
    return {
      scenario: 'Penalty entries appear in the cashflow when overdue occurs after loan disbursement.',
      preconditions: 'Financial module setup, active disbursed loan deal, and authorized QA user permissions available.',
      steps: 'Verify that penalty is applied and displayed in cashflow when interest or principal becomes overdue after disbursement.\n1. Open Term Loan active deal.\n2. Verify loan disbursement status is posted.\n3. Advance due date past overdue threshold.\n4. Check cashflow generation table.',
      inputs: `TL-23-24-00001\npenalty interest - 10%\npenalty principal - 10%\nGrace Days - 5`,
      expectedResult: 'The cashflow should display the deal with penalty entries whenever overdue occurs on interest or principal after loan disbursement.',
    };
  }

  if (lower.includes('gstin') || lower.includes('fee') || lower.includes('tax')) {
    return {
      scenario: `Verify strict restriction of invalid GSTIN and tax format during fee ingestion for Ticket #${tNo}`,
      preconditions: `Beacon Core Fees module configured with Master Tax configuration enabled.`,
      steps: `1. Navigate to Fees & Charges management screen.\n2. Attempt upload with malformed GSTIN (e.g. length != 15 or invalid state code).\n3. Click Validate & Save.\n4. Verify system notification and audit log.`,
      inputs: `Invalid GSTIN: 27AAAAA0000A1Z5\nFee Code: FEE_PROCESSING_01\nTax Rate: 18.0% GST`,
      expectedResult: `System flags invalid GSTIN with clear validation message, blocks transaction commit, and keeps previous state intact.`,
    };
  }

  if (lower.includes('rate') || lower.includes('interest') || lower.includes('index')) {
    return {
      scenario: `Verify automatic index rate reset and recalculation of amortization schedule for Ticket #${tNo}`,
      preconditions: `Market index rate benchmark linked to floating rate loan facility in ${mod}.`,
      steps: `1. Select active floating-rate loan contract.\n2. Input new benchmark index rate value.\n3. Trigger rate reset scheduler job.\n4. Inspect recalculated interest installments in deal schedule.`,
      inputs: `Old Benchmark: 7.50%\nNew Benchmark: 8.25%\nSpread: 1.75%\nEffective: 10.00%`,
      expectedResult: `Amortization schedule dynamically recalculates future coupon cashflows without affecting historical finalized installments.`,
    };
  }

  // General high-quality financial default
  return {
    scenario: norm.startsWith('Verify') ? norm : `Verify that ${norm}`,
    preconditions: `Active ${mod} configuration, test database seeded, and user role with QA write privileges.`,
    steps: `1. Navigate to ${mod} in Beacon QA workspace.\n2. Open the designated interface for Ticket #${tNo}.\n3. Enter verified test payload data.\n4. Execute the operation and verify response status, UI rendering, and database state.`,
    inputs: `Ticket: #${tNo}\nModule: ${mod}\nDeal Ref: DL-${tNo}-01\nParameters: Default staging payload`,
    expectedResult: `Operation succeeds without exceptions. Relevant tables update accurately, and UI displays clear confirmation status.`,
  };
}

/**
 * 7. Parse Quick Paste Solution from Clipboard (Ctrl+V)
 */
export function parseQuickPasteSolution(rawText: string): {
  scenario?: string;
  preconditions?: string;
  steps?: string;
  inputs?: string;
  expectedResult?: string;
} {
  if (!rawText.trim()) return {};

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  let scenario = '';
  let preconditions = '';
  let steps = '';
  let inputs = '';
  let expectedResult = '';

  let currentSection: 'none' | 'scenario' | 'preconditions' | 'steps' | 'inputs' | 'expected' = 'none';

  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.startsWith('scenario:') || l.startsWith('test scenario:')) {
      currentSection = 'scenario';
      scenario = line.replace(/^(scenario|test scenario):/i, '').trim();
    } else if (l.startsWith('preconditions:') || l.startsWith('precondition:')) {
      currentSection = 'preconditions';
      preconditions = line.replace(/^preconditions?:/i, '').trim();
    } else if (l.startsWith('steps:') || l.startsWith('test steps:') || l.startsWith('steps to reproduce:')) {
      currentSection = 'steps';
      steps = line.replace(/^(steps|test steps|steps to reproduce):/i, '').trim();
    } else if (l.startsWith('inputs:') || l.startsWith('test inputs:') || l.startsWith('test data:') || l.startsWith('data:')) {
      currentSection = 'inputs';
      inputs = line.replace(/^(inputs|test inputs|test data|data):/i, '').trim();
    } else if (l.startsWith('expected:') || l.startsWith('expected result:') || l.startsWith('expected outcome:')) {
      currentSection = 'expected';
      expectedResult = line.replace(/^(expected|expected result|expected outcome):/i, '').trim();
    } else {
      // Append to current section
      if (currentSection === 'scenario') {
        scenario += (scenario ? ' ' : '') + line;
      } else if (currentSection === 'preconditions') {
        preconditions += (preconditions ? '\n' : '') + line;
      } else if (currentSection === 'steps') {
        steps += (steps ? '\n' : '') + line;
      } else if (currentSection === 'inputs') {
        inputs += (inputs ? '\n' : '') + line;
      } else if (currentSection === 'expected') {
        expectedResult += (expectedResult ? ' ' : '') + line;
      } else {
        // Default first line if no header
        if (!scenario) scenario = line;
        else steps += (steps ? '\n' : '') + line;
      }
    }
  }

  return {
    scenario: scenario || undefined,
    preconditions: preconditions || undefined,
    steps: steps || undefined,
    inputs: inputs || undefined,
    expectedResult: expectedResult || undefined,
  };
}

/**
 * 8. AI Generator for Observations & RFEs (Unified Module)
 */
export function generateObservationsAndRfEsForTicket(
  ticketOrId: TicketSummary | string,
  featureFallback?: string,
  count: number = 4
): ObservationItem[] {
  const isTicketObj = typeof ticketOrId === 'object' && ticketOrId !== null;
  const tNo: string = isTicketObj ? ticketOrId.ticketNumber : (typeof ticketOrId === 'string' ? ticketOrId : '21653');
  const feature: string = isTicketObj ? ticketOrId.featureName : (featureFallback || 'Transaction Module');
  const qa: string = isTicketObj ? ticketOrId.qaAssignee : 'Maseera Sayyed';
  const modName: string = isTicketObj ? ticketOrId.moduleName : 'Financial Module';

  const templates: {
    type: 'Observation' | 'RFE';
    text: string;
    remark: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
  }[] = [
    {
      type: 'Observation',
      text: `In ${feature}, decimal rounding discrepancy of ±0.02 paise observed during bulk calculation for Ticket #${tNo}.`,
      remark: `Discrepancy occurs on deals with non-monthly amortization compounding.`,
      priority: 'High',
    },
    {
      type: 'Observation',
      text: `UI table header horizontally misaligned when scrolling with more than 15 columns in ${modName}.`,
      remark: `Sticky header offset causes column mismatch on Safari / Chrome zoomed view.`,
      priority: 'Medium',
    },
    {
      type: 'RFE',
      text: `Provide quick batch action button to bulk-recalculate penalty entries across filtered deal rows in #${tNo}.`,
      remark: `Requested by Operations team to avoid opening each deal individually.`,
      priority: 'High',
    },
    {
      type: 'RFE',
      text: `Add configurable grace period exemption toggle for statutory national banking holidays.`,
      remark: `Enhancement to automatically suppress penalty accrual on closed settlement dates.`,
      priority: 'Medium',
    },
    {
      type: 'Observation',
      text: `Export to Excel retains stale cached filters if user navigates away and returns within same session.`,
      remark: `Need to clear memory filter buffer upon ticket reload.`,
      priority: 'Low',
    },
  ];

  return templates.slice(0, count).map((item, idx) => ({
    id: `obs-rfe-${Date.now()}-${idx}`,
    serialNo: item.type === 'Observation' ? `OBS-0${idx + 1}` : `RFE-0${idx + 1}`,
    ticketId: tNo,
    ticketName: feature,
    type: item.type,
    observationRFE: item.text,
    status: 'Open',
    retesting: 1,
    remark: item.remark,
    priority: item.priority,
    reportedBy: qa,
    createdDate: new Date().toISOString().split('T')[0],
    attachments: [],
  }));
}

/**
 * 9. AI Generator for Ticket Details & Acceptance Criteria
 */
export function generateTicketDetailsWithAi(
  title: string,
  moduleName: string
): {
  suggestedTitle?: string;
  description: string;
  acceptanceCriteria: string;
  testingScenarios: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
} {
  const norm = title.trim();
  const lower = norm.toLowerCase();
  let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';

  if (lower.includes('critical') || lower.includes('crash') || lower.includes('penalty')) {
    priority = 'Critical';
  } else if (lower.includes('report') || lower.includes('export') || lower.includes('ui')) {
    priority = 'Medium';
  }

  return {
    suggestedTitle: norm,
    description: `Implement and verify ${norm} within the ${moduleName} module. Ensures business rules, mathematical precision, database consistency, and UI state synchronization.`,
    acceptanceCriteria: `1. Successful execution and persistence of ${norm} under valid inputs.\n2. Clear error validation for boundary limits, empty inputs, and duplicate payloads.\n3. Audit log tracking and synchronization with core accounting & cashflow schedules.\n4. Clean export support to Formatted Excel (.xlsx).`,
    testingScenarios: `Positive Happy Path Workflow; Boundary Threshold Tests (Min/Max values); Negative Validation (Malformed data); Leap Year / Holiday Accrual; Audit Report Export Consistency.`,
    priority,
  };
}

/**
 * 10. Multi-Scenario Generator using Description, Testing Scenarios, Attached Files / Screenshots & Fields
 * Supports both Developer Testing and QA Test Cases, with strict duplicate detection.
 */
export function generateScenariosFromInputsAndFiles(params: {
  ticket?: TicketSummary;
  description?: string;
  testingScenarios?: string;
  attachedDocs?: AttachedDocOrImage[];
  screenFields?: string[];
  targetMode: 'qa' | 'developer';
  existingItems: (TestCaseItem | DeveloperTestItem)[];
  creatorName?: string;
  creatorRole?: string;
}): GenerateMultiScenariosResult<any> {
  const {
    ticket,
    description = '',
    testingScenarios = '',
    attachedDocs = [],
    screenFields = [],
    targetMode,
    existingItems = [],
    creatorName,
    creatorRole,
  } = params;

  const tNo = ticket?.ticketNumber || '';
  const feature = ticket?.featureName || 'Financial Feature';
  const mod = ticket?.moduleName || 'Term Loan';
  const dev = ticket?.developer || '';
  const qa = ticket?.qaAssignee || 'Maseera Sayyed';
  const dealId = ticket?.dealId || `DEAL-${tNo}`;

  // 1. Gather all fields from screenFields, attached docs, and default financial domain
  const aggregatedFields = new Set<string>(screenFields);
  attachedDocs.forEach((doc) => {
    (doc.detectedFields || []).forEach((f) => aggregatedFields.add(f));
  });

  // If no fields yet, detect from description or provide sensible domain defaults
  if (aggregatedFields.size === 0) {
    if (description.toLowerCase().includes('rate') || feature.toLowerCase().includes('rate')) {
      ['Deal ID', 'Index Rate', 'Spread %', 'Effective Rate', 'Reset Date'].forEach((f) => aggregatedFields.add(f));
    } else if (description.toLowerCase().includes('penalty') || feature.toLowerCase().includes('penalty')) {
      ['Deal ID', 'Overdue Amount', 'Penalty Rate %', 'Grace Period Days', 'Accrual Date'].forEach((f) => aggregatedFields.add(f));
    } else if (description.toLowerCase().includes('disburse') || feature.toLowerCase().includes('disburse')) {
      ['Deal ID', 'Sanction Ref', 'Disbursement Amount', 'Value Date', 'Tenor Months'].forEach((f) => aggregatedFields.add(f));
    } else {
      ['Deal ID', 'Principal Amount', 'Value Date', 'Status', 'Sanction Ref'].forEach((f) => aggregatedFields.add(f));
    }
  }

  const fieldsList = Array.from(aggregatedFields);
  const fieldsStr = fieldsList.join(', ');

  // 2. Extract testing points from user testingScenarios (split by semicolon, newline, numbered list)
  const explicitPoints: string[] = [];
  if (testingScenarios.trim()) {
    const rawTokens = testingScenarios
      .split(/[;\n]/)
      .map((s) => s.replace(/^[-*•\d.)]+\s*/, '').trim())
      .filter((s) => s.length > 4);
    explicitPoints.push(...rawTokens);
  }

  // 3. Extract points from description if available
  if (description.trim()) {
    const sentences = description
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && !explicitPoints.some((p) => p.toLowerCase().includes(s.toLowerCase().slice(0, 20))));
    sentences.forEach((s) => {
      if (explicitPoints.length < 6) explicitPoints.push(s);
    });
  }

  // 4. Extract points from attached documents / screenshots
  attachedDocs.forEach((doc) => {
    if (doc.type === 'image') {
      explicitPoints.push(`Verify UI screen fields rendering and active state for: [${(doc.detectedFields || fieldsList).slice(0, 4).join(', ')}] based on attached screenshot ${doc.name}`);
    } else if (doc.type === 'excel' && doc.extractedContent) {
      explicitPoints.push(`Verify bulk data ingestion and column mapping for [${fieldsList.slice(0, 4).join(', ')}] from attached Excel ${doc.name}`);
    } else if (doc.extractedContent) {
      explicitPoints.push(`Verify business logic specification constraints from attached doc ${doc.name}`);
    }
  });

  // 5. If points are still minimal (e.g. user only attached a file or fields), generate field-driven scenarios
  if (explicitPoints.length === 0) {
    explicitPoints.push(
      `Positive validation: Successful record creation and processing with all valid fields [${fieldsList.slice(0, 4).join(', ')}]`,
      `Mandatory field restriction: Prevent submission when mandatory fields [${fieldsList[0] || 'Deal ID'}, ${fieldsList[1] || 'Amount'}] are empty`,
      `Format and boundary validation: Validate numeric and date limits on [${fieldsList.slice(1, 4).join(', ')}]`,
      `Negative validation: Attempt submission with invalid or malformed data in [${fieldsList[0] || 'Deal ID'}]`,
      `Audit log & Formatted Excel export: Confirm all screen fields [${fieldsList.slice(0, 4).join(', ')}] appear accurately in audit schedule`
    );
  } else {
    // Add complementary negative & boundary checks for high QA coverage
    if (!explicitPoints.some((p) => p.toLowerCase().includes('negative') || p.toLowerCase().includes('invalid') || p.toLowerCase().includes('restrict'))) {
      explicitPoints.push(`Negative Validation: Attempt operation with invalid parameters and verify error alert toast on [${fieldsList.slice(0, 3).join(', ')}]`);
    }
    if (!explicitPoints.some((p) => p.toLowerCase().includes('boundary') || p.toLowerCase().includes('limit') || p.toLowerCase().includes('threshold'))) {
      explicitPoints.push(`Boundary & Edge Case: Verify minimum and maximum thresholds on [${fieldsList.slice(0, 3).join(', ')}]`);
    }
  }

  // 6. Build candidate scenarios
  const skippedDuplicates: { scenario: string; matchedWith: string }[] = [];
  const newItems: any[] = [];
  let candidateIndex = 0;

  for (const rawPoint of explicitPoints) {
    candidateIndex++;
    const pointClean = rawPoint.trim();
    if (!pointClean) continue;

    // Check duplicate against existing items in current table
    const dupCheck = checkIsDuplicate(pointClean, existingItems);
    if (dupCheck.isDup) {
      skippedDuplicates.push({
        scenario: pointClean,
        matchedWith: dupCheck.matchedWith || 'Existing row in table',
      });
      continue;
    }

    // Check duplicate against already accepted new items in this batch
    const batchDupCheck = checkIsDuplicate(pointClean, newItems);
    if (batchDupCheck.isDup) {
      skippedDuplicates.push({
        scenario: pointClean,
        matchedWith: batchDupCheck.matchedWith || 'Another scenario in this generated batch',
      });
      continue;
    }

    if (targetMode === 'developer') {
      // Create DeveloperTestItem
      const isNeg = pointClean.toLowerCase().includes('invalid') || pointClean.toLowerCase().includes('restrict') || pointClean.toLowerCase().includes('negative');
      const isBoundary = pointClean.toLowerCase().includes('boundary') || pointClean.toLowerCase().includes('limit');

      let expResult = '';
      if (isNeg) {
        expResult = `System restricts invalid input with HTTP 400 Bad Request and validation toast; database state remains unaltered.`;
      } else if (isBoundary) {
        expResult = `System enforces upper/lower boundary thresholds with exact rounding precision and no integer overflow.`;
      } else {
        expResult = `System executes ${pointClean.replace(/^verify\s+/i, '')} successfully, committing transactional logs and returning HTTP 200 OK.`;
      }

      const devItem: DeveloperTestItem = {
        id: `dt-gen-${Date.now()}-${candidateIndex}-${Math.random().toString(36).substring(2, 6)}`,
        scenarioId: `DEV-0${existingItems.length + newItems.length + 1}`,
        dealId: dealId,
        developerName: dev,
        testingPoint: pointClean.startsWith('Verify') ? pointClean : `Verify that ${pointClean}`,
        scenario: pointClean,
        testDescription: `Pre-QA Developer Unit/Integration Check: ${pointClean}`,
        testData: `Fields: ${fieldsList.slice(0, 3).join(', ')} | Payload: Valid mock test data | Ticket: #${tNo}`,
        expectedResult: expResult,
        actualResult: 'Verified & passed in developer test environment',
        status: 'Passed',
        submissionState: 'Draft',
        remarks: 'AI generated from ticket description, scenarios & attached fields',
        isAiGenerated: true,
        attachments: [],
        createdBy: creatorName,
        authorRole: creatorRole,
        createdAt: new Date().toLocaleDateString(),
      };
      newItems.push(devItem);
    } else {
      // Create TestCaseItem (QA)
      const isNeg = pointClean.toLowerCase().includes('invalid') || pointClean.toLowerCase().includes('restrict') || pointClean.toLowerCase().includes('negative') || pointClean.toLowerCase().includes('prevent');
      const isBoundary = pointClean.toLowerCase().includes('boundary') || pointClean.toLowerCase().includes('limit') || pointClean.toLowerCase().includes('threshold') || pointClean.toLowerCase().includes('leap');
      const isReport = pointClean.toLowerCase().includes('report') || pointClean.toLowerCase().includes('excel') || pointClean.toLowerCase().includes('export') || pointClean.toLowerCase().includes('audit');

      let stepText = '';
      let expResult = '';
      let validationText = '';
      let addlCoverage = '';

      if (isNeg) {
        stepText = `1. Navigate to ${mod} screen for Ticket #${tNo}.\n2. Input invalid/malformed parameters into [${fieldsList.slice(0, 3).join(', ')}].\n3. Click Save / Submit.\n4. Verify application error response.`;
        expResult = `System blocks form submission, highlights offending fields in red, and presents clear validation alert without persisting corrupted records.`;
        validationText = `Negative Validation: Confirms system rejects invalid syntax, special characters, and out-of-bounds parameters.`;
        addlCoverage = `Security & Integrity: Protects against corrupted DB writes and unhandled 500 exceptions.`;
      } else if (isBoundary) {
        stepText = `1. Open deal contract in ${mod}.\n2. Enter boundary boundary parameters (e.g. min allowed amount, max rate, grace period limit).\n3. Trigger calculation / state transition.\n4. Verify calculation result.`;
        expResult = `Calculations execute with standard mathematical precision without off-by-one errors or truncation discrepancies.`;
        validationText = `Boundary Value Analysis: Verifies edge limits [min, max, exact threshold] behave deterministically.`;
        addlCoverage = `Financial Accuracy: Guarantees zero decimal variance across interest & amortization schedules.`;
      } else if (isReport) {
        stepText = `1. Navigate to Reports / Audit Log screen in ${mod}.\n2. Filter by Ticket #${tNo} and fields [${fieldsList.slice(0, 2).join(', ')}].\n3. Click Export to Excel (.xlsx).\n4. Inspect generated spreadsheet columns and values.`;
        expResult = `Exported Excel sheet precisely matches grid columns [${fieldsList.slice(0, 4).join(', ')}], preserving numeric and date cell formats.`;
        validationText = `Data Consistency: Validates UI view matches exported Excel workbook with 100% data fidelity.`;
        addlCoverage = `Audit Readiness: Ensures external compliance and reporting datasets remain intact.`;
      } else {
        stepText = `1. Log in to Beacon QA portal with authorized QA role.\n2. Navigate to ${mod} module > ${feature}.\n3. Fill in screen fields: [${fieldsList.slice(0, 4).join(', ')}] with verified test values.\n4. Submit transaction and verify confirmation.`;
        expResult = `Transaction executes cleanly with confirmation message. All fields [${fieldsList.slice(0, 3).join(', ')}] persist to database, and UI updates state without page reload.`;
        validationText = `Positive Baseline: Standard operational workflow completes according to Azure DevOps specification.`;
        addlCoverage = `Core Flow: Validates end-to-end user journey across web client, API layer, and database.`;
      }

      const qaItem: TestCaseItem = {
        id: `ai-tc-${Date.now()}-${candidateIndex}-${Math.random().toString(36).substring(2, 6)}`,
        testCaseId: `TC0${existingItems.length + newItems.length + 1}`,
        testModule: mod,
        featureTab: feature.toLowerCase().split(' ')[0] || 'general',
        testScenario: pointClean.startsWith('Verify') ? pointClean : `Verify that ${pointClean}`,
        testCases: stepText,
        testInputs: `Screen Fields: ${fieldsList.slice(0, 4).join(', ')}\nTicket: #${tNo}\nModule: ${mod}`,
        expectedResult: expResult,
        actualResult: 'Pending execution',
        status: 'not run',
        validationScenario: validationText,
        additionalCoverage: addlCoverage,
        reviewStatus: 'Draft',
        version: '1.0',
        attachments: [],
        isAiGenerated: true,
        createdBy: creatorName,
        authorRole: creatorRole,
        createdAt: new Date().toLocaleDateString(),
      };
      newItems.push(qaItem);
    }
  }

  return {
    newItems,
    skippedDuplicates,
    totalCandidateCount: explicitPoints.length,
  };
}

/**
 * Detailed QA Review Output
 */
export interface DetailedAiQaReviewResult {
  ticketId: string;
  totalReviewed: number;
  coverageScore: number; // 0 - 100%
  healthRating: 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical Gaps';
  coveredRequirements: string[];
  whatIsRequired: string[];
  whatShouldBeAdded: string[];
  missingRequiredScenarios: {
    category: 'Edge Case' | 'Security / RBAC' | 'Validation / Negative' | 'Calculation' | 'Concurrency / Batch';
    title: string;
    details: string;
  }[];
  recommendedTestCasesToAdd: TestCaseItem[];
  duplicateOrRedundantCases: {
    testCaseId: string;
    scenario: string;
    reason: string;
  }[];
  reviewedBy?: string;
  reviewedAt: string;
}

/**
 * 11. Comprehensive AI Test Cases Review for QA Testing Review Center
 * Analyzes current test cases and attached Excel/Word file, produces deep coverage audit & recommended additions.
 */
export function reviewTestCasesComprehensive(
  testCases: TestCaseItem[],
  ticket?: TicketSummary,
  attachedDocName?: string,
  reviewerName: string = 'Senior QA'
): DetailedAiQaReviewResult {
  const tNo = ticket?.ticketNumber || '21653';
  const feature = ticket?.featureName || 'Financial Feature';
  const mod = ticket?.moduleName || 'Term Loan';
  const total = testCases.length;

  const coveredRequirements: string[] = [];
  const whatIsRequired: string[] = [];
  const whatShouldBeAdded: string[] = [];
  const missingRequiredScenarios: DetailedAiQaReviewResult['missingRequiredScenarios'] = [];
  const duplicateOrRedundantCases: DetailedAiQaReviewResult['duplicateOrRedundantCases'] = [];
  const recommendedTestCasesToAdd: TestCaseItem[] = [];

  // 1. Check for duplicates in the suite
  const seen = new Map<string, string>();
  testCases.forEach((tc) => {
    const norm = normalizeTextForDuplicateCheck(tc.testScenario);
    if (seen.has(norm)) {
      duplicateOrRedundantCases.push({
        testCaseId: tc.testCaseId,
        scenario: tc.testScenario,
        reason: `Overlaps directly with already recorded test case ${seen.get(norm)}. Recommend merging test steps or differentiating test inputs.`,
      });
    } else {
      seen.set(norm, tc.testCaseId);
    }
  });

  // 2. Analyze Coverage Categories
  const hasPositive = testCases.some((c) => {
    const s = (c.testScenario + ' ' + c.testCases).toLowerCase();
    return s.includes('positive') || s.includes('standard') || s.includes('success') || s.includes('happy');
  });

  const hasNegative = testCases.some((c) => {
    const s = (c.testScenario + ' ' + c.testCases).toLowerCase();
    return s.includes('invalid') || s.includes('negative') || s.includes('restrict') || s.includes('error') || s.includes('prevent');
  });

  const hasBoundary = testCases.some((c) => {
    const s = (c.testScenario + ' ' + c.testCases).toLowerCase();
    return s.includes('boundary') || s.includes('limit') || s.includes('threshold') || s.includes('min') || s.includes('max') || s.includes('leap');
  });

  const hasRbacOrSecurity = testCases.some((c) => {
    const s = (c.testScenario + ' ' + c.testCases).toLowerCase();
    return s.includes('role') || s.includes('permission') || s.includes('unauthorized') || s.includes('access');
  });

  const hasReportOrExport = testCases.some((c) => {
    const s = (c.testScenario + ' ' + c.testCases).toLowerCase();
    return s.includes('export') || s.includes('excel') || s.includes('audit') || s.includes('report');
  });

  // Covered
  if (hasPositive) coveredRequirements.push(`Core Functional Workflow & Happy Path verified for "${feature}"`);
  if (hasNegative) coveredRequirements.push(`Input validation and error handling for malformed data tested`);
  if (hasBoundary) coveredRequirements.push(`Boundary thresholds & numeric limits evaluated`);
  if (hasReportOrExport) coveredRequirements.push(`Excel export and reporting grid consistency validated`);

  // What is Required (Mandatory for QA Sign-Off)
  whatIsRequired.push(
    `End-to-end verification of all user input parameters under Ticket #${tNo}`,
    `Strict error validation preventing submission of empty or corrupted records`,
    `Database transaction integrity (all DB changes must commit or roll back cleanly)`,
    `Formatted Excel export verification matching screen columns and values without data loss`,
    `Audit trail logging with user timestamp, action code, and IP address`
  );

  // What Should be Added (Actionable Gaps)
  if (!hasNegative) {
    whatShouldBeAdded.push(`Add Negative Validation: System must explicitly reject negative amounts, duplicate reference numbers, and malformed characters.`);
    missingRequiredScenarios.push({
      category: 'Validation / Negative',
      title: 'Negative Input Validation & Form Rejection',
      details: 'Test that entering negative amounts, null mandatory fields, or invalid formats displays a user-friendly error message.',
    });
    recommendedTestCasesToAdd.push({
      id: `ai-rec-neg-${Date.now()}`,
      testCaseId: `TC0${total + recommendedTestCasesToAdd.length + 1}`,
      testModule: mod,
      featureTab: 'validation',
      testScenario: `Verify strict rejection and toast alert when submitting invalid or empty parameters in ${feature}`,
      testCases: `1. Open ${mod} entry screen for Ticket #${tNo}.\n2. Enter invalid characters, negative numbers, or leave mandatory fields blank.\n3. Click Save / Submit.\n4. Observe validation response.`,
      testInputs: `Mandatory Fields: Empty / Null\nNegative Value: -50000\nSpecial Characters: !@#$%^&*`,
      expectedResult: `System prevents transaction submission, flags invalid fields with red borders, and displays clear error toast without database mutation.`,
      actualResult: 'Pending execution',
      status: 'not run',
      validationScenario: 'Defensive validation ensures dirty data is never committed.',
      additionalCoverage: 'Guards against API 500 crashes and unhandled exceptions.',
      reviewStatus: 'In Review',
      version: '1.0',
      attachments: [],
      isAiGenerated: true,
    });
  }

  if (!hasBoundary) {
    whatShouldBeAdded.push(`Add Boundary Value Testing: Verify leap year (29-Feb), month-end rollings (31st vs 30th), and maximum financial thresholds.`);
    missingRequiredScenarios.push({
      category: 'Edge Case',
      title: 'Boundary Thresholds & Calendar Edge Cases',
      details: 'Verify leap year day count (Actual/Actual), month-end date transitions, and currency decimal rounding precision.',
    });
    recommendedTestCasesToAdd.push({
      id: `ai-rec-bound-${Date.now()}`,
      testCaseId: `TC0${total + recommendedTestCasesToAdd.length + 1}`,
      testModule: mod,
      featureTab: 'boundary',
      testScenario: `Verify boundary date calculation and decimal rounding for leap year & month-end in ${feature}`,
      testCases: `1. Configure contract with value date on 29-Feb or month-end (31st).\n2. Apply rate recalculation and interest accrual.\n3. Inspect day-count fraction and cashflow schedule rows.`,
      testInputs: `Value Date: 2028-02-29\nDay Count: Actual/365\nPrincipal: 10,00,000.00`,
      expectedResult: `Accruals and cashflow lines compute accurately with zero round-off error, correctly applying statutory leap-year day count.`,
      actualResult: 'Pending execution',
      status: 'not run',
      validationScenario: 'Boundary test verifies deterministic behavior at calendar thresholds.',
      additionalCoverage: 'Guarantees compliance with external banking audit standards.',
      reviewStatus: 'In Review',
      version: '1.0',
      attachments: [],
      isAiGenerated: true,
    });
  }

  if (!hasRbacOrSecurity) {
    whatShouldBeAdded.push(`Add Role-Based Access Control (RBAC): Ensure unauthorized users or viewer roles cannot execute modification actions.`);
    missingRequiredScenarios.push({
      category: 'Security / RBAC',
      title: 'Role-Based Access & Unauthorized Action Restriction',
      details: 'Verify that read-only / viewer users cannot see or execute modify, approve, or delete actions.',
    });
    recommendedTestCasesToAdd.push({
      id: `ai-rec-rbac-${Date.now()}`,
      testCaseId: `TC0${total + recommendedTestCasesToAdd.length + 1}`,
      testModule: mod,
      featureTab: 'security',
      testScenario: `Verify RBAC permissions restrict unauthorized users from editing or approving ${feature}`,
      testCases: `1. Log in with Viewer / Read-Only credentials.\n2. Navigate to Ticket #${tNo} transaction page.\n3. Verify edit/submit action buttons are disabled or hidden.\n4. Attempt direct API request.`,
      testInputs: `User Role: Read-Only / Guest\nAttempted Action: Edit / Approve`,
      expectedResult: `Action buttons are disabled; direct API calls return HTTP 403 Forbidden with audit security event logged.`,
      actualResult: 'Pending execution',
      status: 'not run',
      validationScenario: 'Security audit validates strict privilege enforcement.',
      additionalCoverage: 'Complies with enterprise security governance.',
      reviewStatus: 'In Review',
      version: '1.0',
      attachments: [],
      isAiGenerated: true,
    });
  }

  if (!hasReportOrExport) {
    whatShouldBeAdded.push(`Add Excel Export Verification: Validate that exported report includes all updated fields without formatting corruption.`);
    missingRequiredScenarios.push({
      category: 'Calculation',
      title: 'Reporting & Formatted Excel Export Integrity',
      details: 'Check that downloading Excel files preserves column headers, data formatting, and all filtered rows.',
    });
    recommendedTestCasesToAdd.push({
      id: `ai-rec-rep-${Date.now()}`,
      testCaseId: `TC0${total + recommendedTestCasesToAdd.length + 1}`,
      testModule: mod,
      featureTab: 'reporting',
      testScenario: `Verify Excel report export accurately captures all deal attributes and calculations for Ticket #${tNo}`,
      testCases: `1. Navigate to Reports grid in ${mod}.\n2. Filter by Ticket #${tNo}.\n3. Download Excel (.xlsx) file.\n4. Open file and verify columns, formatting, and numeric totals.`,
      testInputs: `Filter: Ticket #${tNo}\nFormat: Formatted Excel (.xlsx)`,
      expectedResult: `Exported Excel sheet accurately matches screen data, with proper column headers, cell types (currency, dates), and no missing rows.`,
      actualResult: 'Pending execution',
      status: 'not run',
      validationScenario: 'Data integrity check between database, UI table, and downloaded Excel artifact.',
      additionalCoverage: 'Guarantees audit readiness for external regulators and senior sign-off.',
      reviewStatus: 'In Review',
      version: '1.0',
      attachments: [],
      isAiGenerated: true,
    });
  }

  // Calculate score
  let score = 50;
  if (total >= 4) score += 15;
  if (hasPositive) score += 10;
  if (hasNegative) score += 15;
  if (hasBoundary) score += 10;
  if (duplicateOrRedundantCases.length === 0) score += 10;
  else score -= duplicateOrRedundantCases.length * 5;
  score = Math.max(25, Math.min(100, score));

  let health: DetailedAiQaReviewResult['healthRating'] = 'Good';
  if (score >= 90) health = 'Excellent';
  else if (score >= 70) health = 'Good';
  else if (score >= 50) health = 'Needs Improvement';
  else health = 'Critical Gaps';

  return {
    ticketId: tNo,
    totalReviewed: total,
    coverageScore: score,
    healthRating: health,
    coveredRequirements,
    whatIsRequired,
    whatShouldBeAdded,
    missingRequiredScenarios,
    recommendedTestCasesToAdd,
    duplicateOrRedundantCases,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}


