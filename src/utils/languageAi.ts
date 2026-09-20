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
}

// Common Hindi/Hinglish QA keywords and patterns
const HINDI_INDICATORS = [
  'agar', 'jab', 'tab', 'hona chahiye', 'nahi', 'mat', 'chahiye', 'karo', 'dekhna',
  'galat', 'sahi', 'dikhe', 'daale', 'daalo', 'pehle', 'baad', 'zyada', 'kam',
  'kare', 'karna', 'aana', 'jana', 'chhod', 'khali', 'bhi', 'wala', 'wali',
  'kaise', 'kyun', 'kya', 'par', 'pe', 'me', 'se', 'ko', 'hai', 'hain', 'tha',
  'the', 'thi', 'hua', 'hoga', 'hogi', 'milna', 'dikhna', 'bhejna', 'roko'
];

/**
 * Checks if a string likely contains Hindi/Hinglish or non-standard casual language.
 */
export function isNonEnglishOrHinglish(text: string): boolean {
  if (!text || text.trim().length < 3) return false;
  const lower = text.toLowerCase();
  
  // Check for Devanagari script characters
  if (/[\u0900-\u097F]/.test(text)) return true;

  // Check for common Hinglish words
  let matchCount = 0;
  for (const word of HINDI_INDICATORS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      matchCount++;
      if (matchCount >= 1) return true;
    }
  }
  return false;
}

/**
 * Offline instantaneous dictionary translator for rapid client-side responses.
 */
export function translateHinglishOffline(text: string): string {
  if (!text) return '';
  let res = text.trim();

  const phraseReplacements: [RegExp, string][] = [
    [/\bagar\s+user\b/gi, 'if user'],
    [/\bagar\s+/gi, 'if '],
    [/\bjab\s+user\b/gi, 'when user'],
    [/\bjab\s+/gi, 'when '],
    [/\bblank\s+chhod\s+(de|diya|dein)\b/gi, 'is left blank'],
    [/\bempty\s+chhod\s+(de|diya)\b/gi, 'is left empty'],
    [/\bgalat\s+value\b/gi, 'invalid value'],
    [/\bgalat\s+/gi, 'invalid '],
    [/\bsahi\s+value\b/gi, 'valid value'],
    [/\bsahi\s+/gi, 'valid '],
    [/\berror\s+(aana|dikhe|show\s+hona)\s+chahiye\b/gi, 'an error message must be displayed'],
    [/\bpopup\s+(aana|open\s+hona)\s+chahiye\b/gi, 'a popup modal should appear'],
    [/\balert\s+(aana|show\s+hona)\s+chahiye\b/gi, 'an alert message should be displayed'],
    [/\bvalidation\s+fail\s+hona\s+chahiye\b/gi, 'validation should fail'],
    [/\bbutton\s+disable\s+hona\s+chahiye\b/gi, 'the button should be disabled'],
    [/\bbutton\s+enable\s+hona\s+chahiye\b/gi, 'the button should be enabled'],
    [/\bsave\s+ho\s+jana\s+chahiye\b/gi, 'record should be saved successfully'],
    [/\bsave\s+nahi\s+hona\s+chahiye\b/gi, 'record must not be saved'],
    [/\bdelete\s+ho\s+jana\s+chahiye\b/gi, 'item should be deleted successfully'],
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
  ];

  for (const [pattern, replacement] of phraseReplacements) {
    res = res.replace(pattern, replacement);
  }

  // Capitalize first character
  if (res.length > 0) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  // Ensure it starts with Verify if it sounds like a QA scenario
  if (!/^(verify|validate|ensure|confirm|check|if|when)\b/i.test(res)) {
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
        };
      }
    }
  } catch (err) {
    console.warn('Backend command converter failed, using local parser:', err);
  }

  // Local fallback matching corporate GPT style
  const translated = translateHinglishOffline(command);
  const isNegative = /error|invalid|fail|alert|disable|not|must not|cannot|prevent/i.test(translated);
  const cleanAction = translated.replace(/^(verify that|validate that|ensure that)\s+/i, '');

  return {
    englishText: translated,
    structuredTestCase: {
      testScenario: `Validate the functionality for ${cleanAction}`,
      testCases: `Verify that when ${cleanAction}, the corresponding actions and data remain properly handled in ${moduleName} for Ticket #${ticketNo}.`,
      expectedResult: isNegative
        ? `• System displays appropriate validation alert/error message.\n• Prevents invalid operation or mismatched balance.\n• Existing records remain unmodified.`
        : `• Operation executes successfully without errors.\n• Both related actions and transaction balances remain fully synchronized.\n• Status updates to completed state.`,
      actualResult: isNegative
        ? 'System successfully triggered validation alert and prevented invalid operation as expected.'
        : 'Operation completed successfully and all related actions and balances were synchronized correctly as expected.',
      validationScenario: isNegative ? 'Negative Validation' : 'Positive Workflow',
    },
  };
}

/**
 * Automatically translates and standardizes an entire TestCase item.
 */
export async function autoTranslateTestCaseItem(tc: TestCaseItem): Promise<TestCaseItem> {
  const needsTranslation =
    isNonEnglishOrHinglish(tc.testScenario) ||
    isNonEnglishOrHinglish(tc.testCases) ||
    isNonEnglishOrHinglish(tc.expectedResult) ||
    isNonEnglishOrHinglish(tc.actualResult || '');

  if (!needsTranslation) return tc;

  const [translatedScenario, translatedCases, translatedExpected, translatedActual] = await Promise.all([
    isNonEnglishOrHinglish(tc.testScenario) ? translateToSimpleEnglish(tc.testScenario) : Promise.resolve(tc.testScenario),
    isNonEnglishOrHinglish(tc.testCases) ? translateToSimpleEnglish(tc.testCases) : Promise.resolve(tc.testCases),
    isNonEnglishOrHinglish(tc.expectedResult) ? translateToSimpleEnglish(tc.expectedResult) : Promise.resolve(tc.expectedResult),
    tc.actualResult && isNonEnglishOrHinglish(tc.actualResult)
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
