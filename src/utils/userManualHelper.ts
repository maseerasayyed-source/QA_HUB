import { UserManualDoc, ManualStep, TicketSummary, TestCaseItem } from '../types';

/**
 * Generates structured User Manual content using ticket information and attached test cases
 */
export function generateUserManualFromTicket(
  ticket: TicketSummary,
  testCases: TestCaseItem[],
  authorName: string,
  authorEmail: string,
  clientName: string = 'Treasury Master'
): UserManualDoc {
  const tNo = ticket.ticketNumber || 'TICKET';
  const feature = ticket.featureName || 'System Feature';
  const moduleName = ticket.moduleName || 'Term Loan';
  const description = ticket.description || ticket.qaRequirementDoc || ticket.acceptanceCriteria || feature;

  // Extract workflow steps from test cases or ticket scenario details
  const workflowSteps: ManualStep[] = [];

  if (testCases && testCases.length > 0) {
    // Convert top test cases into user manual workflow steps
    testCases.forEach((tc, idx) => {
      // Split steps if formatted as numbered lines
      const actionDesc = tc.testCases
        ? tc.testCases.replace(/^[0-9]+[.)]\s*/gm, '').replace(/\n+/g, ' ')
        : `Execute verification for ${tc.testScenario}`;

      workflowSteps.push({
        stepNumber: idx + 1,
        actionTitle: tc.testScenario.length > 60 ? `${tc.testScenario.slice(0, 58)}...` : tc.testScenario,
        actionDescription: actionDesc,
        expectedScreenBehavior: tc.expectedResult || 'System reflects updated transaction status without error banners.',
        screenshotCaption: `Screen view during: ${tc.testScenario}`,
      });
    });
  } else {
    // Create standard structured steps based on description & module
    workflowSteps.push(
      {
        stepNumber: 1,
        actionTitle: `Access ${moduleName} Workspace`,
        actionDescription: `Log in to ${clientName} portal using authorized operational credentials. Navigate to the left navigation panel and select the '${moduleName}' module.`,
        expectedScreenBehavior: `The ${moduleName} dashboard appears, displaying the active records table, search filters, and action toolbar.`,
        screenshotCaption: `Main Dashboard View of ${moduleName}`,
      },
      {
        stepNumber: 2,
        actionTitle: `Locate Target Record / Deal for ${feature}`,
        actionDescription: `Utilize the quick search bar or advanced filter parameters (such as Ticket #${tNo} or Deal ID) to retrieve the relevant record for '${feature}'.`,
        expectedScreenBehavior: `Search results instantly filter down to the matched deal, highlighting current processing state.`,
        screenshotCaption: `Filtered Deal Record in Grid`,
      },
      {
        stepNumber: 3,
        actionTitle: `Initiate ${feature} Action`,
        actionDescription: `Click on the action menu or 'Process' button associated with the record. Open the '${feature}' input dialogue modal. Verify that all auto-populated fields correspond to the correct deal parameters.`,
        expectedScreenBehavior: `A configuration modal opens with all pre-filled fields editable, including validation indicators.`,
        screenshotCaption: `Input Modal for ${feature}`,
      },
      {
        stepNumber: 4,
        actionTitle: 'Verify Calculations & Submit',
        actionDescription: `Enter or adjust required parameters as per standard operating protocol. Click 'Recalculate' or 'Save & Submit' to finalize changes.`,
        expectedScreenBehavior: `System validates input formats, displays positive confirmation banner ('Successfully Saved'), and updates record status to 'Approved' or 'Processed'.`,
        screenshotCaption: `Submission Confirmation Banner & Updated Status`,
      },
      {
        stepNumber: 5,
        actionTitle: 'Audit Trail & Reporting Confirmation',
        actionDescription: `Navigate to the Audit Trail or Reports section to confirm that the modification is timestamped and attributed to your user account. Export the Excel report if needed for records.`,
        expectedScreenBehavior: `Audit log records new entry with exact timestamp, user ID, and before/after values.`,
        screenshotCaption: `Audit History Log & Export Preview`,
      }
    );
  }

  // Compile test case summary text
  const tcSummary =
    testCases && testCases.length > 0
      ? `This operational manual reflects validation against ${testCases.length} QA test cases covering positive workflows, boundary constraints, and error prevention.`
      : `Based on Ticket #${tNo} specifications with rigorous QA checks for data integrity.`;

  return {
    id: `manual-${Date.now()}`,
    ticketNumber: tNo,
    title: `End-User Operational Manual: ${feature}`,
    moduleName,
    version: '1.0',
    authorName: authorName || 'Maseera Sayyed',
    authorEmail: authorEmail || 'maseerasayyed@quantumphinance.com',
    clientName,
    createdAt: new Date().toLocaleDateString('en-GB'),
    updatedAt: new Date().toLocaleDateString('en-GB'),
    overview: `This operational guide outlines the standard operating procedures, user interfaces, and step-by-step workflow for '${feature}' within the ${moduleName} module of ${clientName}. It is designed for operations teams, relationship managers, and audit personnel to execute processes accurately while maintaining regulatory compliance.\n\nSummary of capability: ${description}`,
    prerequisites: [
      `Active user login account with '${moduleName} Operator' or 'Maker/Checker' role assignment in ${clientName}.`,
      `Approved access to environment (UAT / Production) with two-factor authentication verified.`,
      `Valid Deal / Facility record existing in system prior to initiating transaction.`,
      `Web browser compliance: Chrome 110+, Edge 110+, or Firefox ESR with JavaScript enabled.`,
    ],
    workflowSteps,
    faqOrTroubleshooting: [
      {
        question: `What should I do if the '${feature}' button is disabled or greyed out?`,
        answer: `Ensure that your user profile has Checker permissions and that the underlying record is in an eligible lifecycle state (not 'Locked' or 'Pending Authorization').`,
      },
      {
        question: `Where can I verify if interest or penalty rates were calculated accurately?`,
        answer: `Review the 'Cashflow Schedule' tab within the Deal screen. All schedule revisions and rate adjustments are recalculated in real time before commitment.`,
      },
      {
        question: `How do I export this manual or print it for offline compliance audits?`,
        answer: `Use the 'Download Word (.docx)' button in the upper toolbar to export a fully formatted, editable Microsoft Word document complete with screenshot references.`,
      },
    ],
    attachedTestCasesSummary: tcSummary,
  };
}

/**
 * Creates a blank User Manual ready for direct input and Excel upload
 */
export function createBlankUserManual(
  authorName: string,
  authorEmail: string,
  clientName: string = 'Treasury Master'
): UserManualDoc {
  return {
    id: `manual-${Date.now()}`,
    ticketNumber: `MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
    title: 'New Feature Operational Manual',
    moduleName: 'Term Loan',
    version: '1.0',
    authorName: authorName || 'Maseera Sayyed',
    authorEmail: authorEmail || 'maseerasayyed@quantumphinance.com',
    clientName,
    createdAt: new Date().toLocaleDateString('en-GB'),
    updatedAt: new Date().toLocaleDateString('en-GB'),
    overview: 'This standard operating procedure provides step-by-step guidance for users on executing operations, understanding system validations, and verifying expected results.',
    prerequisites: [
      'Active login account with operational permissions in Treasury Master.',
      'Access to target environment (UAT / Production) with valid authentication.',
    ],
    workflowSteps: [
      {
        stepNumber: 1,
        actionTitle: 'Step 1: Navigate to Module & Select Deal',
        actionDescription: 'Log in to the system, navigate to the target module, and open the transaction record or creation form.',
        expectedScreenBehavior: 'The transaction interface renders with data grid and action buttons available.',
        screenshotCaption: 'Initial screen view',
      },
    ],
    faqOrTroubleshooting: [
      {
        question: 'What should I do if an error banner appears?',
        answer: 'Check that mandatory fields have valid data formats and that your profile has necessary role permissions.',
      },
    ],
    attachedTestCases: [],
  };
}

/**
 * AI Suggestion Generator for Daily Standup & Notepad points
 */
export function generateAiDailySuggestions(
  tasks: { taskTitle: string; timeSpentHours: number; status: string }[],
  notes: string
): string[] {
  const suggestions: string[] = [];

  if (tasks.length === 0) {
    suggestions.push(
      'Plan your morning focus block: pick 2 high-priority tickets to verify before midday standup.',
      'Review pending observations to see if developers have deployed bug fixes for re-testing.',
      'Check test cases submitted for Senior QA review in the Review Queue.'
    );
    return suggestions;
  }

  const completed = tasks.filter((t) => t.status === 'Completed');
  const inProgress = tasks.filter((t) => t.status === 'In Progress');
  const blocked = tasks.filter((t) => t.status === 'Blocked');
  const totalHours = tasks.reduce((sum, t) => sum + (t.timeSpentHours || 0), 0);

  if (blocked.length > 0) {
    suggestions.push(
      `Escalate ${blocked.length} blocked item(s) to the development lead or scrum master: "${blocked[0].taskTitle}" requires urgent dependency clearance.`
    );
  }

  if (inProgress.length > 0) {
    suggestions.push(
      `Next milestone: Finish execution of "${inProgress[0].taskTitle}". Log test results and capture screenshots for the sign-off package.`
    );
  }

  if (completed.length > 0) {
    suggestions.push(
      `Great progress: ${completed.length} task(s) completed today (${totalHours.toFixed(1)}h logged). Ensure final test case status is updated to 'Passed' in the AI Test Hub.`
    );
  }

  suggestions.push(
    `Manager Standup Summary: "Today executed ${tasks.length} items (${totalHours.toFixed(1)} hrs), with ${completed.length} finished and ${inProgress.length} progressing into regression testing."`
  );

  return suggestions;
}
