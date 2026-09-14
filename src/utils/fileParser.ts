import * as XLSX from 'xlsx';
import { AttachedDocOrImage, TestCaseItem } from '../types';

/**
 * Extract fields and text from an uploaded file (Excel, Word, Image, Text)
 */
export async function parseUploadedFile(file: File): Promise<AttachedDocOrImage> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

  // 1. Image file
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        // Detect likely financial screen fields from file name or standard financial domain
        const defaultFields = detectFieldsFromFileName(file.name);
        resolve({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: 'image',
          url: url,
          size: sizeStr,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detectedFields: defaultFields,
          extractedContent: `Screenshot attached: ${file.name}. Contains UI fields for screen validation.`,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // 2. Excel file (.xlsx, .xls, .csv)
  if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          // Extract headers as fields
          const headers = (rows[0] || []).map((h) => String(h).trim()).filter(Boolean);
          const sampleRows = rows.slice(1, 10).map((r) => r.join(' | ')).join('\n');

          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'excel',
            size: sizeStr,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            detectedFields: headers.length > 0 ? headers : ['Deal ID', 'Amount', 'Date', 'Status'],
            extractedContent: `Excel Sheet: ${firstSheet}\nHeaders: ${headers.join(', ')}\nSample Data:\n${sampleRows}`,
          });
        } catch (err) {
          resolve({
            id: `file-${Date.now()}`,
            name: file.name,
            type: 'excel',
            size: sizeStr,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            detectedFields: ['Deal ID', 'Value Date', 'Rate', 'Amount'],
            extractedContent: `Excel file uploaded: ${file.name}`,
          });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // 3. Word / Text document (.docx, .doc, .txt, .pdf)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const extractedFields = extractFieldsFromText(text, file.name);
      resolve({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        type: fileExt.includes('doc') ? 'word' : fileExt === 'pdf' ? 'pdf' : 'text',
        size: sizeStr,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detectedFields: extractedFields,
        extractedContent: text.slice(0, 3000),
      });
    };
    reader.readAsText(file);
  });
}

/**
 * Extract test cases from an uploaded Excel or text file for QA Review
 */
export async function parseTestCasesFromFile(file: File): Promise<TestCaseItem[]> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

  if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

          if (rawRows.length > 0) {
            const parsed: TestCaseItem[] = rawRows.map((row, idx) => {
              // Flexible column matching
              const findVal = (...keys: string[]) => {
                for (const k of Object.keys(row)) {
                  const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                  for (const target of keys) {
                    if (lowerK.includes(target.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                      return String(row[k]);
                    }
                  }
                }
                return '';
              };

              const tcId = findVal('testcaseid', 'tcid', 'caseid', 'id') || `TC${idx + 1}`;
              const scenario = findVal('scenario', 'testscenario', 'title', 'summary', 'feature') || `Test Scenario ${idx + 1}`;
              const steps = findVal('testcases', 'steps', 'teststeps', 'action', 'description') || '1. Perform action.\n2. Verify result.';
              const inputs = findVal('testinputs', 'inputs', 'data', 'parameters') || '';
              const expected = findVal('expectedresult', 'expected', 'expectedoutput') || 'System executes operation successfully.';
              const actual = findVal('actualresult', 'actual', 'outcome') || 'Pending execution';
              const statusRaw = findVal('status', 'result', 'state').toLowerCase();

              let status: 'pass' | 'fail' | 'blocked' | 'not run' = 'not run';
              if (statusRaw.includes('pass')) status = 'pass';
              else if (statusRaw.includes('fail')) status = 'fail';
              else if (statusRaw.includes('block')) status = 'blocked';

              return {
                id: `import-tc-${Date.now()}-${idx}`,
                testCaseId: tcId,
                testModule: 'Term Loan',
                featureTab: 'Review Import',
                testScenario: scenario,
                testCases: steps,
                testInputs: inputs,
                expectedResult: expected,
                actualResult: actual,
                status,
                reviewStatus: 'In Review',
                version: '1.0',
                isAiGenerated: true,
              };
            });
            resolve(parsed);
            return;
          }
        } catch (err) {
          console.error('Error parsing Excel file:', err);
        }
        resolve([]);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Fallback text/word parser
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const testCases: TestCaseItem[] = [];

      lines.slice(0, 15).forEach((line, idx) => {
        if (line.trim().length > 5) {
          testCases.push({
            id: `import-txt-${Date.now()}-${idx}`,
            testCaseId: `TC${idx + 1}`,
            testModule: 'Term Loan',
            featureTab: 'Doc Import',
            testScenario: line.trim(),
            testCases: `1. Open designated module.\n2. Execute scenario: ${line.trim()}.\n3. Verify results.`,
            testInputs: `Input parameters extracted from ${file.name}`,
            expectedResult: `System completes ${line.trim()} in accordance with requirement specification.`,
            actualResult: 'Pending execution',
            status: 'not run',
            reviewStatus: 'In Review',
            version: '1.0',
            isAiGenerated: true,
          });
        }
      });
      resolve(testCases);
    };
    reader.readAsText(file);
  });
}

function detectFieldsFromFileName(name: string): string[] {
  const lower = name.toLowerCase();
  const fields: string[] = ['Deal ID'];
  if (lower.includes('rate') || lower.includes('interest')) {
    fields.push('Index Rate', 'Spread', 'Effective Rate', 'Interest Reset Date');
  }
  if (lower.includes('penalty') || lower.includes('overdue')) {
    fields.push('Grace Period Days', 'Penalty Rate %', 'Overdue Amount', 'Notice Date');
  }
  if (lower.includes('disburse') || lower.includes('loan')) {
    fields.push('Disbursement Amount', 'Sanction Ref', 'Value Date', 'Repayment Tenor');
  }
  if (lower.includes('fee') || lower.includes('gst')) {
    fields.push('GSTIN', 'Fee Code', 'Tax Rate', 'Invoice Number');
  }
  if (fields.length <= 1) {
    fields.push('Deal ID', 'Principal Amount', 'Value Date', 'Maturity Date', 'Status');
  }
  return fields;
}

function extractFieldsFromText(text: string, fileName: string): string[] {
  const found = new Set<string>();
  const candidates = [
    'Deal ID',
    'Loan Account Number',
    'LAN',
    'Sanction Reference',
    'Principal Amount',
    'Disbursement Date',
    'Value Date',
    'Maturity Date',
    'Interest Rate',
    'Index Rate',
    'Spread',
    'Effective Rate',
    'Penalty Rate',
    'Grace Period',
    'Moratorium Period',
    'Repayment Frequency',
    'GSTIN',
    'Fee Code',
    'Collateral Ref',
    'Facility Type',
  ];

  candidates.forEach((c) => {
    if (text.toLowerCase().includes(c.toLowerCase()) || fileName.toLowerCase().includes(c.toLowerCase())) {
      found.add(c);
    }
  });

  if (found.size === 0) {
    return detectFieldsFromFileName(fileName);
  }
  return Array.from(found);
}
