export type NavTab =
  | 'dashboard'
  | 'tickets'
  | 'ai-test-hub'
  | 'test-cases'
  | 'review-queue'
  | 'observations'
  | 'rfe'
  | 'developer-testing'
  | 'user-manual'
  | 'daily-updates'
  | 'modules'
  | 'qa-team'
  | 'reports'
  | 'ai-assistant'
  | 'settings';

export type UserRole = 'Super Admin' | 'Senior QA' | 'QA' | 'Developer' | 'Viewer';

export type ColourTheme = 'Default' | 'Blue' | 'Green' | 'Purple' | 'Amber' | 'Dark';
export type FontStyle = 'Inter' | 'Roboto' | 'Arial' | 'Poppins';

export interface AppSettings {
  theme: ColourTheme;
  font: FontStyle;
}

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Inactive';
  joiningDate: string;
}

export interface BeaconModule {
  id: string;
  name: string;
  code: string;
  category: 'Lending' | 'Investments' | 'Treasury' | 'Accounting' | 'Core';
  description: string;
  activeTicketsCount: number;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  featureName: string;
  moduleId: string;
  moduleName: string;
  developer: string;
  qaAssignee: string;
  createdBy?: string;
  creatorEmail?: string;
  signOffBy?: string;
  clientName?: string;
  branch?: string;
  shaCommit?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status:
    | 'New'
    | 'Ready for QA'
    | 'In Testing'
    | 'Observation Raised'
    | 'Retesting'
    | 'Regression'
    | 'Passed'
    | 'Failed'
    | 'Blocked'
    | 'Pre-UAT'
    | 'Closed';
  testCasesCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  observationsCount: number;
  receivedDate: string;
  qaRequirementDoc?: string;
  devHandoverNotes?: string;
  apiEndpoints?: string[];
  dbTables?: string[];
  detectedFormFields?: string[];
  description?: string;
  scenarioDetails?: string;
  impactPoints?: string[];
  solution?: string;
  acceptanceCriteria?: string;
  dealId?: string;
  testingScenarios?: string;
  attachedDocs?: AttachedDocOrImage[];
  screenFields?: string[];
  submissionState?: 'Draft' | 'Submitted';
  isEditing?: boolean;
  submittedAt?: string;
  submittedBy?: string;
}

export type TestCaseReviewStatus = 'Draft' | 'Review Pending' | 'In Review' | 'Changes Required' | 'Approved';

export interface ReviewComment {
  id: string;
  author: string;
  authorEmail: string;
  role: string;
  text: string;
  createdAt: string;
}

export interface TestCaseRevision {
  id: string;
  version: string; // e.g. "1.0", "1.1"
  status: TestCaseReviewStatus;
  testCases: TestCaseItem[];
  approvedBy?: string;
  approvedAt?: string;
  approvedVersion?: string;
  comments?: ReviewComment[];
  createdAt: string;
}

export interface AttachedDocOrImage {
  id: string;
  name: string;
  type: 'image' | 'excel' | 'word' | 'pdf' | 'text' | 'other';
  url?: string;
  dataUrl?: string;
  size?: string;
  uploadedAt?: string;
  detectedFields?: string[];
  extractedContent?: string;
}

export interface TestCaseHeaderMeta {
  ticketNo: string;
  clientName: string;
  sha: string;
  branch?: string;
  taskName: string;
  taskDoneBy: string; // Assigned QA / Submitted By
  signOffBy: string; // Senior QA / Submitted To
  developer?: string;
  description?: string;
  testingScenarios?: string;
  reviewStatus?: TestCaseReviewStatus;
  version?: string; // e.g. "1.0", "1.1"
  submittedBy?: string;
  submittedTo?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvedVersion?: string;
  reviewDoneBy?: string;
  reviewDoneAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: ReviewComment[];
  isEditingByQA?: boolean;
  isBeingReviewed?: boolean;
  revisionsHistory?: TestCaseRevision[];
  aiCoverageReport?: AiCoverageReport | null;
  attachedDocs?: AttachedDocOrImage[];
  screenFields?: string[];
}

export interface AiCoverageReport {
  ticketId: string;
  reviewedAt: string;
  coveredScenarios: string[];
  missingScenarios: string[];
  partiallyCoveredScenarios: string[];
  unnecessaryOrDuplicates: string[];
  missingPositiveScenarios: string[];
  missingNegativeOrValidationScenarios: string[];
  missingBoundaryOrEdgeCases: string[];
  mismatches: string[];
  summaryText: string;
}

export interface TestCaseItem {
  id: string;
  testCaseId: string;
  testModule: string;
  featureTab: string;
  testScenario: string;
  preconditions?: string;
  testCases: string;
  testInputs: string;
  expectedResult: string;
  actualResult: string;
  status: 'pass' | 'fail' | 'blocked' | 'not run'; // Execution status
  reviewStatus?: TestCaseReviewStatus;
  version?: string;
  validationScenario?: string;
  additionalCoverage?: string;
  screenshot1?: string;
  screenshot2?: string;
  screenshot3?: string;
  screenshot4?: string;
  attachments?: FileAttachment[];
  isAiGenerated?: boolean;
  createdBy?: string;
  authorRole?: string;
  createdAt?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size?: string;
  uploadedAt?: string;
}

export interface ObservationHeaderMeta {
  ticketName: string;
  ticketNo: string;
  qaOwner: string;
  clientName?: string;
  developer?: string;
  sha?: string;
  signOffBy?: string;
  taskName?: string;
  date: string;
}

export interface ObservationItem {
  id: string;
  serialNo: string;
  ticketId: string;
  ticketName: string;
  type: 'Observation' | 'RFE';
  observationRFE: string;
  status: 'Open' | 'In Progress' | 'Fixed' | 'Closed' | 'Not an Issue' | 'Deferred';
  retesting: number | string; // 1, 2, 3, 4, 5+
  fixedEvidence?: FileAttachment[];
  screenshotUrl?: string; // Backwards compat
  screenshotName?: string; // Backwards compat
  attachments?: FileAttachment[]; // Backwards compat / Fixed evidence
  remark: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  reportedBy: string;
  createdDate: string;
}

export interface DeveloperTestHeaderMeta {
  ticketNo: string;
  featureName: string;
  developer: string;
  qaAssignee?: string;
  clientName?: string;
  taskName?: string;
  sha?: string;
  devTestDate: string;
  description?: string;
  testingScenarios?: string;
  signOffBy?: string;
  shaCommit?: string;
  dealId?: string;
  status?: 'Draft' | 'Submitted';
  submittedAt?: string;
  submittedBy?: string;
  attachedDocs?: AttachedDocOrImage[];
  screenFields?: string[];
}

export interface DeveloperTestItem {
  id: string;
  scenarioId: string;
  dealId?: string;
  developerName?: string;
  testingPoint?: string;
  scenario: string;
  testDescription: string;
  testData: string;
  expectedResult: string;
  actualResult: string;
  status: 'Passed' | 'Failed' | 'In Progress' | 'Passed with Limitations';
  submissionState?: 'Draft' | 'Submitted';
  submittedAt?: string;
  submittedBy?: string;
  attachments?: FileAttachment[];
  screenshotName?: string;
  screenshotUrl?: string;
  remarks: string;
  isAiGenerated?: boolean;
  createdBy?: string;
  authorRole?: string;
  createdAt?: string;
}

export interface AiReviewIssue {
  id: string;
  testCaseId?: string;
  type:
    | 'Requirement Coverage'
    | 'Positive Scenario'
    | 'Negative Scenario'
    | 'Validation'
    | 'Boundary / Edge Case'
    | 'Business Logic'
    | 'Expected Result Clarity'
    | 'Duplicate'
    | 'Missing Scenario'
    | 'UI / Functional Impact'
    | 'Bulk Impact'
    | 'Existing Functionality Impact';
  title: string;
  suggestion: string;
}

export interface AiReviewSummary {
  ticketId: string;
  totalReviewed: number;
  goodCount: number;
  duplicateCount: number;
  missingValidationCount: number;
  issues: AiReviewIssue[];
  reviewedAt: string;
}

// ==========================================
// USER MANUAL MODULE INTERFACES
// ==========================================
export interface ManualStep {
  stepNumber: number;
  actionTitle: string;
  actionDescription: string;
  expectedScreenBehavior: string;
  screenshotUrl?: string;
  screenshotCaption?: string;
}

export interface AttachedExcelTestCase {
  id: string;
  testCaseId: string;
  scenario: string;
  descriptionOrSteps: string;
  expectedResult: string;
  actualResult?: string;
  status?: string;
}

export interface UserManualDoc {
  id: string;
  ticketNumber: string;
  title: string;
  moduleName: string;
  version: string;
  authorName: string;
  authorEmail: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  overview: string;
  prerequisites: string[];
  workflowSteps: ManualStep[];
  faqOrTroubleshooting: { question: string; answer: string }[];
  attachedTestCasesSummary?: string;
  attachedExcelFileName?: string;
  attachedTestCases?: AttachedExcelTestCase[];
}

// ==========================================
// DAILY TASK & WORK LOG MODULE INTERFACES
// ==========================================
export type DailyTaskStatus = 'Completed' | 'In Progress' | 'Pending' | 'Blocked';

export interface DailyTaskItem {
  id: string;
  date: string; // YYYY-MM-DD
  userEmail: string;
  userName: string;
  taskTitle: string;
  ticketNo?: string;
  moduleName?: string;
  timeSpentHours: number;
  timeSlot?: string; // e.g. "10:00 AM - 01:00 PM"
  status: DailyTaskStatus;
  notesOrRemarks: string;
  createdAt: string;
}

export interface UserNotepad {
  id: string;
  userEmail: string;
  title: string;
  content: string;
  category?: 'General' | 'Blocker' | 'Meeting' | 'Idea' | 'Daily Standup';
  updatedAt: string;
}

