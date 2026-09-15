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
import { UserManualDoc, ManualStep } from '../types';

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
