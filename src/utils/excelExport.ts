import ExcelJS from 'exceljs';
import {
  TestCaseHeaderMeta,
  TestCaseItem,
  ObservationHeaderMeta,
  ObservationItem,
  DeveloperTestHeaderMeta,
  DeveloperTestItem,
} from '../types';

// Standard styling constants
const NAVY_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A8A' }, // Corporate Beacon Navy #1E3A8A
};

const CORPORATE_PEACH_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFADBD8' }, // Corporate Peach / Soft Coral #FADBD8 as in user image
};

const CORPORATE_BLUE_META_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF5DADE2' }, // Corporate Sky Blue #5DADE2 as in user image
};

const ZEBRA_LIGHT_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' }, // Light slate #F8FAFC
};

const WHITE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF0F172A' } },
  bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
  left: { style: 'thin', color: { argb: 'FF334155' } },
  right: { style: 'thin', color: { argb: 'FF334155' } },
};

const META_BG_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' }, // #F1F5F9
};

// Status cell styling maps
const STATUS_STYLES: Record<string, { fill: ExcelJS.Fill; font: Partial<ExcelJS.Font> }> = {
  pass: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }, // #DCFCE7
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } }, // #166534
  },
  fail: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }, // #FEE2E2
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } }, // #991B1B
  },
  blocked: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, // #FEF3C7
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } }, // #92400E
  },
  'not run': {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, // #F1F5F9
    font: { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF475569' } }, // #475569
  },
};

/**
 * Helper to parse base64 image data string into extension and clean base64 string
 */
function parseBase64Image(dataUrl: string): { extension: 'png' | 'jpeg'; base64: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.substring(0, commaIdx).toLowerCase();
  const base64Data = dataUrl.substring(commaIdx + 1);
  const ext = header.includes('png') ? 'png' : 'jpeg';
  return { extension: ext, base64: base64Data };
}

/**
 * Creates a fully styled ExcelJS Workbook for Test Cases with Embedded Screenshot Images
 */
export async function buildTestCasesWorkbook(
  headerMeta: TestCaseHeaderMeta,
  testCases: TestCaseItem[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = headerMeta.taskDoneBy || 'Beacon QA Hub';
  workbook.lastModifiedBy = headerMeta.signOffBy || 'Beacon QA Hub';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Test Cases', {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 20 },
  });

  // 1. Setup Column Widths
  worksheet.columns = [
    { key: 'testCaseId', width: 16 },
    { key: 'testModule', width: 22 },
    { key: 'featureTab', width: 26 },
    { key: 'testScenario', width: 44 },
    { key: 'testCases', width: 52 },
    { key: 'expectedResult', width: 46 },
    { key: 'actualResult', width: 46 },
    { key: 'status', width: 14 },
    { key: 'screenshot1', width: 30 },
    { key: 'screenshot2', width: 30 },
    { key: 'screenshot3', width: 30 },
    { key: 'screenshot4', width: 30 },
  ];

  // 2. Metadata Rows (Rows 1 to 6) - Styled in light cyan/blue matching Screenshot 3
  const metaRows = [
    `Ticket No - ${headerMeta.ticketNo || ''}`,
    `Client Name:-${headerMeta.clientName || ''}`,
    `Branch: ${headerMeta.branch || 'Beaconweb+Release'}`,
    `Task Name:${headerMeta.taskName || ''}`,
    `Task done by-${headerMeta.taskDoneBy || ''}`,
    `Sign off By - ${headerMeta.signOffBy || ''}`,
  ];

  metaRows.forEach((text, index) => {
    const rowNumber = index + 1;
    const row = worksheet.getRow(rowNumber);
    row.height = 22;
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F2942' } };
    cell.fill = CORPORATE_BLUE_META_FILL;
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  // Rows 7 & 8 are spacing rows
  worksheet.getRow(7).height = 12;
  worksheet.getRow(8).height = 12;

  // 3. Table Headers (Row 9) - Matching user's Screenshot 3
  const headerTitles = [
    'TestCase_ID',
    'Test Module',
    'feature tab /flag/ report',
    'Test Scenario',
    'Test Cases',
    'Expected Result',
    'Actual Result',
    'Status',
    'Screenshot1',
    'Screenshot2',
    'Screenshot3',
    'Screenshot4',
  ];

  const headerRow = worksheet.getRow(9);
  headerRow.height = 30;

  headerTitles.forEach((title, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    cell.value = title;
    cell.fill = CORPORATE_PEACH_HEADER_FILL;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = HEADER_BORDER;
  });

  // 4. Data Rows (Starting at Row 10)
  testCases.forEach((tc, rowIndex) => {
    const currentRowNumber = 10 + rowIndex; // 1-based row index in Excel
    const row = worksheet.getRow(currentRowNumber);

    const isEven = rowIndex % 2 === 0;
    const defaultFill: ExcelJS.Fill = isEven ? WHITE_FILL : ZEBRA_LIGHT_FILL;

    // Determine screenshot URLs
    const screenShots = [
      tc.screenshot1 || (tc.attachments && tc.attachments[0]?.url) || '',
      tc.screenshot2 || (tc.attachments && tc.attachments[1]?.url) || '',
      tc.screenshot3 || (tc.attachments && tc.attachments[2]?.url) || '',
      tc.screenshot4 || (tc.attachments && tc.attachments[3]?.url) || '',
    ];

    const hasAnyImage = screenShots.some((s) => s && s.startsWith('data:image'));
    row.height = hasAnyImage ? 95 : 44;

    const rowValues = [
      tc.testCaseId || '',
      tc.testModule || '',
      tc.featureTab || '',
      tc.testScenario || '',
      tc.testCases || '',
      tc.expectedResult || '',
      tc.actualResult || '',
      (tc.status || 'not run').toLowerCase(),
      screenShots[0] ? (screenShots[0].startsWith('data:image') ? 'Screenshot 1' : screenShots[0]) : '',
      screenShots[1] ? (screenShots[1].startsWith('data:image') ? 'Screenshot 2' : screenShots[1]) : '',
      screenShots[2] ? (screenShots[2].startsWith('data:image') ? 'Screenshot 3' : screenShots[2]) : '',
      screenShots[3] ? (screenShots[3].startsWith('data:image') ? 'Screenshot 4' : screenShots[3]) : '',
    ];

    rowValues.forEach((val, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const isStatusCol = colIndex === 7;
      const isScreenshotCol = colIndex >= 8;

      // Fill & Borders
      cell.border = THIN_BORDER;

      if (isStatusCol) {
        const normStatus = (val as string).toLowerCase().trim();
        const style = STATUS_STYLES[normStatus] || STATUS_STYLES['not run'];
        cell.value = normStatus.toUpperCase();
        cell.fill = style.fill;
        cell.font = style.font;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (isScreenshotCol) {
        cell.fill = defaultFill;
        const shotIdx = colIndex - 8;
        const shotUrl = screenShots[shotIdx];

        if (shotUrl && shotUrl.startsWith('data:image')) {
          const imgInfo = parseBase64Image(shotUrl);
          if (imgInfo) {
            cell.value = `Evidence ${shotIdx + 1}`;
            cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF475569' } };
            cell.alignment = { vertical: 'top', horizontal: 'left' };
            try {
              const imageId = workbook.addImage({
                base64: imgInfo.base64,
                extension: imgInfo.extension,
              });
              worksheet.addImage(imageId, {
                tl: { col: colIndex, row: currentRowNumber - 1 },
                ext: { width: 170, height: 80 },
                editAs: 'oneCell',
              });
            } catch (e) {
              console.error('Failed to embed screenshot into Excel', e);
            }
          }
        } else if (shotUrl && shotUrl.startsWith('http')) {
          cell.value = {
            text: `View Screenshot ${shotIdx + 1}`,
            hyperlink: shotUrl,
          };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2563EB' }, underline: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = val;
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      } else {
        cell.value = val;
        cell.fill = defaultFill;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        const isCenter = colIndex === 0 || colIndex === 1;
        cell.alignment = {
          vertical: 'top',
          horizontal: isCenter ? 'center' : 'left',
          wrapText: true,
        };
      }
    });
  });

  return workbook;
}

/**
 * Generates an ExcelJS Blob for Test Cases (used for Azure DevOps and Browser Download)
 */
export async function getTestCasesExcelBlob(
  headerMeta: TestCaseHeaderMeta,
  testCases: TestCaseItem[],
  customFileName?: string
): Promise<{ blob: Blob; fileName: string; buffer: ArrayBuffer }> {
  const workbook = await buildTestCasesWorkbook(headerMeta, testCases);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const baseName = headerMeta.taskName
    ? headerMeta.taskName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
    : 'test_cases';
  const fileName = customFileName || `${baseName}_testing.xlsx`;

  return { blob, fileName, buffer };
}

/**
 * Triggers direct browser download of styled Test Cases Excel (.xlsx)
 */
export async function exportTestCasesToExcel(
  headerMeta: TestCaseHeaderMeta,
  testCases: TestCaseItem[],
  customFileName?: string
) {
  const { blob, fileName } = await getTestCasesExcelBlob(headerMeta, testCases, customFileName);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Creates a fully styled ExcelJS Workbook for Observations & RFEs with Embedded Screenshots
 */
export async function buildObservationsWorkbook(
  headerMeta: ObservationHeaderMeta,
  observations: ObservationItem[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = headerMeta.qaOwner || 'Beacon QA Hub';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Observations_RFE', {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 20 },
  });

  worksheet.columns = [
    { key: 'serialNo', width: 18 },
    { key: 'type', width: 16 },
    { key: 'observationRFE', width: 55 },
    { key: 'attachments', width: 36 },
    { key: 'priority', width: 16 },
    { key: 'status', width: 26 },
  ];

  // Metadata block (Rows 1-6 matching Picture 4)
  const metaRows = [
    `Client Name:-${headerMeta.clientName || 'Treasury Master'}`,
    `Client Name:-${headerMeta.clientName || 'Treasury Master'}`,
    `SHA : ${headerMeta.sha || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*'}`,
    `Task Name: ${headerMeta.taskName || headerMeta.ticketName || 'penalty overdue report'}`,
    `Task done by-${headerMeta.qaOwner || 'Maseera Sayyed'}`,
    `Sign off By - ${headerMeta.signOffBy || 'Ashwini poke'}`,
  ];

  metaRows.forEach((text, index) => {
    const row = worksheet.getRow(index + 1);
    row.height = 22;
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F2942' } };
    cell.fill = META_BG_FILL;
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  worksheet.getRow(7).height = 12; // spacing

  // Headers (Row 8)
  const headerRow = worksheet.getRow(8);
  headerRow.height = 28;
  const headers = [
    'Observation / RFE ID',
    'Type',
    'Observations / RFE',
    'Screen shots / File Attachment',
    'Priority',
    'Status',
  ];

  headers.forEach((title, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    cell.value = title;
    cell.fill = NAVY_HEADER_FILL;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = HEADER_BORDER;
  });

  // Data rows (Row 9 onwards)
  observations.forEach((obs, rowIndex) => {
    const rowNumber = 9 + rowIndex; // 1-based row index in Excel
    const row = worksheet.getRow(rowNumber);

    const isEven = rowIndex % 2 === 0;
    const defaultFill: ExcelJS.Fill = isEven ? WHITE_FILL : ZEBRA_LIGHT_FILL;

    let attachmentDisplay = 'None';
    let firstUrl = '';
    let hasBase64Image = false;
    let base64ImgInfo: { extension: 'png' | 'jpeg'; base64: string } | null = null;

    if (obs.attachments && obs.attachments.length > 0) {
      attachmentDisplay = obs.attachments.map((a) => a.name).join('; ');
      firstUrl = obs.attachments[0].url || '';
    } else if (obs.screenshotName) {
      attachmentDisplay = obs.screenshotName;
      firstUrl = obs.screenshotUrl || '';
    }

    if (firstUrl) {
      base64ImgInfo = parseBase64Image(firstUrl);
      if (base64ImgInfo) {
        hasBase64Image = true;
      }
    }

    row.height = hasBase64Image ? 90 : 36;

    const values = [
      obs.serialNo,
      obs.type || 'Observation',
      obs.observationRFE,
      attachmentDisplay,
      obs.priority,
      obs.status,
    ];

    values.forEach((val, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.border = THIN_BORDER;

      if (colIndex === 3) {
        // Attachment column (Column D)
        cell.fill = defaultFill;
        if (hasBase64Image && base64ImgInfo) {
          cell.value = attachmentDisplay;
          cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF475569' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

          try {
            const imageId = workbook.addImage({
              base64: base64ImgInfo.base64,
              extension: base64ImgInfo.extension,
            });

            worksheet.addImage(imageId, {
              tl: { col: 3, row: rowNumber - 1 }, // Column D (index 3)
              ext: { width: 190, height: 85 },
              editAs: 'oneCell',
            });
          } catch (e) {
            console.error('Failed to embed image into observation row', e);
          }
        } else if (firstUrl && firstUrl.startsWith('http')) {
          cell.value = { text: attachmentDisplay, hyperlink: firstUrl };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2563EB' }, underline: true };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else {
          cell.value = val;
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }
      } else {
        cell.value = val;
        cell.fill = defaultFill;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        cell.alignment = {
          vertical: 'top',
          horizontal: colIndex === 0 || colIndex === 1 || colIndex === 4 ? 'center' : 'left',
          wrapText: true,
        };
      }
    });
  });

  return workbook;
}

export async function getObservationsExcelBlob(
  headerMeta: ObservationHeaderMeta,
  observations: ObservationItem[],
  customFileName?: string
): Promise<{ blob: Blob; fileName: string; buffer: ArrayBuffer }> {
  const workbook = await buildObservationsWorkbook(headerMeta, observations);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const ticketId = headerMeta.ticketNo ? headerMeta.ticketNo.trim().replace(/^#+/, '') : 'ticket';
  const fileName = customFileName || `#${ticketId} - observation/RFE.xlsx`;
  return { blob, fileName, buffer };
}

export async function exportObservationsToExcel(
  headerMeta: ObservationHeaderMeta,
  observations: ObservationItem[],
  customFileName?: string
) {
  const { blob, fileName } = await getObservationsExcelBlob(headerMeta, observations, customFileName);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Creates a fully styled ExcelJS Workbook for Developer Testing
 */
export async function buildDeveloperTestingWorkbook(
  headerMeta: DeveloperTestHeaderMeta,
  records: DeveloperTestItem[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = headerMeta.developer || 'Beacon Developer Hub';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Developer_Testing', {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 20 },
  });

  worksheet.columns = [
    { key: 'scenarioId', width: 16 },
    { key: 'scenario', width: 34 },
    { key: 'testDescription', width: 46 },
    { key: 'testData', width: 36 },
    { key: 'expectedResult', width: 44 },
    { key: 'actualResult', width: 44 },
    { key: 'status', width: 18 },
    { key: 'attachments', width: 32 },
    { key: 'remarks', width: 36 },
  ];

  // Metadata
  const metaRows = [
    `Ticket Number : ${headerMeta.ticketNo || ''}`,
    `Feature / Task Name : ${headerMeta.featureName || ''}`,
    `Developer : ${headerMeta.developer || ''}`,
    `Dev Test Date : ${headerMeta.devTestDate || new Date().toISOString().split('T')[0]}`,
    `Sign off / Reviewer : ${headerMeta.signOffBy || ''}`,
    `SHA Commit : ${headerMeta.shaCommit || ''}`,
  ];

  metaRows.forEach((text, index) => {
    const row = worksheet.getRow(index + 1);
    row.height = 22;
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F2942' } };
    cell.fill = META_BG_FILL;
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  worksheet.getRow(7).height = 12; // spacing

  // Headers
  const headerRow = worksheet.getRow(8);
  headerRow.height = 30;
  const headers = [
    'Scenario ID',
    'Scenario',
    'Test Description / Steps',
    'Test Data & Inputs',
    'Expected Result',
    'Actual Result',
    'Status',
    'Screen shots / File Attachments',
    'Remarks / Limitations',
  ];

  headers.forEach((title, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    cell.value = title;
    cell.fill = NAVY_HEADER_FILL;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = HEADER_BORDER;
  });

  // Data rows
  records.forEach((rec, rowIndex) => {
    const rowNumber = 9 + rowIndex;
    const row = worksheet.getRow(rowNumber);
    row.height = 34;

    const isEven = rowIndex % 2 === 0;
    const defaultFill: ExcelJS.Fill = isEven ? WHITE_FILL : ZEBRA_LIGHT_FILL;

    let attachmentDisplay = 'None';
    let firstUrl = '';
    if (rec.attachments && rec.attachments.length > 0) {
      attachmentDisplay = rec.attachments.map((a) => a.name).join('; ');
      firstUrl = rec.attachments[0].url || '';
    }

    const values = [
      rec.scenarioId,
      rec.scenario,
      rec.testDescription,
      rec.testData,
      rec.expectedResult,
      rec.actualResult,
      rec.status,
      attachmentDisplay,
      rec.remarks,
    ];

    values.forEach((val, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.border = THIN_BORDER;

      if (colIndex === 6) {
        // Status column
        const norm = (val || '').toLowerCase();
        const style = STATUS_STYLES[norm] || STATUS_STYLES['not run'];
        cell.value = val;
        cell.fill = style.fill;
        cell.font = style.font;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colIndex === 7 && firstUrl && firstUrl.startsWith('http')) {
        cell.value = { text: attachmentDisplay, hyperlink: firstUrl };
        cell.fill = defaultFill;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2563EB' }, underline: true };
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      } else {
        cell.value = val;
        cell.fill = defaultFill;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        cell.alignment = {
          vertical: 'top',
          horizontal: colIndex === 0 ? 'center' : 'left',
          wrapText: true,
        };
      }
    });
  });

  return workbook;
}

export async function getDeveloperTestingExcelBlob(
  headerMeta: DeveloperTestHeaderMeta,
  records: DeveloperTestItem[],
  customFileName?: string
): Promise<{ blob: Blob; fileName: string; buffer: ArrayBuffer }> {
  const workbook = await buildDeveloperTestingWorkbook(headerMeta, records);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const cleanTicket = headerMeta.ticketNo ? headerMeta.ticketNo.replace(/[^a-zA-Z0-9_-]/g, '_') : 'ticket';
  const fileName = customFileName || `DevTesting_${cleanTicket}.xlsx`;
  return { blob, fileName, buffer };
}

export async function exportDeveloperTestingToExcel(
  headerMeta: DeveloperTestHeaderMeta,
  records: DeveloperTestItem[],
  customFileName?: string
) {
  const { blob, fileName } = await getDeveloperTestingExcelBlob(headerMeta, records, customFileName);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
