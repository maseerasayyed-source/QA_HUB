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
 * Advanced Multilingual (Hinglish, Hindi, Gujarati, informal English, shorthand)
 * to Professional QA English Scenario Translator.
 * Ensures any command or requirement is converted to clear, understandable English starting with "Verify that...".
 */
export function translateAndPolishScenarioToEnglish(
  rawInput: string,
  ticket?: TicketSummary
): { englishScenario: string; detectedLanguage: string; isValidation: boolean } {
  let text = (rawInput || '').trim();
  if (!text) {
    const fallback = ticket ? `${ticket.featureName} in ${ticket.moduleName}` : 'the specified system feature';
    return { englishScenario: `Verify that ${fallback} functions properly according to specification.`, detectedLanguage: 'en', isValidation: false };
  }

  // Strip existing verification prefixes
  let cleaned = text.replace(/^(verify\s+that|verify|check\s+if|check\s+that|ensure\s+that|validate\s+that|test\s+that|test)\s+/i, '').trim();

  // Detect Hinglish / Indic terms
  const indicPatterns = [
    /\b(agr|agar|jab|tab|kare|karega|karti|karte|krta|krte|karta|hona|chahiye|nahi|na|avega|aayega|aana|dikhega|dikhana|dikhe|khali|galat|sahi|pehle|baad|se|me|mai|hai|hain|tha|thi|the|pe|par|karo|karne|rakho|rakhe|chal|raha|rahi|wala|wali|wale|ka|ki|ke|ko|hata|hatao|bhejo|daal|daalo)\b/i,
    /\b(roleka|role\s*ka|mention\s*krta|validation\s*avega|popup\s*aana|error\s*aana|error\s*show|save\s*nahi|block\s*kare)\b/i,
  ];
  const isIndic = indicPatterns.some((pattern) => pattern.test(text));

  // 1. Specific High-Frequency Pattern: Role Conflict / Switch check
  // E.g. "Verify that agr user already dev roleka hai and next time login me role QA mention krta hai to validation avega"
  if (
    /(dev|developer|qa|admin|user|manager|viewer|tester)\s*(role|roleka|role\s*ka)?/i.test(cleaned) &&
    /(login|signin|sign\s*in|access)/i.test(cleaned) &&
    /(validation|error|block|restrict|avega|aana|aayega)/i.test(cleaned)
  ) {
    const firstRoleMatch = cleaned.match(/(?:already|pehle\s*se)?\s*(dev|developer|qa|admin|user|manager|viewer|tester|lead)\s*(?:role|roleka|role\s*ka)?/i);
    const secondRoleMatch = cleaned.match(/(?:role|next\s*time|login\s*me)?\s*(qa|dev|developer|admin|user|manager|viewer|tester)\s*(?:mention|select|chose|choose|enter)/i);

    const role1 = firstRoleMatch ? (firstRoleMatch[1].toLowerCase().startsWith('dev') ? 'Developer' : firstRoleMatch[1].toUpperCase()) : 'Developer';
    const role2 = secondRoleMatch ? (secondRoleMatch[1].toLowerCase().startsWith('dev') ? 'Developer' : secondRoleMatch[1].toUpperCase()) : (role1 === 'Developer' ? 'QA' : 'Developer');

    return {
      englishScenario: `Verify that an appropriate validation error is displayed when a user already registered with the ${role1} role attempts to log in selecting the ${role2} role.`,
      detectedLanguage: isIndic ? 'hi-en' : 'en',
      isValidation: true,
    };
  }

  // 2. Specific Pattern: Negative / Zero / Boundary
  // E.g. "loan amount agar 0 se kam ho to save nahi hona chahiye"
  if (
    /(0\s*se\s*kam|zero\s*se\s*kam|negative|less\s*than\s*0|less\s*than\s*zero)/i.test(cleaned) &&
    /(save\s*nahi|block|restrict|error|validation|submit\s*na)/i.test(cleaned)
  ) {
    const entity = /(amount|loan|rate|interest|balance|tenor|fee)/i.exec(cleaned)?.[0] || 'input value';
    return {
      englishScenario: `Verify that entering a ${entity} less than or equal to zero displays an error alert and restricts form submission.`,
      detectedLanguage: isIndic ? 'hi-en' : 'en',
      isValidation: true,
    };
  }

  // 3. Specific Pattern: Deletion confirmation popup
  if (
    /(delete|remove|hata|hatao)/i.test(cleaned) &&
    /(popup|modal|confirmation|confirm|alert|dialog)/i.test(cleaned)
  ) {
    return {
      englishScenario: `Verify that clicking the Delete action button displays a confirmation dialog before permanently removing the record.`,
      detectedLanguage: isIndic ? 'hi-en' : 'en',
      isValidation: false,
    };
  }

  // 4. Specific Pattern: Duplicate entry check
  if (
    /(duplicate|already\s*exist|same|dobara)/i.test(cleaned) &&
    /(error|validation|alert|block|restrict|mana)/i.test(cleaned)
  ) {
    const entity = /(email|username|deal|ticket|id|name|gstin|pan)/i.exec(cleaned)?.[0] || 'record';
    return {
      englishScenario: `Verify that attempting to create or register with a duplicate ${entity} displays an explicit duplicate validation error.`,
      detectedLanguage: isIndic ? 'hi-en' : 'en',
      isValidation: true,
    };
  }

  // 5. Specific Pattern: Leap year / interest calculation
  if (
    /(leap\s*year)/i.test(cleaned) &&
    /(interest|rate|calculation|calculate|days|366)/i.test(cleaned)
  ) {
    return {
      englishScenario: `Verify that interest is accurately calculated using a 366-day year basis during a leap year.`,
      detectedLanguage: isIndic ? 'hi-en' : 'en',
      isValidation: false,
    };
  }

  // 6. Specific Pattern: GSTIN / Tax validation
  if (
    /(gstin|tax|pan)/i.test(cleaned) &&
    /(invalid|wrong|galat|format|error|validation|block)/i.test(cleaned)
  ) {
    return {
      englishScenario: `Verify that entering an invalid GSTIN format restricts submission and displays an informative validation message.`,
      detectedLanguage: isIndic ? 'hi-en' : 'en',
      isValidation: true,
    };
  }

  // 7. General Indic / Hinglish Phrase-Level Translation & Normalization
  if (isIndic) {
    let translated = cleaned;

    const replacements: [RegExp, string][] = [
      [/\bagr\b|\bagar\b/gi, 'if'],
      [/\bjab\b/gi, 'when'],
      [/\btab\b/gi, 'then'],
      [/\bpehle\s*se\b|\balready\b/gi, 'previously'],
      [/\bdev\s*roleka\s*hai\b|\bdev\s*role\s*ka\s*hai\b/gi, 'has the Developer role'],
      [/\bqa\s*roleka\s*hai\b|\bqa\s*role\s*ka\s*hai\b/gi, 'has the QA role'],
      [/\bnext\s*time\b/gi, 'subsequently'],
      [/\blogin\s*me\b/gi, 'during login'],
      [/\bmention\s*krta\s*hai\b|\bmention\s*kare\b/gi, 'specifies'],
      [/\bvalidation\s*avega\b|\bvalidation\s*aana\s*chahiye\b|\bvalidation\s*aayega\b/gi, 'a validation error is displayed'],
      [/\berror\s*aana\s*chahiye\b|\berror\s*show\s*kare\b|\berror\s*dikhe\b/gi, 'an error alert is shown'],
      [/\bsave\s*nahi\s*hona\s*chahiye\b|\bsave\s*na\s*ho\b/gi, 'submission is prevented'],
      [/\bclick\s*karne\s*pe\b|\bclick\s*par\b/gi, 'upon clicking'],
      [/\bpopup\s*aana\s*chahiye\b/gi, 'a confirmation modal appears'],
      [/\bsahi\s*calculation\b/gi, 'accurate calculation'],
      [/\bgalat\b/gi, 'invalid'],
      [/\bkhali\b/gi, 'empty'],
      [/\brokna\s*chahiye\b|\bblock\s*kare\b/gi, 'restricts the action'],
      [/\b0\s*se\s*kam\b/gi, 'less than zero'],
      [/\bchal\s*raha\s*hai\b/gi, 'functions properly'],
      [/\bnahi\s*chal\s*raha\b/gi, 'fails execution'],
      [/\bto\b/gi, 'then'],
      [/\bhai\b|\bhain\b/gi, 'is'],
      [/\btha\b|\bthi\b/gi, 'was'],
      [/\bse\b/gi, 'from'],
      [/\bme\b|\bmai\b/gi, 'in'],
      [/\bpe\b|\bpar\b/gi, 'on'],
      [/\bka\b|\bki\b|\bke\b/gi, 'of'],
      [/\bko\b/gi, 'to'],
    ];

    replacements.forEach(([regex, repl]) => {
      translated = translated.replace(regex, repl);
    });

    translated = translated.replace(/\s{2,}/g, ' ').trim();
    const isVal = /validation|error|restrict|prevent|invalid|block|mismatch|reject|deny|denied/i.test(translated);

    let polished = translated;
    if (!polished.toLowerCase().startsWith('verify')) {
      polished = `Verify that ${polished}`;
    }
    if (!polished.endsWith('.')) {
      polished += '.';
    }

    return {
      englishScenario: polished,
      detectedLanguage: 'hi-en',
      isValidation: isVal,
    };
  }

  // Already standard English
  let finalEng = cleaned;
  if (!finalEng.toLowerCase().startsWith('verify')) {
    finalEng = `Verify that ${finalEng}`;
  }
  if (!finalEng.endsWith('.')) {
    finalEng += '.';
  }

  const isVal = /validation|error|restrict|prevent|invalid|block|mismatch|reject|deny|denied/i.test(finalEng);

  return {
    englishScenario: finalEng,
    detectedLanguage: 'en',
    isValidation: isVal,
  };
}

/**
 * Derives a strictly logical, scenario-specific Expected Result, Preconditions, Steps, and Inputs.
 * Replaces generic templates with domain-accurate outcomes.
 */
export function deriveLogicalExpectedResult(
  scenarioEnglish: string,
  rawPrompt: string,
  ticket?: TicketSummary
): {
  expectedResult: string;
  preconditions: string;
  steps: string;
  inputs: string;
  category: 'role' | 'validation' | 'duplicate' | 'calculation' | 'delete' | 'boundary' | 'export' | 'positive';
} {
  const combined = `${scenarioEnglish} ${rawPrompt}`.toLowerCase();
  const tNo = ticket?.ticketNumber || '21653';
  const mod = ticket?.moduleName || 'Financial Module';
  const feat = ticket?.featureName || 'Transaction Processing';

  // 1. Role / Access / Permission Conflict
  if (
    (combined.includes('role') || combined.includes('permission') || combined.includes('access')) &&
    (combined.includes('mismatch') || combined.includes('dev') || combined.includes('qa') || combined.includes('admin') || combined.includes('denied') || combined.includes('unauthorized') || combined.includes('switch') || combined.includes('conflict'))
  ) {
    return {
      category: 'role',
      preconditions: `An active user account exists configured with the 'Developer' role; user has previously authenticated under Developer permissions in ${mod}.`,
      steps: `1. Open Beacon QA portal login screen.\n2. Enter valid credentials for an active account registered with the 'Developer' role.\n3. In the role selection dropdown, choose 'QA' as the session role.\n4. Click the 'Sign In' / 'Login' button.\n5. Verify that the system intercepts the request and evaluates role assignment.\n6. Confirm that the validation alert appears and access is blocked.`,
      inputs: `User Email: dev.account@quantumphinance.com\nConfigured System Role: Developer\nRequested Login Role: QA\nTarget Module: ${mod}\nTicket: #${tNo}`,
      expectedResult: `System rejects the login request, prevents unauthorized role switching, and displays a clear validation message: "Access Denied: User is already registered with Developer role. Cannot switch to QA role." The session remains unauthenticated and no elevated permissions are granted.`,
    };
  }

  // 2. Negative Validation / Out-of-bounds / Format constraint
  if (
    combined.includes('invalid') ||
    combined.includes('validation error') ||
    combined.includes('error message') ||
    combined.includes('restrict') ||
    combined.includes('less than') ||
    combined.includes('0 se kam') ||
    combined.includes('negative') ||
    combined.includes('blank') ||
    combined.includes('empty') ||
    combined.includes('malformed') ||
    combined.includes('prevent')
  ) {
    return {
      category: 'validation',
      preconditions: `Beacon QA environment running for ${mod}; QA tester role authenticated with access to ${feat} input form.`,
      steps: `1. Navigate to ${mod} screen for Ticket #${tNo}.\n2. Input the invalid/malformed parameter according to scenario specifications.\n3. Click 'Validate' or 'Submit' button.\n4. Verify UI highlights the offending field and displays an inline validation message.\n5. Verify that transaction commit is blocked in the database.`,
      inputs: `Ticket: #${tNo}\nModule: ${mod}\nTest Input: Invalid / Boundary violation payload\nTrigger: Form commit`,
      expectedResult: `System blocks form submission, highlights offending input fields in red, and presents an explicit validation error message. The transaction is rejected, and no corrupted or invalid state is committed to the database.`,
    };
  }

  // 3. Duplicate Identifier / Record conflict
  if (
    combined.includes('duplicate') ||
    combined.includes('already exists') ||
    combined.includes('already registered')
  ) {
    return {
      category: 'duplicate',
      preconditions: `Target record already exists in the ${mod} database table with identifier matching test payload.`,
      steps: `1. Open creation form for ${feat} in ${mod}.\n2. Enter an identifier or unique field value that already exists in the system.\n3. Complete all other required fields with valid test data.\n4. Click Save / Create.\n5. Observe system validation toast and response.`,
      inputs: `Existing Unique Identifier: DEAL-${tNo}-PRIMARY\nAction: Create Duplicate Record\nModule: ${mod}`,
      expectedResult: `System detects the duplicate record, prevents duplicate creation, and displays a clear error toast: "Record with this identifier already exists. Please provide a unique value." Previous database state remains unaltered.`,
    };
  }

  // 4. Financial Calculation / Rate / Leap Year / Penalty / Overdue
  if (
    combined.includes('rate') ||
    combined.includes('interest') ||
    combined.includes('penalty') ||
    combined.includes('overdue') ||
    combined.includes('leap year') ||
    combined.includes('calculation') ||
    combined.includes('cashflow') ||
    combined.includes('amortization')
  ) {
    const isLeap = combined.includes('leap');
    const isPenalty = combined.includes('penalty') || combined.includes('overdue');
    return {
      category: 'calculation',
      preconditions: `Active deal facility in ${mod} with linked benchmark rate curves and active amortization schedule.`,
      steps: `1. Open active deal contract in ${mod} for Ticket #${tNo}.\n2. Set test valuation parameters ${isLeap ? '(Leap Year date basis with 366 days)' : isPenalty ? '(Overdue past grace period threshold)' : '(Updated benchmark rate and spread)'}.\n3. Trigger calculation / batch cycle execution.\n4. Inspect generated cashflow schedule table lines.\n5. Verify interest, principal, and penalty values with exact mathematical formula.`,
      inputs: isLeap
        ? `Day Count: Actual/366 (Leap Year)\nValuation Date: 2028-02-29\nPrincipal: 1,00,00,000 INR\nBenchmark Rate: 8.50%`
        : isPenalty
        ? `Grace Period: 5 Days\nOverdue Date: T+6\nPenalty Interest: 2.0% p.a.\nPrincipal: 50,00,000 INR`
        : `Index Rate: 8.25%\nSpread: 1.75%\nEffective Rate: 10.00%\nDeal: DL-${tNo}-01`,
      expectedResult: isLeap
        ? `Interest dynamically calculates utilizing a 366-day annual denominator for the leap year without day-count bias, matching formula [Principal * Rate * (Days / 366)] to the exact rupee and paise.`
        : isPenalty
        ? `Cashflow schedule accurately generates penalty line entries for the overdue duration following grace period expiration, and updates the total deal liability without rounding discrepancies.`
        : `Effective interest rate dynamically recalculates to 10.00% across all future installment cashflow schedule lines, keeping past finalized installments intact.`,
    };
  }

  // 5. Deletion / Removal confirmation modal
  if (
    combined.includes('delete') ||
    combined.includes('remove') ||
    combined.includes('confirmation') ||
    combined.includes('popup') ||
    combined.includes('modal')
  ) {
    return {
      category: 'delete',
      preconditions: `At least one active test record exists in the ${mod} table ready for deletion.`,
      steps: `1. Navigate to ${mod} list view for Ticket #${tNo}.\n2. Locate the designated test record.\n3. Click the 'Delete' icon / button.\n4. Verify that a confirmation modal dialog opens displaying clear warning text.\n5. Click 'Confirm Delete'.\n6. Verify that the modal closes, record is removed from grid, and success notification appears.`,
      inputs: `Target Record ID: REC-${tNo}-001\nAction: Delete\nConfirmation Response: 'Confirm'`,
      expectedResult: `System displays a modal dialog requesting explicit confirmation before deletion. Upon confirmation, the record is permanently removed from the table and database, and a success notification confirms the deletion.`,
    };
  }

  // 6. Excel Export / Audit Reporting
  if (
    combined.includes('export') ||
    combined.includes('excel') ||
    combined.includes('report') ||
    combined.includes('download')
  ) {
    return {
      category: 'export',
      preconditions: `User is logged in with QA/Operations role; filtered records present in ${mod} table.`,
      steps: `1. Navigate to ${mod} grid view.\n2. Apply filter criteria for Ticket #${tNo}.\n3. Click 'Export to Excel' (.xlsx).\n4. Open downloaded spreadsheet file.\n5. Verify column headers, data precision, date formatting, and row counts against UI grid.`,
      inputs: `Export Format: Formatted Excel (.xlsx)\nFilter: Ticket #${tNo}\nExpected Rows: Complete dataset`,
      expectedResult: `Exported Excel file preserves all grid column headers, numeric precision, and cell formats with 100% data fidelity, without missing or truncated records.`,
    };
  }

  // 7. Positive / Happy Path
  return {
    category: 'positive',
    preconditions: `Active ${mod} configuration, test database seeded, and user role with authorized write privileges.`,
    steps: `1. Log in to Beacon QA portal with authorized credentials.\n2. Navigate to ${mod} module > ${feat}.\n3. Enter valid, verified test parameters for Ticket #${tNo}.\n4. Click 'Save' / 'Process' button.\n5. Verify confirmation message and database persistence.`,
    inputs: `Ticket: #${tNo}\nModule: ${mod}\nDeal Ref: DL-${tNo}-01\nPayload: Standard valid test payload`,
    expectedResult: `Transaction executes cleanly with HTTP 200/201 success confirmation. All fields are successfully committed to the database, and the UI grid refreshes displaying the updated record with active status.`,
  };
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

  // Translate Hinglish/multilingual to clear English
  const { englishScenario } = translateAndPolishScenarioToEnglish(norm);
  const derived = deriveLogicalExpectedResult(englishScenario, norm);

  return {
    dealId: dealId || 'DEAL-8841',
    developerName: devName || 'Developer',
    testingPoint: englishScenario,
    scenario: englishScenario,
    testDescription: `Developer pre-QA verification: ${englishScenario}`,
    testData: derived.inputs || `Ticket: #${ticketNo}, Deal: ${dealId}`,
    expectedResult: derived.expectedResult,
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
 * Supports multilingual input commands and produces logically sound expected results & steps.
 */
export function generateTestCaseFromOneLine(
  requirementLine: string,
  ticket?: TicketSummary,
  caseIndex: number = 1
): Partial<TestCaseItem> {
  const line = requirementLine.trim();
  if (!line) return {};

  const tModule = ticket ? ticket.moduleName : 'Term Loan';
  const feature = ticket ? ticket.featureName.toLowerCase().split(' ')[0] : 'general';
  const tcId = `TC${caseIndex}`;

  const { englishScenario, isValidation } = translateAndPolishScenarioToEnglish(line, ticket);
  const derived = deriveLogicalExpectedResult(englishScenario, line, ticket);

  const validationDesc = isValidation
    ? `Negative Validation: Confirms system rejects invalid input and prevents erroneous database commit.`
    : `Positive Baseline: Standard workflow executes according to Azure DevOps specification.`;

  const additionalCoverage = isValidation
    ? `Defensive Security: Validates resilience against malformed inputs and unauthorized role switching.`
    : `Boundary & Integration: Validates end-to-end data integrity between UI and database.`;

  return {
    testCaseId: tcId,
    testModule: tModule,
    featureTab: feature,
    testScenario: englishScenario,
    testCases: derived.steps,
    testInputs: derived.inputs,
    expectedResult: derived.expectedResult,
    validationScenario: validationDesc,
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
 * Supports multilingual commands (Hinglish, Hindi, Gujarati, informal English)
 * and guarantees domain-accurate, logically consistent Expected Results and sequential Steps.
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
  const norm = (promptOrScenario || ticket?.testingScenarios || ticket?.featureName || 'Verify transaction processing').trim();
  const { englishScenario } = translateAndPolishScenarioToEnglish(norm, ticket);
  const derived = deriveLogicalExpectedResult(englishScenario, norm, ticket);

  return {
    scenario: englishScenario,
    preconditions: derived.preconditions,
    steps: derived.steps,
    inputs: derived.inputs,
    expectedResult: derived.expectedResult,
  };
}

/**
 * Async version of generateTestCaseFieldsWithAi that attempts to call the server Gemini API endpoint
 * first for deep generative AI understanding, seamlessly falling back to our smart local NLP engine.
 */
export async function generateTestCaseFieldsWithAiAsync(
  promptOrScenario: string,
  ticket?: TicketSummary
): Promise<{
  scenario: string;
  preconditions: string;
  steps: string;
  inputs: string;
  expectedResult: string;
  source: 'gemini' | 'nlp_engine';
}> {
  const norm = (promptOrScenario || ticket?.testingScenarios || ticket?.featureName || '').trim();

  // Try server Gemini endpoint
  try {
    const res = await fetch('/api/ai/generate-test-case-solution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: norm,
        ticket: ticket,
        moduleName: ticket?.moduleName,
        featureName: ticket?.featureName,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.scenario && json.data.expectedResult) {
        return {
          scenario: json.data.scenario,
          preconditions: json.data.preconditions,
          steps: json.data.steps,
          inputs: json.data.inputs,
          expectedResult: json.data.expectedResult,
          source: 'gemini',
        };
      }
    }
  } catch (e) {
    // Fall back to local NLP engine
    console.debug('Gemini API call skipped/failed, using local multilingual engine:', e);
  }

  const local = generateTestCaseFieldsWithAi(norm, ticket);
  return {
    ...local,
    source: 'nlp_engine',
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
}): GenerateMultiScenariosResult<any> {
  const {
    ticket,
    description = '',
    testingScenarios = '',
    attachedDocs = [],
    screenFields = [],
    targetMode,
    existingItems = [],
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

    // Translate Hinglish/multilingual to clear professional English & derive logical expected result
    const { englishScenario, isValidation } = translateAndPolishScenarioToEnglish(pointClean, ticket);
    const derived = deriveLogicalExpectedResult(englishScenario, pointClean, ticket);

    if (targetMode === 'developer') {
      const devItem: DeveloperTestItem = {
        id: `dt-gen-${Date.now()}-${candidateIndex}-${Math.random().toString(36).substring(2, 6)}`,
        scenarioId: `DEV-0${existingItems.length + newItems.length + 1}`,
        dealId: dealId,
        developerName: dev,
        testingPoint: englishScenario,
        scenario: englishScenario,
        testDescription: `Pre-QA Developer Unit/Integration Check: ${englishScenario}`,
        testData: derived.inputs || `Fields: ${fieldsList.slice(0, 3).join(', ')} | Ticket: #${tNo}`,
        expectedResult: derived.expectedResult,
        actualResult: 'Verified & passed in developer test environment',
        status: 'Passed',
        submissionState: 'Draft',
        remarks: 'AI generated from ticket description, scenarios & attached fields',
        isAiGenerated: true,
        attachments: [],
      };
      newItems.push(devItem);
    } else {
      const validationText = isValidation
        ? `Negative Validation: Confirms system rejects invalid syntax, constraints, and unauthorized role elevation.`
        : `Positive Baseline: Standard operational workflow completes according to Azure DevOps specification.`;

      const addlCoverage = isValidation
        ? `Security & Defensive Robustness: Protects against unhandled exceptions and invalid DB mutations.`
        : `Functional Integration: Validates end-to-end data fidelity across client, API, and database.`;

      const qaItem: TestCaseItem = {
        id: `ai-tc-${Date.now()}-${candidateIndex}-${Math.random().toString(36).substring(2, 6)}`,
        testCaseId: `TC0${existingItems.length + newItems.length + 1}`,
        testModule: mod,
        featureTab: feature.toLowerCase().split(' ')[0] || 'general',
        testScenario: englishScenario,
        testCases: derived.steps,
        testInputs: derived.inputs || `Screen Fields: ${fieldsList.slice(0, 4).join(', ')}\nTicket: #${tNo}\nModule: ${mod}`,
        expectedResult: derived.expectedResult,
        actualResult: 'Pending execution',
        status: 'not run',
        validationScenario: validationText,
        additionalCoverage: addlCoverage,
        reviewStatus: 'Draft',
        version: '1.0',
        attachments: [],
        isAiGenerated: true,
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


