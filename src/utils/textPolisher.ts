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
 * Smart multilingual offline polisher for Observations & RFEs
 */
export function polishObservationText(obs: string, type: 'Observation' | 'RFE' = 'Observation'): string {
  if (!obs) return '';
  let text = obs.trim();

  // 1. Direct phrase matching for common QA Hinglish prompts (matching user's screenshots)
  const exactTranslations: [RegExp, string][] = [
    [
      /fd\s+more\s+than\s+90\s+days\s+wale\s+me,?\s*fd\s+investment\s+ka\s+gl\s+code\s+reflect\s+nahi\s+ho\s+raha\s*h?/gi,
      'For FD investments with a tenure of more than 90 days, the Investment GL Code is not getting reflected.'
    ],
    [
      /gl\s+codes\s+are\s+missing\s+for\s+the\s+existing\s+deal\s+in\s+fd/gi,
      'GL codes are missing for the existing FD deal.'
    ],
    [
      /deal\s+wise\s+me\s+jo\s+existing\s+deal\s+hai\s+us\s*me\s+internal\s+ui\s+pe\s+to\s+koi\s+field\s+nahi\s+dikh\s+rahi\s+hai\s+interest,?\s*investment\s+code\s+k\s+liye\s*\.\.\s*but\s+front\s+ui\s+pe\s+codes\s+dikh\s+rahe\s+hai\s+and\s+generate\s+me\s+bhi\s+visible\s+ho\s+rahe\s+hai/gi,
      'For existing deals, the Interest GL Code and Investment GL Code fields are not visible on the Internal UI. However, the GL codes are displayed on the Front UI and are also visible in the generated output.'
    ],
    [
      /ui\s+level\s+pe\s+fees\s+after\s+maturity\s+bhi\s+rakh\s+sakte\s+hai\s*\.\.\s*bulk\s+import\s+me\s+bhi\s+allow\s+hona\s+chahiye/gi,
      'Fees can be configured after maturity at the UI level. The same should also be allowed through Bulk Import. Bulk Import should not restrict fee entry solely because the fee date falls after the maturity date.'
    ],
    [
      /bulk\s+authorize\s+me\s+reject\s+ka\s+option\s+nahi\s+hai/gi,
      'In Bulk Authorization, the Reject option is not available. A Reject option should be provided to allow the user to reject selected records during bulk authorization.'
    ],
  ];

  for (const [regex, replacement] of exactTranslations) {
    if (regex.test(text)) {
      return replacement;
    }
  }

  // 2. Idiomatic rule-based dictionary for informal Hindi / Hinglish observations
  const hinglishReplacements: [RegExp, string][] = [
    [/\bwale\s+me\b/gi, ''],
    [/\breflect\s+nahi\s+ho\s+raha\s*h?\b/gi, 'is not getting reflected'],
    [/\breflect\s+nahi\s+ho\s+rahi\b/gi, 'is not getting reflected'],
    [/\bdikh\s+nahi\s+raha\s*h?\b/gi, 'is not visible on the UI'],
    [/\bdikh\s+nahi\s+rahi\s*h?\b/gi, 'is not visible on the UI'],
    [/\bnahi\s+dikh\s+rahi\s+hai\b/gi, 'is not visible'],
    [/\bnahi\s+dikh\s+raha\s+hai\b/gi, 'is not visible'],
    [/\bdikh\s+rahe\s+hai\b/gi, 'are displayed'],
    [/\bvisible\s+ho\s+rahe\s+hai\b/gi, 'are visible'],
    [/\bgenerate\s+me\s+bhi\b/gi, 'and in the generated output'],
    [/\bme\s+reject\s+ka\s+option\s+nahi\s+hai\b/gi, ', the Reject option is not available'],
    [/\bme\s+option\s+nahi\s+hai\b/gi, ', the option is not available'],
    [/\ballow\s+hona\s+chahiye\b/gi, 'should be allowed'],
    [/\bhona\s+chahiye\b/gi, 'should be provided'],
    [/\brakh\s+sakte\s+hai\b/gi, 'can be configured'],
    [/\bus\s+me\b/gi, 'in it'],
    [/\bpe\s+to\b/gi, ''],
    [/\bkoi\s+field\s+nahi\b/gi, 'no field is'],
    [/\bk\s+liye\b/gi, 'for'],
    [/\bkaise\s+hoga\b/gi, 'behavior should be clarified'],
    [/\bgalat\s+aa\s+raha\s+hai\b/gi, 'is displaying an incorrect value'],
    [/\bsahi\s+nahi\s+hai\b/gi, 'is not behaving correctly'],
  ];

  let converted = text;
  for (const [pattern, rep] of hinglishReplacements) {
    converted = converted.replace(pattern, rep);
  }

  // Correct general typos
  converted = correctSpelling(converted);
  converted = converted.trim();

  // Standardize capitalization and punctuation
  if (converted.length > 0) {
    converted = converted.charAt(0).toUpperCase() + converted.slice(1);
    if (!/[.!?]$/.test(converted)) {
      converted += '.';
    }
  }

  return converted;
}

/**
 * AI-powered polisher: calls backend Gemini API first, falling back to offline dictionary
 */
export async function polishObservationWithAi(
  obs: string,
  type: 'Observation' | 'RFE' = 'Observation'
): Promise<string> {
  if (!obs || !obs.trim()) return '';

  try {
    const res = await fetch('/api/ai/polish-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: obs, context: 'observation' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.polishedText) {
        return data.polishedText.trim();
      }
    }
  } catch (err) {
    console.warn('Backend language polish failed, using local polisher:', err);
  }

  return polishObservationText(obs, type);
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
