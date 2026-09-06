/**
 * Text Polisher Utility
 * Automatically corrects spelling, sentence structure, punctuation,
 * and standardizes professional QA phrasing across test cases and observations.
 */

const COMMON_TYPOS: Record<string, string> = {
  // Finance & Banking terms
  'interst': 'interest',
  'intreste': 'interest',
  'penlty': 'penalty',
  'penality': 'penalty',
  'princple': 'principal',
  'principale': 'principal',
  'disbursment': 'disbursement',
  'disburs': 'disburse',
  'amortisaton': 'amortization',
  'amortize': 'amortize',
  'repaymnt': 'repayment',
  'cashflo': 'cashflow',
  'cash-flow': 'cashflow',
  'tresury': 'treasury',
  'overdu': 'overdue',
  'schedul': 'schedule',
  'shedule': 'schedule',
  'calcultion': 'calculation',
  'claculation': 'calculation',
  'calcualte': 'calculate',
  'debentur': 'debenture',
  'colateral': 'collateral',
  'transction': 'transaction',
  'accont': 'account',
  'accout': 'account',
  'balnce': 'balance',
  'voucer': 'voucher',
  
  // QA & Testing terms
  'verfiy': 'verify',
  'vrify': 'verify',
  'scenrio': 'scenario',
  'scenaio': 'scenario',
  'expcted': 'expected',
  'expexted': 'expected',
  'actul': 'actual',
  'scrnshot': 'screenshot',
  'screnshot': 'screenshot',
  'atachment': 'attachment',
  'valdate': 'validate',
  'valdation': 'validation',
  'requirment': 'requirement',
  'reqirement': 'requirement',
  'eror': 'error',
  'sucess': 'success',
  'succesful': 'successful',
  'recieved': 'received',
  'dropdown': 'dropdown',
  'feild': 'field',
  'filed': 'field',
  'fild': 'field',
  'buttn': 'button',
  'pop-up': 'popup',
};

/**
 * Replaces common typos while preserving case.
 */
export function correctSpelling(text: string): string {
  if (!text) return text;

  let result = text;
  for (const [typo, fix] of Object.entries(COMMON_TYPOS)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve first-letter capitalization if match was capitalized
      if (match[0] === match[0].toUpperCase()) {
        return fix.charAt(0).toUpperCase() + fix.slice(1);
      }
      return fix;
    });
  }

  // Clean double spaces and punctuation spacing
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\s+([.,;:!?])/g, '$1');
  result = result.replace(/([.,;:!?])(?=[a-zA-Z])/g, '$1 ');

  return result.trim();
}

/**
 * Polishes a Test Scenario into standard QA phrasing.
 * E.g., "penalty entries appear" -> "Verify that penalty entries appear in cashflow when overdue occurs"
 */
export function polishTestScenario(scenario: string): string {
  if (!scenario) return '';
  let text = correctSpelling(scenario);

  // Capitalize first character
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // If it doesn't already start with a standard QA starter, enhance it gently
  const hasStandardPrefix = /^(verify|validate|ensure|confirm|check|test|evaluate)\b/i.test(text);
  if (!hasStandardPrefix) {
    text = `Verify that ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  // Ensure trailing period
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Polishes Test Case verification steps into clear, concise steps.
 */
export function polishTestSteps(steps: string): string {
  if (!steps) return '';
  let text = correctSpelling(steps);

  text = text.charAt(0).toUpperCase() + text.slice(1);

  // If single sentence, ensure polite directive phrasing
  if (!text.includes('\n') && !/^(verify|enter|select|click|navigate|ensure|check)\b/i.test(text)) {
    text = `Verify that ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Polishes an Expected Result statement into standard QA phrasing.
 * E.g., "penalty applied correctly" -> "The system should calculate and display the penalty entries accurately."
 */
export function polishExpectedResult(expected: string): string {
  if (!expected) return '';
  let text = correctSpelling(expected);

  text = text.charAt(0).toUpperCase() + text.slice(1);

  const hasSystemStarter = /^(the system should|system should|application must|should display|should show|verify that)\b/i.test(text);
  if (!hasSystemStarter) {
    if (/^should\b/i.test(text)) {
      text = `The system ${text.charAt(0).toLowerCase() + text.slice(1)}`;
    } else {
      text = `The system should ensure that ${text.charAt(0).toLowerCase() + text.slice(1)}`;
    }
  }

  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Polishes an Observation / RFE description.
 */
export function polishObservationText(obs: string): string {
  if (!obs) return '';
  let text = correctSpelling(obs);
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }
  return text;
}

/**
 * Polishes an entire TestCaseItem in one click.
 */
export function polishTestCaseItem<T extends {
  testScenario: string;
  testCases: string;
  expectedResult: string;
  actualResult: string;
  testModule?: string;
  featureTab?: string;
}>(item: T): T {
  return {
    ...item,
    testModule: item.testModule ? correctSpelling(item.testModule).toLowerCase() : item.testModule,
    featureTab: item.featureTab ? correctSpelling(item.featureTab).toLowerCase() : item.featureTab,
    testScenario: polishTestScenario(item.testScenario),
    testCases: polishTestSteps(item.testCases),
    expectedResult: polishExpectedResult(item.expectedResult),
    actualResult: item.actualResult ? correctSpelling(item.actualResult) : item.actualResult,
  };
}
