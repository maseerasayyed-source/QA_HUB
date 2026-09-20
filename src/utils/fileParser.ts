import * as XLSX from 'xlsx';
import { AttachedDocOrImage, TestCaseItem, TestCaseHeaderMeta } from '../types';

export interface CorporateExcelParseResult {
  headerMeta: Partial<TestCaseHeaderMeta>;
  testCases: TestCaseItem[];
  sheetName: string;
  totalRows: number;
}

/**
 * Compresses an image data URL to a max dimension and quality
 * to guarantee it fits in browser localStorage without QuotaExceededError.
 */
export function compressImage(dataUrl: string, maxWidth = 1024, maxHeight = 1024, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

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
      reader.onload = async (e) => {
        const rawUrl = e.target?.result as string;
        const compressedUrl = await compressImage(rawUrl);
        // Detect likely financial screen fields from file name or standard financial domain
        const defaultFields = detectFieldsFromFileName(file.name);
        resolve({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: 'image',
          url: compressedUrl,
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
 * Parses a Corporate Test Case Excel Sheet (e.g. Treasury Master / Beacon Web format)
 * Handles both the Top Metadata Block (Ticket No, Client Name, Branch, Task Name, Task done by, Sign off By)
 * and the Test Cases Table starting at Row 9 or any dynamic header row.
 */
export async function parseCorporateExcelSheet(file: File): Promise<CorporateExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        
        // Find best sheet: prefer "Test case", "Test Cases", or first sheet
        let targetSheetName = workbook.SheetNames[0] || 'Sheet1';
        for (const sName of workbook.SheetNames) {
          const lower = sName.toLowerCase();
          if (lower.includes('test case') || lower === 'testcase' || lower === 'test cases') {
            targetSheetName = sName;
            break;
          }
        }

        const sheet = workbook.Sheets[targetSheetName];
        if (!sheet) {
          resolve({ headerMeta: {}, testCases: [], sheetName: targetSheetName, totalRows: 0 });
          return;
        }

        // Get raw 2D grid
        const rawGrid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        const headerMeta: Partial<TestCaseHeaderMeta> = {};

        // 1. Scan rows 0 to 12 for Top Metadata Header (e.g. "Ticket No - FEATURE 22609", "Client Name:-Treasury Master", etc.)
        for (let r = 0; r < Math.min(rawGrid.length, 12); r++) {
          const row = rawGrid[r] || [];
          for (let c = 0; c < Math.min(row.length, 5); c++) {
            const cellStr = String(row[c] || '').trim();
            if (!cellStr) continue;

            const lower = cellStr.toLowerCase();
            if (lower.includes('ticket no') || lower.includes('ticket:')) {
              // Extract ticket number
              const val = cellStr.replace(/^ticket\s*no\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.ticketNo = val;
            } else if (lower.includes('client name')) {
              const val = cellStr.replace(/^client\s*name\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.clientName = val;
            } else if (lower.includes('branch:')) {
              const val = cellStr.replace(/^branch\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.branch = val;
            } else if (lower.includes('task name') || lower.includes('feature name')) {
              const val = cellStr.replace(/^(task|feature)\s*name\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.taskName = val;
            } else if (lower.includes('task done by') || lower.includes('task done') || lower.includes('qa:')) {
              const val = cellStr.replace(/^task\s*done\s*by\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.taskDoneBy = val;
            } else if (lower.includes('sign off by') || lower.includes('sign off:')) {
              const val = cellStr.replace(/^sign\s*off\s*by\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.signOffBy = val;
            } else if (lower.includes('sha :') || lower.includes('sha:')) {
              const val = cellStr.replace(/^sha\s*[:-]?\s*/i, '').trim();
              if (val) headerMeta.sha = val;
            }
          }
        }

        // 2. Locate Table Header Row (containing TestCase_ID or Test Scenario or Test Cases)
        let headerRowIndex = -1;
        let colMap: Record<string, number> = {};

        for (let r = 0; r < Math.min(rawGrid.length, 25); r++) {
          const row = rawGrid[r] || [];
          const rowStr = row.map((c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');

          if (
            rowStr.includes('testcase') ||
            rowStr.includes('testscenario') ||
            rowStr.includes('scenario') ||
            (rowStr.includes('expected') && rowStr.includes('actual'))
          ) {
            headerRowIndex = r;
            // Build column map
            row.forEach((cellVal, cIdx) => {
              const norm = String(cellVal).toLowerCase().replace(/[^a-z0-9]/g, '');
              if (norm.includes('testcaseid') || norm === 'tcid' || norm === 'id' || norm.includes('testcase')) {
                if (!colMap['testCaseId']) colMap['testCaseId'] = cIdx;
              }
              if (norm.includes('testmodule') || (norm.includes('module') && !colMap['testModule'])) {
                colMap['testModule'] = cIdx;
              }
              if (norm.includes('featuretab') || norm.includes('flag') || norm.includes('report') || norm.includes('tab')) {
                colMap['featureTab'] = cIdx;
              }
              if (norm.includes('testscenario') || (norm.includes('scenario') && !colMap['testScenario'])) {
                colMap['testScenario'] = cIdx;
              }
              if (
                (norm.includes('testcases') || norm.includes('teststeps') || norm.includes('steps')) &&
                cIdx !== colMap['testScenario']
              ) {
                colMap['testCases'] = cIdx;
              }
              if (norm.includes('inputs') || norm.includes('testinputs') || norm.includes('data')) {
                colMap['testInputs'] = cIdx;
              }
              if (norm.includes('expected')) {
                colMap['expectedResult'] = cIdx;
              }
              if (norm.includes('actual')) {
                colMap['actualResult'] = cIdx;
              }
              if (norm.includes('status') || norm === 'result') {
                colMap['status'] = cIdx;
              }
              if (norm.includes('screenshot1') || (norm.includes('screenshot') && !colMap['screenshot1'])) {
                colMap['screenshot1'] = cIdx;
              }
              if (norm.includes('screenshot2')) colMap['screenshot2'] = cIdx;
              if (norm.includes('screenshot3')) colMap['screenshot3'] = cIdx;
              if (norm.includes('screenshot4')) colMap['screenshot4'] = cIdx;
            });
            break;
          }
        }

        // Fallback column positions if specific columns were not matched by name
        if (headerRowIndex !== -1) {
          if (colMap['testCaseId'] === undefined) colMap['testCaseId'] = 0;
          if (colMap['testScenario'] === undefined) colMap['testScenario'] = 3;
          if (colMap['testCases'] === undefined) colMap['testCases'] = 4;
          if (colMap['expectedResult'] === undefined) colMap['expectedResult'] = 6;
          if (colMap['actualResult'] === undefined) colMap['actualResult'] = 7;
        }

        const testCases: TestCaseItem[] = [];

        if (headerRowIndex !== -1) {
          for (let r = headerRowIndex + 1; r < rawGrid.length; r++) {
            const row = rawGrid[r] || [];
            if (row.length === 0) continue;

            const tcIdVal = String(row[colMap['testCaseId'] ?? 0] || '').trim();
            const scenarioVal = String(row[colMap['testScenario'] ?? 3] || '').trim();
            const stepsVal = String(row[colMap['testCases'] ?? 4] || '').trim();
            const expectedVal = String(row[colMap['expectedResult'] ?? 6] || '').trim();
            const actualVal = String(row[colMap['actualResult'] ?? 7] || '').trim();

            // Skip completely empty rows
            if (!tcIdVal && !scenarioVal && !stepsVal && !expectedVal) continue;

            const moduleVal = colMap['testModule'] !== undefined ? String(row[colMap['testModule']] || '').trim() : '';
            const featureTabVal = colMap['featureTab'] !== undefined ? String(row[colMap['featureTab']] || '').trim() : '';
            const inputsVal = colMap['testInputs'] !== undefined ? String(row[colMap['testInputs']] || '').trim() : '';
            const rawStatus = colMap['status'] !== undefined ? String(row[colMap['status']] || '').toLowerCase().trim() : '';

            let status: 'pass' | 'fail' | 'blocked' | 'not run' = 'not run';
            if (rawStatus.includes('pass')) status = 'pass';
            else if (rawStatus.includes('fail')) status = 'fail';
            else if (rawStatus.includes('block')) status = 'blocked';

            const screenshot1 = colMap['screenshot1'] !== undefined ? String(row[colMap['screenshot1']] || '').trim() : '';
            const screenshot2 = colMap['screenshot2'] !== undefined ? String(row[colMap['screenshot2']] || '').trim() : '';
            const screenshot3 = colMap['screenshot3'] !== undefined ? String(row[colMap['screenshot3']] || '').trim() : '';
            const screenshot4 = colMap['screenshot4'] !== undefined ? String(row[colMap['screenshot4']] || '').trim() : '';

            const attachments = [];
            if (screenshot1) attachments.push({ id: `att-${Date.now()}-1`, name: 'Evidence 1', url: screenshot1 });
            if (screenshot2) attachments.push({ id: `att-${Date.now()}-2`, name: 'Evidence 2', url: screenshot2 });
            if (screenshot3) attachments.push({ id: `att-${Date.now()}-3`, name: 'Evidence 3', url: screenshot3 });
            if (screenshot4) attachments.push({ id: `att-${Date.now()}-4`, name: 'Evidence 4', url: screenshot4 });

            testCases.push({
              id: `imported-excel-${Date.now()}-${testCases.length + 1}`,
              testCaseId: tcIdVal || `TC0${testCases.length + 1}`,
              testModule: moduleVal || 'CC/OD and Bank Balance',
              featureTab: featureTabVal || 'Bank Balance Master',
              testScenario: scenarioVal || `Validate ${headerMeta.taskName || 'Scenario'}`,
              testCases: stepsVal || '1. Navigate to screen.\n2. Execute test step.\n3. Verify response.',
              testInputs: inputsVal,
              expectedResult: expectedVal || 'System functions in accordance with specifications.',
              actualResult: actualVal || 'Verified successfully as expected.',
              status,
              reviewStatus: 'Draft',
              version: '1.0',
              screenshot1: screenshot1 || undefined,
              screenshot2: screenshot2 || undefined,
              screenshot3: screenshot3 || undefined,
              screenshot4: screenshot4 || undefined,
              attachments,
              isAiGenerated: false,
              createdBy: headerMeta.taskDoneBy || 'Imported from Excel',
              authorRole: 'QA',
              createdAt: new Date().toLocaleDateString(),
            });
          }
        }

        resolve({
          headerMeta,
          testCases,
          sheetName: targetSheetName,
          totalRows: testCases.length,
        });
      } catch (err) {
        console.error('Corporate Excel parser error:', err);
        resolve({ headerMeta: {}, testCases: [], sheetName: 'Sheet1', totalRows: 0 });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract test cases from an uploaded Excel or text file for QA Review
 */
export async function parseTestCasesFromFile(file: File): Promise<TestCaseItem[]> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

  if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
    const corpResult = await parseCorporateExcelSheet(file);
    if (corpResult.testCases.length > 0) {
      return corpResult.testCases;
    }
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
