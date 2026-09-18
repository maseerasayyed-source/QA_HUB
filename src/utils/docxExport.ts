import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { UserManualDoc, ManualStep, TestCaseHeaderMeta, TestCaseItem } from '../types';

/**
 * Converts a Base64 data URL string into an ArrayBuffer / Uint8Array for docx ImageRun
 */
function base64ToUint8Array(base64Str: string): Uint8Array | null {
  try {
    const parts = base64Str.split(',');
    const raw = window.atob(parts.length > 1 ? parts[1] : parts[0]);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  } catch (e) {
    console.warn('Failed to parse base64 image data for Word doc', e);
    return null;
  }
}

/**
 * Generate and download a formatted Microsoft Word (.docx) User Manual
 */
export async function exportUserManualToDocx(manual: UserManualDoc): Promise<void> {
  const primaryColor = '0F4C81'; // Beacon Executive Navy Blue
  const secondaryColor = '2563EB'; // Blue
  const darkSlate = '1E293B';
  const lightGreyBg = 'F1F5F9';
  const borderColor = 'CBD5E1';

  // Build Table of Steps
  const stepParagraphs: (Paragraph | Table)[] = [];

  for (const step of manual.workflowSteps) {
    // Step Heading
    stepParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Step ${step.stepNumber}: ${step.actionTitle}`,
            bold: true,
            size: 26,
            color: primaryColor,
          }),
        ],
        spacing: { before: 320, after: 120 },
      })
    );

    // Step Description
    stepParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Action Description: ',
            bold: true,
            size: 22,
            color: darkSlate,
          }),
          new TextRun({
            text: step.actionDescription,
            size: 22,
            color: '334155',
          }),
        ],
        spacing: { after: 100 },
      })
    );

    // Expected Screen Behavior Callout Box
    const calloutTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' },
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              borders: {
                left: { style: BorderStyle.SINGLE, size: 24, color: secondaryColor },
                top: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Expected Screen Behavior: ',
                      bold: true,
                      size: 20,
                      color: '1E40AF',
                    }),
                    new TextRun({
                      text: step.expectedScreenBehavior,
                      size: 20,
                      color: '1E3A8A',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    stepParagraphs.push(calloutTable);

    // Check if step has Screenshot image
    if (step.screenshotUrl && step.screenshotUrl.startsWith('data:image')) {
      const imgBuffer = base64ToUint8Array(step.screenshotUrl);
      if (imgBuffer) {
        stepParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: 'png',
                data: imgBuffer,
                transformation: {
                  width: 520,
                  height: 290,
                },
              }),
            ],
            spacing: { before: 180, after: 60 },
          })
        );
        if (step.screenshotCaption) {
          stepParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Figure ${step.stepNumber}: ${step.screenshotCaption}`,
                  italics: true,
                  size: 18,
                  color: '64748B',
                }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      }
    } else {
      // Clean screenshot placeholder indicator
      stepParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Visual Reference / UI Screen Capture for Step ${step.stepNumber}]`,
              italics: true,
              size: 18,
              color: '94A3B8',
            }),
          ],
          spacing: { before: 100, after: 180 },
        })
      );
    }
  }

  // Document Metadata Table (Header info)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: lightGreyBg },
            children: [new Paragraph({ children: [new TextRun({ text: 'Ticket / Reference #', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: manual.ticketNumber || 'N/A', size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: lightGreyBg },
            children: [new Paragraph({ children: [new TextRun({ text: 'Target Module', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: manual.moduleName, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: lightGreyBg },
            children: [new Paragraph({ children: [new TextRun({ text: 'Client / System', bold: true, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: manual.clientName || 'Treasury Master', size: 20 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: lightGreyBg },
            children: [new Paragraph({ children: [new TextRun({ text: 'Document Version', bold: true, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `v${manual.version}`, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: lightGreyBg },
            children: [new Paragraph({ children: [new TextRun({ text: 'Prepared By (Author)', bold: true, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: manual.authorName, size: 20 })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: lightGreyBg },
            children: [new Paragraph({ children: [new TextRun({ text: 'Release Date', bold: true, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: manual.updatedAt || new Date().toLocaleDateString(), size: 20 })] })],
          }),
        ],
      }),
    ],
  });

  // Prerequisites List
  const prereqParagraphs = (manual.prerequisites || []).map(
    (p, i) =>
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: p, size: 22, color: darkSlate })],
        spacing: { after: 60 },
      })
  );

  // FAQ List
  const faqParagraphs: Paragraph[] = [];
  (manual.faqOrTroubleshooting || []).forEach((faq, idx) => {
    faqParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Q${idx + 1}: ${faq.question}`,
            bold: true,
            size: 22,
            color: primaryColor,
          }),
        ],
        spacing: { before: 120, after: 60 },
      })
    );
    faqParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `A: ${faq.answer}`,
            size: 21,
            color: '334155',
          }),
        ],
        spacing: { after: 120 },
      })
    );
  });

  // Attached Test Cases Table if available
  let testCasesTableElement: Table | null = null;
  if (manual.attachedTestCases && manual.attachedTestCases.length > 0) {
    testCasesTableElement = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 16, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '1E3A8A' },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Test ID', bold: true, color: 'FFFFFF', size: 19 })] })],
            }),
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '1E3A8A' },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Scenario', bold: true, color: 'FFFFFF', size: 19 })] })],
            }),
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '1E3A8A' },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Description / Steps', bold: true, color: 'FFFFFF', size: 19 })] })],
            }),
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '1E3A8A' },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Expected Result', bold: true, color: 'FFFFFF', size: 19 })] })],
            }),
          ],
        }),
        ...manual.attachedTestCases.map(
          (tc, idx) =>
            new TableRow({
              children: [
                new TableCell({
                  margins: { top: 70, bottom: 70, left: 100, right: 100 },
                  children: [new Paragraph({ children: [new TextRun({ text: tc.testCaseId || `TC-${idx + 1}`, bold: true, size: 18 })] })],
                }),
                new TableCell({
                  margins: { top: 70, bottom: 70, left: 100, right: 100 },
                  children: [new Paragraph({ children: [new TextRun({ text: tc.scenario || '-', size: 18 })] })],
                }),
                new TableCell({
                  margins: { top: 70, bottom: 70, left: 100, right: 100 },
                  children: [new Paragraph({ children: [new TextRun({ text: tc.descriptionOrSteps || '-', size: 18 })] })],
                }),
                new TableCell({
                  margins: { top: 70, bottom: 70, left: 100, right: 100 },
                  children: [new Paragraph({ children: [new TextRun({ text: tc.expectedResult || '-', size: 18 })] })],
                }),
              ],
            })
        ),
      ],
    });
  }

  // Assemble the Word Document
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Beacon QA Platform • End-User Operating Manual • ${manual.moduleName}`,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({ text: ' of ', size: 16, color: '94A3B8' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Main Document Title
          new Paragraph({
            text: manual.title.toUpperCase(),
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: manual.title,
                bold: true,
                size: 36,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Standard Operating Procedure & Feature Walkthrough`,
                italics: true,
                size: 22,
                color: '64748B',
              }),
            ],
            spacing: { after: 300 },
          }),

          // Metadata Table
          metaTable,

          // Section 1: Executive Overview
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Executive Overview & Purpose',
                bold: true,
                size: 28,
                color: primaryColor,
              }),
            ],
            spacing: { before: 400, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: manual.overview,
                size: 22,
                color: darkSlate,
              }),
            ],
            spacing: { after: 240 },
          }),

          // Section 2: Prerequisites & Access Requirements
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Prerequisites & User Permissions',
                bold: true,
                size: 28,
                color: primaryColor,
              }),
            ],
            spacing: { before: 300, after: 120 },
          }),
          ...prereqParagraphs,

          // Section 3: Step-by-Step Operational Workflow
          new Paragraph({
            children: [
              new TextRun({
                text: '3. Step-by-Step Workflow & UI Walkthrough',
                bold: true,
                size: 28,
                color: primaryColor,
              }),
            ],
            spacing: { before: 360, after: 120 },
          }),
          ...stepParagraphs,

          // Section 4: Attached Test Coverage & Verification Matrix
          ...(testCasesTableElement || manual.attachedTestCasesSummary
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '4. Associated QA Test Coverage & Verification Matrix',
                      bold: true,
                      size: 28,
                      color: primaryColor,
                    }),
                  ],
                  spacing: { before: 360, after: 120 },
                }),
                ...(manual.attachedTestCasesSummary
                  ? [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: manual.attachedTestCasesSummary,
                            size: 21,
                            color: '475569',
                          }),
                        ],
                        spacing: { after: 180 },
                      }),
                    ]
                  : []),
                ...(testCasesTableElement ? [testCasesTableElement] : []),
              ]
            : []),

          // Section 5: Troubleshooting & FAQs
          new Paragraph({
            children: [
              new TextRun({
                text: `${manual.attachedTestCasesSummary ? '5' : '4'}. Troubleshooting & Frequently Asked Questions`,
                bold: true,
                size: 28,
                color: primaryColor,
              }),
            ],
            spacing: { before: 360, after: 120 },
          }),
          ...faqParagraphs,
        ],
      },
    ],
  });

  // Pack and trigger download in browser
  const blob = await Packer.toBlob(doc);
  const safeFilename = `${manual.ticketNumber || 'Manual'}_${manual.title
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 30)}_User_Manual.docx`;
  saveAs(blob, safeFilename);
}

/**
 * Generate and download a formatted Microsoft Word (.docx) Test Case Suite
 * Including ticket header metadata, full execution matrix, Actual Result, and embedded Screenshots
 */
export async function exportTestCasesToDocx(
  headerMeta: TestCaseHeaderMeta,
  testCases: TestCaseItem[]
): Promise<void> {
  const primaryNavy = '0F4C81'; // Beacon Executive Navy Blue
  const darkSlate = '1E293B';
  const tableHeaderBg = '1E293B';
  const lightGreyBg = 'F8FAFC';
  const altRowBg = 'F1F5F9';
  const borderGrey = 'CBD5E1';

  // Calculate statistics
  const total = testCases.length;
  const passed = testCases.filter((tc) => (tc.status || '').toLowerCase() === 'pass').length;
  const failed = testCases.filter((tc) => (tc.status || '').toLowerCase() === 'fail').length;
  const blocked = testCases.filter((tc) => (tc.status || '').toLowerCase() === 'blocked').length;
  const notRun = testCases.filter((tc) => !(tc.status) || tc.status.toLowerCase() === 'not run').length;

  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
    left: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
    right: { style: BorderStyle.SINGLE, size: 4, color: borderGrey },
  };

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // 1. Header Metadata Table
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Ticket Number', bold: true, color: 'FFFFFF', size: 18 })],
              }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [new TextRun({ text: `#${headerMeta.ticketNo || '1024'}`, bold: true, color: primaryNavy, size: 18 })],
              }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Client / Product', bold: true, color: 'FFFFFF', size: 18 })],
              }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [new TextRun({ text: headerMeta.clientName || 'Treasury Master', size: 18 })],
              }),
            ],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Task / Feature', bold: true, color: 'FFFFFF', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: headerMeta.taskName || 'Term Loan & Treasury Feature', bold: true, size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Review Status', bold: true, color: 'FFFFFF', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: `${headerMeta.reviewStatus || 'Draft'} (v${headerMeta.version || '1.0'})`, bold: true, color: headerMeta.reviewStatus === 'Approved' ? '059669' : 'D97706', size: 18 })] })],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Assigned QA', bold: true, color: 'FFFFFF', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: headerMeta.taskDoneBy || 'Maseera Sayyed', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Sign-Off / Senior QA', bold: true, color: 'FFFFFF', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: headerMeta.signOffBy || 'Senior QA Lead', size: 18 })] })],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Git Commit / SHA', bold: true, color: 'FFFFFF', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: headerMeta.sha || 'SHA-1: 4710b619ea012cba75ee657d', size: 16, font: 'Courier New' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Exported Date', bold: true, color: 'FFFFFF', size: 18 })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: lightGreyBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), size: 18 })] })],
            borders: thinBorder,
          }),
        ],
      }),
    ],
  });

  // 2. Metrics Summary Table
  const metricsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: '0F4C81', type: ShadingType.CLEAR },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TOTAL TEST CASES', bold: true, color: 'FFFFFF', size: 16 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${total}`, bold: true, color: 'FFFFFF', size: 30 })] }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PASSED', bold: true, color: '065F46', size: 16 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${passed}`, bold: true, color: '059669', size: 30 })] }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: 'FEF2F2', type: ShadingType.CLEAR },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'FAILED', bold: true, color: '991B1B', size: 16 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${failed}`, bold: true, color: 'DC2626', size: 30 })] }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: 'FFFBEB', type: ShadingType.CLEAR },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BLOCKED', bold: true, color: '92400E', size: 16 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${blocked}`, bold: true, color: 'D97706', size: 30 })] }),
            ],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NOT RUN', bold: true, color: '475569', size: 16 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${notRun}`, bold: true, color: '64748B', size: 30 })] }),
            ],
            borders: thinBorder,
          }),
        ],
      }),
    ],
  });

  // 3. Build Detailed Test Case Cards with Visible Screenshots
  const testCaseParagraphs: (Paragraph | Table)[] = [];

  testCases.forEach((tc, index) => {
    const isEven = index % 2 === 0;
    const statusUpper = (tc.status || 'NOT RUN').toUpperCase();
    const statusColor =
      statusUpper === 'PASS' ? '059669' : statusUpper === 'FAIL' ? 'DC2626' : statusUpper === 'BLOCKED' ? 'D97706' : '64748B';

    // Test case header bar table
    const cardHeaderTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: darkSlate, type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: tc.testCaseId || `TC${index + 1}`, bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
              borders: thinBorder,
            }),
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              shading: { fill: darkSlate, type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: tc.testScenario || 'Test Scenario', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
              borders: thinBorder,
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: darkSlate, type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: statusUpper, bold: true, color: statusColor === '059669' ? '34D399' : statusColor === 'DC2626' ? 'F87171' : 'E2E8F0', size: 20 })],
                }),
              ],
              borders: thinBorder,
            }),
          ],
        }),
      ],
    });

    testCaseParagraphs.push(cardHeaderTable);

    // Detail rows table
    const detailRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            shading: { fill: isEven ? lightGreyBg : altRowBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Module / Feature Tab:', bold: true, size: 18, color: '475569' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            width: { size: 76, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `${tc.testModule || 'Term Loan'} • ${tc.featureTab || 'General'}`, size: 18 })] })],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: isEven ? lightGreyBg : altRowBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Preconditions:', bold: true, size: 18, color: '475569' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: tc.preconditions || 'User logged in with QA role; deal is available.', size: 18 })] })],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: isEven ? lightGreyBg : altRowBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Test Steps:', bold: true, size: 18, color: '475569' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            children: (tc.testCases || '1. Perform action\n2. Verify outcome')
              .split('\n')
              .map((st) => new Paragraph({ children: [new TextRun({ text: st, size: 18 })], spacing: { after: 40 } })),
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: isEven ? lightGreyBg : altRowBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Test Inputs / Data:', bold: true, size: 18, color: '475569' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: tc.testInputs || 'N/A', font: 'Consolas', size: 17 })] })],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: isEven ? lightGreyBg : altRowBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Expected Result:', bold: true, size: 18, color: '1E3A8A' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: tc.expectedResult || 'System executes without errors.', bold: true, size: 18, color: '1E3A8A' })] })],
            borders: thinBorder,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: isEven ? lightGreyBg : altRowBg, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Actual Result:', bold: true, size: 18, color: '065F46' })] })],
            borders: thinBorder,
          }),
          new TableCell({
            shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: tc.actualResult || 'Pending execution - ready for QA testing', size: 18, color: '065F46' })] })],
            borders: thinBorder,
          }),
        ],
      }),
    ];

    const cardDetailsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: detailRows,
    });

    testCaseParagraphs.push(cardDetailsTable);

    // Collect all screenshot images for this test case
    const imagesToEmbed: { name: string; base64: string }[] = [];

    if (tc.attachments && tc.attachments.length > 0) {
      tc.attachments.forEach((att) => {
        if (att.url && att.url.startsWith('data:image/')) {
          imagesToEmbed.push({ name: att.name, base64: att.url });
        }
      });
    }

    if (tc.screenshot1 && tc.screenshot1.startsWith('data:image/')) {
      imagesToEmbed.push({ name: 'Evidence Screenshot', base64: tc.screenshot1 });
    }

    // Embed all screenshots as visible ImageRuns inside Word
    if (imagesToEmbed.length > 0) {
      testCaseParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `📷 Attached Evidence Screenshots (${imagesToEmbed.length}):`,
              bold: true,
              size: 18,
              color: '1E293B',
            }),
          ],
          spacing: { before: 100, after: 60 },
        })
      );

      imagesToEmbed.forEach((imgObj, imgIdx) => {
        const uint8Data = base64ToUint8Array(imgObj.base64);
        if (uint8Data) {
          try {
            testCaseParagraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: uint8Data,
                    transformation: {
                      width: 480,
                      height: 250,
                    },
                    type: 'png',
                  } as any),
                ],
                spacing: { after: 60 },
              })
            );
            testCaseParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Figure ${index + 1}.${imgIdx + 1}: ${imgObj.name || 'UI Screenshot Evidence'}`,
                    italics: true,
                    size: 15,
                    color: '64748B',
                  }),
                ],
                spacing: { after: 140 },
              })
            );
          } catch (embedErr) {
            console.warn('Could not embed image into Word doc', embedErr);
          }
        }
      });
    }

    // Spacing between test cases
    testCaseParagraphs.push(
      new Paragraph({
        text: '',
        spacing: { after: 200 },
      })
    );
  });

  // Construct Complete Word Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Beacon Quality Hub • Ticket #${headerMeta.ticketNo || '1024'} Test Specification`,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({ text: ' of ', size: 16, color: '94A3B8' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Document Header
          new Paragraph({
            children: [
              new TextRun({
                text: 'BEACON QUALITY HUB',
                bold: true,
                size: 20,
                color: primaryNavy,
              }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Test Case Specification & Execution Matrix`,
                bold: true,
                size: 34,
                color: darkSlate,
              }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ticket #${headerMeta.ticketNo || '1024'} • ${headerMeta.taskName || 'Quality Assurance Verification'}`,
                size: 22,
                color: '475569',
              }),
            ],
            spacing: { after: 200 },
          }),

          // Metadata Table
          metaTable,

          new Paragraph({ text: '', spacing: { after: 180 } }),

          // Metrics Banner Table
          metricsTable,

          new Paragraph({ text: '', spacing: { after: 240 } }),

          // Section Title: Test Cases
          new Paragraph({
            children: [
              new TextRun({
                text: `Comprehensive Test Case Suite (${total} Cases)`,
                bold: true,
                size: 26,
                color: primaryNavy,
              }),
            ],
            spacing: { after: 120 },
          }),

          // All test case tables and embedded screenshots
          ...testCaseParagraphs,
        ],
      },
    ],
  });

  // Pack and trigger download in browser
  const blob = await Packer.toBlob(doc);
  const safeFilename = `TestCases_Ticket_${headerMeta.ticketNo || 'QA'}_${(headerMeta.taskName || 'Suite').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}.docx`;
  saveAs(blob, safeFilename);
}
