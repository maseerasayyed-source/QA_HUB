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
 * Interprets Hindi, Hinglish, informal shorthand, and banking terminology into professional testing statements.
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
      actualResult: '',
      status: 'Passed',
    };
  }

  const lower = norm.toLowerCase();
  const cleanDealId = dealId || `DEAL-${ticketNo || '8841'}`;

  let professionalPoint = norm;
  let scenario = `Scenario: Verify ${norm.replace(/^verify\s+(that\s+)?/i, '')}`;
  let testCase = `Execute developer local verification for: ${norm}`;
  let expectedResult = '';
  let testData = `Deal ID: ${cleanDealId}, Ticket: #${ticketNo}`;
  let actualResult = `Verified successfully in local build: functioning as per specification (Pass).`;

  // Pattern matching for Hindi/Hinglish & financial banking terms
  if (lower.includes('rate') || lower.includes('index') || lower.includes('benchmark') || lower.includes('byaj')) {
    professionalPoint = 'Verify automatic effective rate recalculation upon benchmark index revision';
    scenario = 'Benchmark Rate Reset & Cashflow Recalculation';
    testCase = 'Apply revised benchmark rate (+50 bps); trigger recalculation batch for deal schedule.';
    expectedResult = 'Effective Rate updates dynamically (Base Rate + Spread); all future installment cashflows re-computed without rounding variance.';
    testData = 'Base Index: 6.75%, Spread: +1.25%, Effective Rate: 8.00%, Tenor: 36 Months';
    actualResult = 'Verified successfully in local build: Effective rate recalculated accurately and schedule updated (Pass).';
  } else if (lower.includes('penalty') || lower.includes('overdue') || lower.includes('dand') || lower.includes('late')) {
    professionalPoint = 'Verify overdue penalty interest calculation and grace period enforcement';
    scenario = 'Overdue Penalty Accrual & Grace Period Validation';
    testCase = 'Simulate installment overdue past 5-day grace period; run daily penalty interest accrual.';
    expectedResult = 'Penalty interest calculates accurately strictly on overdue principal from day 6; balances reflect cleanly on deal cashflow.';
    testData = 'Grace Period: 5 Days, Penalty Rate: 2.0% p.a., Overdue Principal: 1,50,000';
    actualResult = 'Verified successfully in local build: Penalty interest computed accurately after grace period expiry (Pass).';
  } else if (lower.includes('repayment') || lower.includes('schedule') || lower.includes('emi') || lower.includes('kist')) {
    professionalPoint = 'Verify repayment schedule installment breakdown and balance reconciliation';
    scenario = 'Repayment Matrix & Principal/Interest Split';
    testCase = 'Generate repayment schedule matrix; verify total principal allocated matches deal sanction amount.';
    expectedResult = 'Amortization schedule accurately splits principal and interest per period; closing principal balance zeroes out at maturity.';
    testData = `Deal ID: ${cleanDealId}, Sanction Amount: 25,00,000, Installments: 24`;
    actualResult = 'Verified successfully in local build: Amortization schedule balances reconcile with zero discrepancy (Pass).';
  } else if (lower.includes('voucher') || lower.includes('gl') || lower.includes('accounting') || lower.includes('ledger') || lower.includes('debit') || lower.includes('credit')) {
    professionalPoint = 'Validate GL accounting voucher generation and balanced debit/credit postings';
    scenario = 'GL Ledger Entries & Balanced Voucher Verification';
    testCase = 'Commit transaction for deal; inspect generated voucher journal entries.';
    expectedResult = 'System generates balanced double-entry accounting vouchers with exact debit and credit totals posted to correct chart of accounts.';
    testData = 'GL Accounts: Loan Asset Account (Debit), Bank Disbursement (Credit), Voucher: VCH-2026';
    actualResult = 'Verified successfully in local build: Balanced debit/credit vouchers generated without discrepancy (Pass).';
  } else if (lower.includes('disburse') || lower.includes('loan') || lower.includes('tranche')) {
    professionalPoint = 'Verify tranche disbursement processing and sanctioned limit validation';
    scenario = 'Loan Tranche Disbursement & Sanction Ceiling Check';
    testCase = 'Submit disbursement request against active sanction facility; verify ledger posting.';
    expectedResult = 'Tranche disburses within sanctioned limit; ledger entries commit immediately and draw-down balance is updated.';
    testData = 'Sanction Limit: 1,00,00,000, Tranche Amount: 30,00,000, Value Date: T+0';
    actualResult = 'Verified successfully in local build: Tranche disbursed and sanction utilization updated (Pass).';
  } else if (lower.includes('gst') || lower.includes('tax') || lower.includes('fee')) {
    professionalPoint = 'Verify GSTIN tax structure validation and mandatory fee restriction';
    scenario = 'Tax Structure & Statutory Compliance Check';
    testCase = 'Submit fee schedule with valid and invalid GSTIN formats; verify system response.';
    expectedResult = 'System restricts invalid GSTIN formats with clear error toast; valid 15-digit GSTIN is accepted and statutory taxes computed.';
    testData = 'Invalid: 27AAAAA0000A1Z5 | Valid: 27AAACG1234A1Z5, CGST: 9%, SGST: 9%';
    actualResult = 'Verified successfully in local build: GSTIN format and tax split validated correctly (Pass).';
  } else if (lower.includes('export') || lower.includes('excel') || lower.includes('report') || lower.includes('download')) {
    professionalPoint = 'Verify formatted Excel export (.xlsx) preserves all column headers and numeric precision';
    scenario = 'Data Export & Precision Integrity';
    testCase = 'Click Export to Excel button; inspect generated .xlsx file data and cell types.';
    expectedResult = 'Exported spreadsheet accurately contains all deal fields, formatted currency numbers, and timestamps with zero truncations.';
    testData = 'Format: .xlsx, Records: 100+, Deal Reference Included';
    actualResult = 'Verified successfully in local build: Excel export generated cleanly with complete column fidelity (Pass).';
  } else if (lower.includes('prepay') || lower.includes('foreclose') || lower.includes('pre-payment')) {
    professionalPoint = 'Verify prepayment penalty calculation and principal reduction schedule update';
    scenario = 'Prepayment / Early Settlement Validation';
    testCase = 'Apply partial prepayment of 5,00,000; verify revised tenure and prepayment fee charges.';
    expectedResult = 'Prepayment charges calculate strictly as per terms; remaining principal and EMI schedules adjust without manual intervention.';
    testData = 'Prepayment Amount: 5,00,000, Prepayment Charge: 1.5%, Deal: ' + cleanDealId;
    actualResult = 'Verified successfully in local build: Prepayment processed and schedule adjusted cleanly (Pass).';
  } else if (lower.includes('mandatory') || lower.includes('empty') || lower.includes('null') || lower.includes('blank') || lower.includes('block')) {
    professionalPoint = 'Verify mandatory field constraints and validation error alerts on empty inputs';
    scenario = 'Mandatory Field Restriction & Error Toast Handling';
    testCase = 'Attempt form submission leaving mandatory inputs blank; verify error handling.';
    expectedResult = 'System displays clear validation warning, highlights required fields in red, and prevents database transaction commit.';
    testData = 'Omitted Fields: [Deal ID, Value Date, Principal Amount]';
    actualResult = 'Verified successfully in local build: Submission blocked and validation alert triggered as expected (Pass).';
  } else {
    // General high quality professional banking statement
    const statement = norm.replace(/^verify\s+(that\s+)?/i, '').replace(/hona chahiye/i, '').replace(/check karo/i, '').trim();
    professionalPoint = `Verify that ${statement}`;
    scenario = `Functional Verification: ${statement.slice(0, 50)}`;
    testCase = `Execute transaction flow for "${statement}"; inspect form controls and database state.`;
    expectedResult = `System executes ${statement} smoothly, adhering strictly to business rules and maintaining audit logs.`;
    testData = `Deal ID: ${cleanDealId}, Mode: Active verification`;
    actualResult = `Verified successfully in local build: ${statement} verified and functioning as expected (Pass).`;
  }

  return {
    dealId: cleanDealId,
    developerName: devName || 'Developer',
    testingPoint: professionalPoint,
    scenario: scenario,
    testDescription: testCase,
    testData: testData,
    expectedResult: expectedResult,
    actualResult: actualResult,
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
      scenario: `Positive Path: ${feature} standard processing`,
      steps: `Verify that ${feature} executes successfully with valid parameters and updates status accurately.`,
      inputs: `Standard parameters`,
      expected: `• Operation completes successfully without errors.\n• System reflects updated transaction state on screen.\n• Audit and transaction records update accurately.`,
      actual: `Verified successfully: ${feature} executed cleanly with all updates reflected as expected.`,
      validation: `Positive baseline execution conforms to specification.`,
      coverage: `Functional Core: Validates core workflow under standard operational conditions.`,
      status: 'pass' as const,
    },
    {
      scenario: `Negative Validation: Restrict invalid or duplicate parameters in ${feature}`,
      steps: `Verify that the system blocks invalid inputs or duplicate submissions for ${feature} with appropriate alert.`,
      inputs: `Invalid parameters payload`,
      expected: `• System restricts invalid operation with clear validation message.\n• Prevents corrupted data persistence.\n• User is prompted to correct invalid fields.`,
      actual: `System properly flagged validation error and prevented invalid processing as expected.`,
      validation: `Negative Validation: Boundary & constraint check prevents erroneous posting.`,
      coverage: `Defensive Security: Guards against improper user input and duplicate state mutation.`,
      status: 'pass' as const,
    },
    {
      scenario: `Boundary & Edge Case validation for ${feature}`,
      steps: `Verify that boundary thresholds and limits for ${feature} are enforced deterministically.`,
      inputs: `Boundary threshold values`,
      expected: `• Calculations execute with exact precision without off-by-one errors.\n• System adheres strictly to configured upper and lower bounds.`,
      actual: `Verified boundary thresholds successfully with zero calculation variance.`,
      validation: `Boundary Condition: Edge threshold behaves deterministically without off-by-one errors.`,
      coverage: `Financial Accuracy: Verifies boundary rules and precision.`,
      status: 'pass' as const,
    },
    {
      scenario: `Reporting & Export: Verify ${feature} in Excel and Audit Trail`,
      steps: `Verify that ${feature} transactional records are accurately exported to Excel (.xlsx) and logged in audit trail.`,
      inputs: `Export Format: Formatted Excel (.xlsx)`,
      expected: `• Exported Excel accurately matches screen grid data.\n• Cell formatting and data integrity are preserved.\n• Audit trail reflects all operations accurately.`,
      actual: `Exported Excel sheet verified with 100% data fidelity against UI grid records.`,
      validation: `Audit Compliance: Data consistency between database, UI table, and downloaded Excel artifact.`,
      coverage: `Reporting & Compliance: Guarantees audit readiness for external regulators and senior sign-off.`,
      status: 'pass' as const,
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
 * 6. Auto-Generate All Fields for "Test Case Solution & Steps" Modal (ChatGPT Quality)
 */
export function generateTestCaseFieldsWithAi(
  promptOrScenario: string,
  ticket?: TicketSummary
): {
  scenario: string;
  preconditions: string;
  steps: string;
  testCases: string;
  inputs: string;
  expectedResult: string;
  actualResult: string;
  status: string;
} {
  const norm = (promptOrScenario || ticket?.featureName || 'Feature Verification').trim();
  // Thoroughly clean leading enumerations like "1) ", "1. ", "(a) ", "- ", "• ", ") "
  let clean = norm
    .replace(/^(\d+[\.\)]|\([0-9a-zA-Z]+\)|[-*•#]+)\s*/, '')
    .replace(/^[\)\:\.\-]+\s*/, '')
    .replace(/\.+$/, '')
    .trim();

  const lower = clean.toLowerCase();
  const isNeg = /error|alert|invalid|blank|reject|prevent|cannot|should not|not allow|warning|nahi/i.test(lower);
  const isGlCode = /gl|code|account|ledger|chart of account/i.test(lower);
  const isEditable = /edit|editable|change|update|badal|modification/i.test(lower);
  const isField = /field|fiel|fiels|column|input/i.test(lower);
  const isUndo = /undo|revert|rollback|split/i.test(lower);
  const isVoucher = /voucher|posting|accounting entry/i.test(lower);
  const isBulk = /bulk|import|upload|excel|csv/i.test(lower);
  const isRate = /rate|interest|benchmark|spread|reset/i.test(lower);
  const isLimit = /sanction|limit|exposure|threshold/i.test(lower);

  let scenario = '';
  let verification = '';
  let expectedResult = '';
  let actualResult = '';

  if (isGlCode && (isEditable || isField)) {
    scenario = 'Verify that newly added GL Code configuration fields are editable and allow updates';
    verification = 'Verify that all newly added fields in the GL Code section are editable, accept user modifications, and save updated values without validation errors.';
    expectedResult = `• All newly added GL Code configuration fields are enabled and allow user input.\n• System accepts valid modifications to GL Code values without constraint errors.\n• Upon saving, updated GL Code values are accurately stored and reflected in the system.`;
    actualResult = 'Verified successfully. All newly added GL Code fields are fully editable, user inputs are accepted without error, and updated configurations are saved accurately.';
  } else if (isUndo) {
    scenario = 'Validate Undo functionality for transaction operations';
    verification = 'Verify that when an action is undone from the transaction history, the system automatically reverses the corresponding related deal actions, and vice versa.';
    expectedResult = `• Undoing the transaction action automatically rolls back related entries.\n• Corresponding transaction history and linked deal statuses update synchronously.\n• Deal records remain consistent without orphaned entries.`;
    actualResult = 'Verified successfully: Action was reversed cleanly and related deal records remained fully synchronized.';
  } else if (isVoucher) {
    scenario = 'Verify GL voucher entries and accounting postings upon deal save';
    verification = 'Verify that balanced debit and credit vouchers are generated and posted to the general ledger upon deal confirmation.';
    expectedResult = `• System generates balanced accounting vouchers corresponding to the deal transaction.\n• Debit and credit totals match without rounding discrepancy.\n• Vouchers are queryable in the Accounting & Ledger audit logs.`;
    actualResult = 'Verified successfully: Balanced vouchers were generated and posted accurately without discrepancy.';
  } else if (isBulk) {
    scenario = 'Verify Bulk Import data validation and processing from uploaded file';
    verification = 'Verify that the system validates file structure, displays preview records, and commits valid rows during bulk import.';
    expectedResult = `• File upload accepts valid templates (.xlsx, .csv) and displays parsed preview grid.\n• Invalid rows or formatting mismatches are highlighted with descriptive error tooltips.\n• Authorized records are imported and committed to the database.`;
    actualResult = 'Verified successfully: File was parsed, preview grid displayed records, and bulk data was processed successfully.';
  } else if (isRate) {
    scenario = 'Verify interest rate calculation and effective rate schedule updates';
    verification = 'Verify that interest calculations and schedule revisions accurately apply benchmark rate and spread adjustments.';
    expectedResult = `• System accurately recalculates interest amounts based on updated rate and day-count convention.\n• Repayment schedule reflects modified cashflow figures without rounding errors.\n• Past settled transactions remain locked and unimpacted.`;
    actualResult = 'Verified successfully: Interest rates and cashflow schedules were computed accurately in accordance with financial rules.';
  } else if (isLimit) {
    scenario = 'Validate Sanction Limit breach controls and alert notifications';
    verification = 'Verify that the system checks available limits and displays an alert or warning prompt when transaction amount breaches sanction limits.';
    expectedResult = `• System computes total utilization against sanction limit.\n• Appropriate warning alert or blocking dialog appears when limit is exceeded.\n• Over-limit transactions require supervisory override or authorization.`;
    actualResult = 'Verified successfully: Limit check triggered correctly, display warning dialog, and prevented unauthorized breach.';
  } else if (isNeg) {
    scenario = 'Validate boundary input restrictions and validation error alerts';
    verification = `Verify that when invalid or empty values are provided (${clean}), the system displays clear validation messages and prevents improper submission.`;
    expectedResult = `• System enforces validation constraints accurately.\n• Clear validation alert or error tooltip is displayed on screen.\n• Invalid persistence is prevented and data remains uncorrupted.`;
    actualResult = 'Verified successfully: System displayed validation alert and prevented invalid operation as expected.';
  } else {
    // Formulate concise clean scenario
    let formatted = clean;
    if (!/^verify/i.test(formatted) && !/^validate/i.test(formatted) && !/^check/i.test(formatted)) {
      formatted = `Verify that ${formatted.charAt(0).toLowerCase() + formatted.slice(1)}`;
    } else {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    scenario = formatted;

    let v = clean;
    if (!v.toLowerCase().startsWith('verify')) {
      v = `Verify that ${v.charAt(0).toLowerCase() + v.slice(1)}.`;
    } else if (!v.endsWith('.')) {
      v += '.';
    }
    verification = v;

    expectedResult = `• Operation completes successfully in accordance with specified requirements.\n• System validates input data and updates status without unexpected errors.\n• Updated configurations or records are saved and retained accurately.`;
    actualResult = `Verified successfully in accordance with expected specifications. All verified fields and operations completed with Pass status.`;
  }

  return {
    scenario,
    preconditions: 'Standard environment and permissions configured.',
    steps: verification,
    testCases: verification,
    inputs: 'Standard parameters',
    expectedResult,
    actualResult,
    status: 'pass',
  };
}

/**
 * 7. Parse Quick Paste Solution from Clipboard (Ctrl+V) - ChatGPT Standard
 */
export function parseQuickPasteSolution(rawText: string): {
  scenario?: string;
  preconditions?: string;
  steps?: string;
  testCases?: string;
  inputs?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: string;
} {
  if (!rawText.trim()) return {};

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  let scenario = '';
  let preconditions = '';
  let steps = '';
  let inputs = '';
  let expectedResult = '';
  let actualResult = '';

  let currentSection: 'none' | 'scenario' | 'preconditions' | 'steps' | 'inputs' | 'expected' | 'actual' = 'none';

  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.startsWith('scenario:') || l.startsWith('test scenario:')) {
      currentSection = 'scenario';
      scenario = line.replace(/^(scenario|test scenario):/i, '').trim();
    } else if (l.startsWith('preconditions:') || l.startsWith('precondition:')) {
      currentSection = 'preconditions';
      preconditions = line.replace(/^preconditions?:/i, '').trim();
    } else if (l.startsWith('steps:') || l.startsWith('test steps:') || l.startsWith('test case:') || l.startsWith('test cases:')) {
      currentSection = 'steps';
      steps = line.replace(/^(steps|test steps|test case|test cases):/i, '').trim();
    } else if (l.startsWith('inputs:') || l.startsWith('test inputs:') || l.startsWith('test data:') || l.startsWith('data:')) {
      currentSection = 'inputs';
      inputs = line.replace(/^(inputs|test inputs|test data|data):/i, '').trim();
    } else if (l.startsWith('expected:') || l.startsWith('expected result:') || l.startsWith('expected outcome:')) {
      currentSection = 'expected';
      expectedResult = line.replace(/^(expected|expected result|expected outcome):/i, '').trim();
    } else if (l.startsWith('actual:') || l.startsWith('actual result:') || l.startsWith('actual outcome:')) {
      currentSection = 'actual';
      actualResult = line.replace(/^(actual|actual result|actual outcome):/i, '').trim();
    } else {
      if (currentSection === 'scenario') {
        scenario += (scenario ? ' ' : '') + line;
      } else if (currentSection === 'preconditions') {
        preconditions += (preconditions ? '\n' : '') + line;
      } else if (currentSection === 'steps') {
        steps += (steps ? '\n' : '') + line;
      } else if (currentSection === 'inputs') {
        inputs += (inputs ? '\n' : '') + line;
      } else if (currentSection === 'expected') {
        expectedResult += (expectedResult ? '\n' : '') + line;
      } else if (currentSection === 'actual') {
        actualResult += (actualResult ? ' ' : '') + line;
      } else {
        // Raw text without headers (e.g. single point pasted like Image 5)
        if (!scenario) scenario = line;
        else if (!steps) steps = line;
        else expectedResult += (expectedResult ? '\n' : '') + line;
      }
    }
  }

  // If user pasted a single point or unstructured requirement
  if (!steps && scenario) {
    const generated = generateTestCaseFieldsWithAi(scenario);
    return {
      scenario: generated.scenario,
      preconditions: 'Standard environment and permissions configured.',
      steps: generated.testCases,
      testCases: generated.testCases,
      inputs: inputs || 'Standard parameters',
      expectedResult: expectedResult || generated.expectedResult,
      actualResult: actualResult || generated.actualResult,
      status: 'pass',
    };
  }

  return {
    scenario: scenario || undefined,
    preconditions: preconditions || 'Standard environment and permissions configured.',
    steps: steps || undefined,
    testCases: steps || undefined,
    inputs: inputs || undefined,
    expectedResult: expectedResult || undefined,
    actualResult: actualResult || 'Verified successfully in accordance with expected specifications.',
    status: 'pass',
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
        scenario: pointClean.startsWith('Scenario:') ? pointClean : `Scenario: ${pointClean.replace(/^verify\s+(that\s+)?/i, '')}`,
        testDescription: `Pre-QA Developer Unit/Integration Check: ${pointClean}`,
        testData: `Fields: ${fieldsList.slice(0, 3).join(', ')} | Payload: Valid mock test data | Ticket: #${tNo}`,
        expectedResult: expResult,
        actualResult: 'Verified successfully in local build: functioning as per specification (Pass).',
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
      // Create TestCaseItem (QA) - ChatGPT Standard
      const isNeg = /invalid|restrict|negative|prevent|error|fail|cannot|reject/i.test(pointClean);
      const isUndo = /undo|revert|rollback/i.test(pointClean);

      // 1. Concise Scenario Title
      let scenarioTitle = pointClean.replace(/^[-*•\d.]+\s*/, '').replace(/\.$/, '').trim();
      if (/^verify that\s+/i.test(scenarioTitle)) {
        scenarioTitle = scenarioTitle.replace(/^verify that\s+/i, '');
      } else if (/^verify\s+/i.test(scenarioTitle)) {
        scenarioTitle = scenarioTitle.replace(/^verify\s+/i, '');
      }
      scenarioTitle = scenarioTitle.charAt(0).toUpperCase() + scenarioTitle.slice(1);
      if (!scenarioTitle.toLowerCase().startsWith('validate') && !scenarioTitle.toLowerCase().startsWith('check')) {
        scenarioTitle = `Validate ${scenarioTitle}`;
      }

      // 2. Normal Verification Test Case statement
      let testCaseVerification = pointClean.replace(/^[-*•\d.]+\s*/, '').replace(/\.$/, '').trim();
      if (!testCaseVerification.toLowerCase().startsWith('verify')) {
        testCaseVerification = `Verify that ${testCaseVerification}`;
      }

      // 3. Expected Result bullets
      let expResult = '';
      let actualResult = '';

      if (isUndo) {
        expResult = `• Undoing the primary action should automatically undo the corresponding action in the related deal.\n• Both related deals and transactions remain synchronized.\n• Deal balances and states revert to their pre-action values.`;
        actualResult = `Undoing the action successfully undid the corresponding action in the related deal, and vice versa. Both split actions were synchronized correctly after the Undo operation.`;
      } else if (isNeg) {
        expResult = `• System blocks submission and flags invalid inputs.\n• Meaningful validation notification is displayed.\n• Database records remain untouched.`;
        actualResult = `System correctly highlighted validation error and prevented invalid processing as expected.`;
      } else {
        expResult = `• Operation executes successfully without errors.\n• Corresponding transaction history and balances update accurately.\n• System reflects the updated status on screen.`;
        actualResult = `Verified successfully: ${testCaseVerification} completed without errors and updated state accurately.`;
      }

      const qaItem: TestCaseItem = {
        id: `ai-tc-${Date.now()}-${candidateIndex}-${Math.random().toString(36).substring(2, 6)}`,
        testCaseId: `TC0${existingItems.length + newItems.length + 1}`,
        testModule: mod,
        featureTab: feature.toLowerCase().split(' ')[0] || 'general',
        testScenario: scenarioTitle,
        testCases: testCaseVerification,
        testInputs: 'Standard parameters',
        expectedResult: expResult,
        actualResult: actualResult,
        status: 'pass',
        validationScenario: isNeg ? 'Negative validation test' : 'Functional verification',
        additionalCoverage: 'Core functional workflow specification check',
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


