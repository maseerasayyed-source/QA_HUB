/**
 * Language AI & Multilingual QA Command Engine
 * Translates Hindi, Hinglish, Urdu, Roman Urdu, casual slang, and any language commands
 * directly into clear, simple, professional QA English.
 */

import { TestCaseItem } from '../types';

export interface ConvertedCommandResult {
  englishText: string;
  structuredTestCase?: {
    testScenario: string;
    testCases: string;
    expectedResult: string;
    actualResult?: string;
    validationScenario: string;
  };
  structuredTestCases?: {
    testScenario: string;
    testCases: string;
    expectedResult: string;
    actualResult?: string;
    validationScenario: string;
  }[];
}

// Common Hindi/Hinglish QA keywords and patterns
const HINDI_INDICATORS = [
  'agar', 'jab', 'tab', 'hona chahiye', 'nahi', 'mat', 'chahiye', 'karo', 'dekhna',
  'galat', 'sahi', 'dikhe', 'daale', 'daalo', 'pehle', 'baad', 'zyada', 'kam',
  'kare', 'karna', 'aana', 'jana', 'chhod', 'khali', 'bhi', 'wala', 'wali',
  'kaise', 'kyun', 'kya', 'par', 'pe', 'me', 'se', 'ko', 'hai', 'hain', 'tha',
  'the', 'thi', 'hua', 'hoga', 'hogi', 'milna', 'dikhna', 'bhejna', 'roko',
  'isme', 'unme', 'jisme', 'jysy', 'wysy', 'jaisa', 'waisa', 'k case me',
  'reflect nahi', 'hona tha', 'kiya tha', 'kar rahe', 'kr rahe', 'kar raha',
  'kr rahi', 'sare', 'saare', 'pass hi', 'consider kr', 'bata de', 'fyda'
];

/**
 * Checks if a string likely contains Hindi/Hinglish or non-standard casual language.
 */
export function isNonEnglishOrHinglish(text: string): boolean {
  if (!text || text.trim().length < 3) return false;
  const lower = text.toLowerCase();
  
  // Check for Devanagari script characters
  if (/[\u0900-\u097F]/.test(text)) return true;

  // Check for common Hinglish patterns
  for (const word of HINDI_INDICATORS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return true;
    }
  }

  if (
    /(\bk\s+case\s+me\b|\bnahi\s+ho\s+raha\b|\bkr\s+rahi\b|\bkr\s+raha\b|\bhona\s+chahiye\b|\bpass\s+hi\b)/i.test(
      lower
    )
  ) {
    return true;
  }

  return false;
}

/**
 * High-fidelity domain translator that converts any informal banking/treasury Hindi/Hinglish
 * statement into crystal-clear, executive corporate English without spelling errors.
 */
export function translateHinglishOffline(text: string): string {
  if (!text) return '';
  let res = text.trim();

  // Comprehensive word & phrase replacements
  const phraseReplacements: [RegExp, string][] = [
    [/\bagar\s+user\b/gi, 'if the user'],
    [/\bagar\s+/gi, 'if '],
    [/\bjab\s+user\b/gi, 'when the user'],
    [/\bjab\s+/gi, 'when '],
    [/\bisme\s+(\d+)\s+scenarios?\s+hai\b/gi, 'covering $1 validation scenarios:'],
    [/\bisme\s+/gi, 'wherein '],
    [/\bblank\s+chhod\s+(de|diya|dein)\b/gi, 'is left blank'],
    [/\bempty\s+chhod\s+(de|diya)\b/gi, 'is left empty'],
    [/\bgalat\s+value\b/gi, 'invalid value'],
    [/\bgalat\s+/gi, 'invalid '],
    [/\bsahi\s+value\b/gi, 'valid value'],
    [/\bsahi\s+/gi, 'valid '],
    [/\berror\s+(aana|dikhe|show\s+hona)\s+chahiye\b/gi, 'an error message must be displayed'],
    [/\bpopup\s+(aana|open\s+hona)\s+chahiye\b/gi, 'a popup modal should appear'],
    [/\balert\s+(aana|show\s+hona)\s+chahiye\b/gi, 'an alert message should be displayed'],
    [/\bvalidation\s+fail\s+hona\s+chahiye\b/gi, 'validation must fail'],
    [/\bbutton\s+disable\s+hona\s+chahiye\b/gi, 'the button should be disabled'],
    [/\bbutton\s+enable\s+hona\s+chahiye\b/gi, 'the button should be enabled'],
    [/\bsave\s+ho\s+jana\s+chahiye\b/gi, 'the record should be saved successfully'],
    [/\bsave\s+nahi\s+hona\s+chahiye\b/gi, 'the record must not be saved'],
    [/\bdelete\s+ho\s+jana\s+chahiye\b/gi, 'the item should be deleted successfully'],
    [/\bpehle\s+se\b/gi, 'previously'],
    [/\bpehle\b/gi, 'before'],
    [/\bbaad\s+me\b/gi, 'afterwards'],
    [/\bzyada\s+ho\s+to\b/gi, 'is greater than'],
    [/\bkam\s+ho\s+to\b/gi, 'is less than'],
    [/\bbarabar\s+ho\s+to\b/gi, 'equals'],
    [/\bdaale\s+to\b/gi, 'is entered'],
    [/\bdaalo\b/gi, 'enter'],
    [/\bclick\s+karo\b/gi, 'click'],
    [/\bcheck\s+karo\s+ki\b/gi, 'verify that'],
    [/\bdekhna\s+hai\s+ki\b/gi, 'verify that'],
    [/\bnahi\s+chalna\s+chahiye\b/gi, 'should not function'],
    [/\bhar\s+field\s+(ko\s+)?(check|validate)\s+krna\s+hai\b/gi, 'validate all fields, calculations, and constraints'],
    [/\bfield\s+validate\s+karo\b/gi, 'validate all fields'],
    [/\bproperly\s+reflect\s+nahi\s+ho\s+raha\s*(tha|h|hai)?\b/gi, 'was not reflecting properly in accounting'],
    [/\breflect\s+nahi\s+ho\s+raha\s*(tha|h|hai)?\b/gi, 'is not getting reflected in accounting'],
    [/\bgl\s+code\s+reflect\s+nahi\s+ho\s+raha\s*(tha|h|hai)?\b/gi, 'GL code is not getting reflected in accounting'],
    [/\bgl\s+code\s+missing\s*(tha|h|hai)?\b/gi, 'GL codes are missing'],
    [/\bvisible\s+nahi\s+ho\s+raha\s*(tha|h|hai)?\b/gi, 'is not visible on the UI'],
    [/\bentry\s+nahi\s+banna\s+chahiye\b/gi, 'no accounting or reversal voucher entries should be created'],
    [/\bdiscription\b/gi, 'description'],
    [/\ball\s+thee\s+result\s+pass\b/gi, 'all test results are evaluated as Pass'],
    [/\ball\s+result\s+pass\b/gi, 'all test results are evaluated as Pass'],
    [/\bpass\s+hi\s+consider\s+k(r|ar)\b/gi, 'evaluate all results as Pass'],
    [/\bhona\s+chahiye\b/gi, 'must be enabled'],
    [/\bnahi\s+hona\s+chahiye\b/gi, 'must not occur'],
    [/\bk\s+case\s+me\b/gi, 'in case of'],
    [/\bint\s+payment\b/gi, 'Interest Payment'],
    [/\bfd\s+end\b/gi, 'FD Maturity / Closure'],
    [/\bkuch\s+kaam\s+ka\s+nahi\s*(hai|h)?\b/gi, 'is not functioning as expected'],
    [/\bkaam\s+k\s+kuch\s+nahi\s*(h|hai)?\b/gi, 'are not functioning effectively'],
    [/\bsab\s+wysy\s+hi\s+raha\s*(h|hai)?\b/gi, 'remains unchanged without effect'],
    [/\bwaisa\s+hi\s+raha\s*(h|hai)?\b/gi, 'remains unchanged'],
    [/\bhineng\b/gi, 'Hinglish wording'],
    [/\bconnection\s+error\s+araha\s*(h|hai)?\b/gi, 'a connection interruption occurs'],
    [/\bgenerate\s+hi\s+nahi\s+ho\s+rahe\s*(h|hai)?\b/gi, 'are not generating properly'],
    [/\bwronng\s+spelling\b/gi, 'spelling errors'],
    [/\bwrong\s+spelling\b/gi, 'spelling errors'],
    [/\breflect\s+hona\s+chahiye\b/gi, 'must be accurately reflected in accounting entries'],
    [/\bvisible\s+hona\s+chahiye\b/gi, 'must be visible and accessible on the interface'],
    [/\bconsider\s+krna\s+hai\b/gi, 'should be evaluated as Pass'],
    [/\bjysy\b/gi, 'just like'],
    [/\baysya\s+possible\s+h\s+kya\b/gi, 'validate if possible'],
    [/\bkr\s+sakta\s+h\s+kya\b/gi, 'can support'],
    [/\bkaro\b/gi, 'perform'],
    [/\bkarein\b/gi, 'perform'],
    [/\bkrna\s+h\b/gi, 'should be performed'],
    [/\bdekhna\s+hai\b/gi, 'verify that'],
    [/\bcheck\s+kro\b/gi, 'verify that'],
    [/\bcheck\s+karo\b/gi, 'verify that'],
    [/\bbata\s+de\b/gi, 'confirm that'],
    [/\bkoi\s+fyda\s+nahi\b/gi, 'ensure high utility and reliability'],
    [/\bsare\s+module\s+me\b/gi, 'across all modules'],
    [/\bsirf\s+ui\s+pe\s+buttons\s+visibble\s+h\b/gi, 'ensure end-to-end functionality beyond UI buttons'],
    [/\bpad\s+raha\s+h\b/gi, 'is required'],
    [/\bpad\s+raha\s+hai\b/gi, 'is required'],
  ];

  for (const [pattern, replacement] of phraseReplacements) {
    res = res.replace(pattern, replacement);
  }

  // Remove trailing or dangling Hindi particles
  res = res
    .replace(/\s+(me|se|ko|ka|ki|ke|pe|par)\s+/gi, ' ')
    .replace(/\s+(hai|hain|tha|thi|the|h)\b/gi, '')
    .trim();

  // Capitalize first character
  if (res.length > 0) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  // Ensure it starts with Verify if it sounds like a QA scenario
  if (!/^(verify|validate|ensure|confirm|check|if|when|for|in)\b/i.test(res)) {
    res = `Verify that ${res.charAt(0).toLowerCase() + res.slice(1)}`;
  }
  if (!/[.!?]$/.test(res)) {
    res += '.';
  }

  return res;
}

/**
 * Translates ANY language input (Hindi, Hinglish, Urdu, etc.) into clean, simple QA English.
 * Calls Gemini server-side AI endpoint first, with offline dictionary fallback.
 */
export async function translateToSimpleEnglish(
  rawText: string,
  context: string = 'test-scenario'
): Promise<string> {
  if (!rawText || !rawText.trim()) return '';

  try {
    const res = await fetch('/api/ai/polish-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText, context }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.polishedText) {
        return data.polishedText.trim();
      }
    }
  } catch (err) {
    console.warn('Backend language polish failed, falling back to local engine:', err);
  }

  return translateHinglishOffline(rawText);
}

/**
 * High-speed batch translation for all test cases in the table.
 * Translates in 1 single Gemini call rather than 80 individual calls.
 */
export async function batchTranslateTestCases(testCases: TestCaseItem[]): Promise<TestCaseItem[]> {
  if (!testCases || testCases.length === 0) return [];

  try {
    const res = await fetch('/api/ai/batch-translate-testcases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testCases }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.testCases)) {
        return data.testCases;
      }
    }
  } catch (err) {
    console.warn('Batch translation API call failed, falling back to per-item translator:', err);
  }

  // Fallback: translate using autoTranslateTestCaseItem
  return Promise.all(testCases.map((tc) => autoTranslateTestCaseItem(tc, true)));
}

/**
 * Processes a natural language command (in any language) and generates both
 * translated English text and a ready-to-insert structured test case.
 */
export async function processLanguageCommand(
  command: string,
  moduleName: string = 'Term Loan',
  ticketNo: string = '1024'
): Promise<ConvertedCommandResult> {
  if (!command || !command.trim()) {
    return { englishText: '' };
  }

  try {
    const res = await fetch('/api/ai/convert-language-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, moduleName, ticketNo }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          englishText: data.englishText || command,
          structuredTestCase: data.structuredTestCase,
          structuredTestCases: Array.isArray(data.structuredTestCases) && data.structuredTestCases.length > 0
            ? data.structuredTestCases
            : (data.structuredTestCase ? [data.structuredTestCase] : undefined),
        };
      }
    }
  } catch (err) {
    console.warn('Backend command converter failed, using local parser:', err);
  }

  // Local fallback matching corporate GPT style strictly derived from the user's command
  const translated = translateHinglishOffline(command);
  const isNegative = /error|invalid|fail|alert|disable|not|must not|cannot|prevent|restrict/i.test(translated);
  const cleanAction = translated.replace(/^(verify that|validate that|ensure that)\s+/i, '').replace(/\.+$/, '').trim();

  const singleCase = {
    testScenario: `Validate ${cleanAction.slice(0, 85)}`,
    testCases: `Verify that ${cleanAction}.`,
    expectedResult: isNegative
      ? `The system should restrict the invalid operation (${cleanAction}) and display an appropriate validation message.`
      : `The system should successfully process and validate that ${cleanAction} as expected.`,
    actualResult: isNegative
      ? `The system restricted the invalid operation and displayed the appropriate validation message.`
      : `Verified successfully: ${cleanAction.charAt(0).toUpperCase() + cleanAction.slice(1)} is working as expected.`,
    validationScenario: isNegative ? 'Negative Validation' : 'Positive Workflow',
  };

  return {
    englishText: translated,
    structuredTestCase: singleCase,
    structuredTestCases: [singleCase],
  };
}

/**
 * Automatically translates and standardizes an entire TestCase item.
 */
export async function autoTranslateTestCaseItem(
  tc: TestCaseItem,
  forceTranslate: boolean = false
): Promise<TestCaseItem> {
  const needsTranslation =
    forceTranslate ||
    isNonEnglishOrHinglish(tc.testScenario) ||
    isNonEnglishOrHinglish(tc.testCases) ||
    isNonEnglishOrHinglish(tc.expectedResult) ||
    isNonEnglishOrHinglish(tc.actualResult || '');

  if (!needsTranslation) return tc;

  const [translatedScenario, translatedCases, translatedExpected, translatedActual] = await Promise.all([
    (forceTranslate || isNonEnglishOrHinglish(tc.testScenario)) ? translateToSimpleEnglish(tc.testScenario) : Promise.resolve(tc.testScenario),
    (forceTranslate || isNonEnglishOrHinglish(tc.testCases)) ? translateToSimpleEnglish(tc.testCases) : Promise.resolve(tc.testCases),
    (forceTranslate || isNonEnglishOrHinglish(tc.expectedResult)) ? translateToSimpleEnglish(tc.expectedResult) : Promise.resolve(tc.expectedResult),
    (tc.actualResult && (forceTranslate || isNonEnglishOrHinglish(tc.actualResult)))
      ? translateToSimpleEnglish(tc.actualResult)
      : Promise.resolve(tc.actualResult || ''),
  ]);

  return {
    ...tc,
    testScenario: translatedScenario,
    testCases: translatedCases,
    expectedResult: translatedExpected,
    actualResult: translatedActual,
  };
}
