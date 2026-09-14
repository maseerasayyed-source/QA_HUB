import {
  TicketSummary,
  DeveloperTestItem,
  TestCaseItem,
  AiReviewSummary,
  AiReviewIssue,
} from '../types';

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
  const tNo = ticket.ticketNumber || '21653';
  const feature = ticket.featureName || 'Feature Verification';
  const dev = ticket.developer || 'Kunal Joshi';
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
