export type NavTab =
  | 'dashboard'
  | 'tickets'
  | 'ai-test-hub'
  | 'test-cases'
  | 'review-queue'
  | 'observations'
  | 'developer-testing'
  | 'modules'
  | 'qa-team'
  | 'reports'
  | 'ai-assistant'
  | 'settings';

export type UserRole = 'Super Admin' | 'Senior QA' | 'QA' | 'Developer' | 'Viewer';

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
  signOffBy?: string;
  clientName?: string;
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

export interface TestCaseHeaderMeta {
  ticketNo: string;
  clientName: string;
  sha: string;
  taskName: string;
  taskDoneBy: string; // Assigned QA
  signOffBy: string; // Senior QA
  reviewStatus?: TestCaseReviewStatus;
  version?: string; // e.g. "1.0", "1.1"
  approvedBy?: string;
  approvedAt?: string;
  approvedVersion?: string;
  comments?: ReviewComment[];
  isEditingByQA?: boolean;
  isBeingReviewed?: boolean;
  revisionsHistory?: TestCaseRevision[];
}

export interface TestCaseItem {
  id: string;
  testCaseId: string;
  testModule: string;
  featureTab: string;
  testScenario: string;
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
  attachments?: FileAttachment[];
  isAiGenerated?: boolean;
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
  date: string;
}

export interface ObservationItem {
  id: string;
  serialNo: string;
  ticketId: string;
  ticketName: string;
  type: 'Observation' | 'RFE';
  observationRFE: string;
  screenshotUrl?: string;
  screenshotName?: string;
  attachments?: FileAttachment[];
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Fixed' | 'Pending' | 'Not required for this ticket';
  reportedBy: string;
  createdDate: string;
}

export interface DeveloperTestHeaderMeta {
  ticketNo: string;
  featureName: string;
  developer: string;
  devTestDate: string;
  signOffBy?: string;
  shaCommit?: string;
  dealId?: string;
  status?: 'Draft' | 'Submitted';
  submittedAt?: string;
  submittedBy?: string;
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
