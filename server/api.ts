import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { query, getDbStatus } from './db';

export const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '50mb' }));
apiRouter.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory fallback data cache if PostgreSQL is offline during development
const mockMemoryStore = {
  users: [
    { name: 'Maseera Sayyed', role: 'Super Admin', email: 'maseerasayyed@quantumphinance.com' },
    { name: 'QA User', role: 'QA', email: 'qa@quantumphinance.com' },
    { name: 'BA User', role: 'BA', email: 'ba@quantumphinance.com' },
    { name: 'Developer User', role: 'Developer', email: 'dev@quantumphinance.com' },
    { name: 'Product User', role: 'Product Team', email: 'product@quantumphinance.com' }
  ],
  activityLogs: [] as any[],
  tickets: [] as any[],
  testCases: [] as any[],
  observations: [] as any[],
  devTesting: [] as any[]
};

// Audit logging helper
async function logActivity(userName: string, userRole: string, action: string, moduleName?: string, ticketId?: string, details?: any) {
  const logEntry = {
    user_name: userName || 'Anonymous',
    user_role: userRole || 'Guest',
    action,
    module: moduleName || 'General',
    ticket_id: ticketId || '',
    details: details || {},
    created_at: new Date().toISOString()
  };

  mockMemoryStore.activityLogs.push(logEntry);

  try {
    await query(
      `INSERT INTO activity_logs (user_name, user_role, action, module, ticket_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
      [logEntry.user_name, logEntry.user_role, logEntry.action, logEntry.module, logEntry.ticket_id, JSON.stringify(logEntry.details)]
    );
  } catch (err) {
    // Fallback logged in mockMemoryStore
  }
}

// User context extraction middleware
interface AuthenticatedRequest extends Request {
  userContext?: {
    userName: string;
    userRole: string;
  };
}

apiRouter.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const userName = (req.headers['x-user-name'] as string) || 'Maseera Sayyed';
  const userRole = (req.headers['x-user-role'] as string) || (userName === 'Maseera Sayyed' ? 'Super Admin' : 'QA');
  req.userContext = { userName, userRole };
  next();
});

// Users & Roles
apiRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const resDb = await query('SELECT name, role, email FROM users ORDER BY id ASC');
    if (resDb && resDb.rows.length > 0) {
      return res.json(resDb.rows);
    }
  } catch (err) {
    // ignore
  }
  return res.json(mockMemoryStore.users);
});

apiRouter.post('/users/role', async (req: AuthenticatedRequest, res: Response) => {
  const { userName, role, email } = req.body;
  if (!userName || !role) {
    return res.status(400).json({ error: 'userName and role required' });
  }

  const cleanEmail = (email || '').toLowerCase().trim();

  // Role Restriction check: if same email already has a saved role, block any attempt to change role
  if (cleanEmail) {
    const existingByEmail = mockMemoryStore.users.find(
      u => u.email && u.email.toLowerCase().trim() === cleanEmail
    );
    if (existingByEmail && existingByEmail.role && existingByEmail.role !== role) {
      return res.status(403).json({
        error: `Access Restricted: Email ${cleanEmail} is already registered with role '${existingByEmail.role}'. You cannot login with role '${role}'.`,
        registeredRole: existingByEmail.role
      });
    }
  }

  const existing = mockMemoryStore.users.find(
    u => (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) || u.name === userName
  );

  if (existing) {
    if (cleanEmail && !existing.email) existing.email = cleanEmail;
    // Keep role fixed once established
    existing.role = existing.role || role;
    if (userName && !existing.name) existing.name = userName;
  } else {
    mockMemoryStore.users.push({ name: userName, role, email: cleanEmail });
  }

  try {
    await query(
      'INSERT INTO users (name, role, email) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email',
      [userName, existing ? existing.role : role, cleanEmail]
    );
  } catch (err) {
    // in-memory store already updated
  }

  await logActivity(req.userContext?.userName || userName, req.userContext?.userRole || role, `User logged in / verified (${role})`, 'Auth');
  return res.json({ status: 'ok', name: userName, role: existing ? existing.role : role, email: cleanEmail });
});

// Activity logs (Super Admin tracking with RBAC permission validation)
apiRouter.get('/activity-logs', async (req: AuthenticatedRequest, res: Response) => {
  if (req.userContext?.userRole !== 'Super Admin' && req.userContext?.userName !== 'Maseera Sayyed') {
    return res.status(403).json({ error: 'Access restricted to Super Admin (Maseera Sayyed)' });
  }

  try {
    const resDb = await query('SELECT user_name, user_role, action, module, ticket_id, details, created_at FROM activity_logs ORDER BY id DESC LIMIT 500');
    if (resDb && resDb.rows.length > 0) {
      return res.json(resDb.rows);
    }
  } catch (err) {
    // ignore
  }

  return res.json(mockMemoryStore.activityLogs.slice().reverse());
});

// Sync full state to/from PostgreSQL DB
apiRouter.post('/sync-state', async (req: AuthenticatedRequest, res: Response) => {
  const { tickets, testCases, observations, devTesting } = req.body;
  const user = req.userContext;

  if (Array.isArray(tickets)) mockMemoryStore.tickets = tickets;
  if (testCases) mockMemoryStore.testCases = testCases;
  if (observations) mockMemoryStore.observations = observations;
  if (devTesting) mockMemoryStore.devTesting = devTesting;

  // Persist to PostgreSQL tables if connected
  try {
    if (Array.isArray(tickets)) {
      for (const t of tickets) {
        await query(
          `INSERT INTO tickets (ticket_id, title, status, priority, description, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (ticket_id) DO UPDATE SET
             title = EXCLUDED.title,
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             description = EXCLUDED.description,
             updated_at = CURRENT_TIMESTAMP`,
          [t.ticketNumber || t.ticket_id, t.title || '', t.status || 'Open', t.priority || 'Medium', t.description || '', user?.userName || '']
        );
      }
    }
  } catch (err) {
    // Ignore db write failure and use memory fallback
  }

  await logActivity(user?.userName || 'User', user?.userRole || 'Role', 'State Sync / DB Persistence Update', 'StateSync');

  return res.json({ status: 'success', syncedAt: new Date().toISOString() });
});

apiRouter.get('/sync-state', async (_req: Request, res: Response) => {
  try {
    const resTickets = await query('SELECT * FROM tickets ORDER BY updated_at DESC');
    if (resTickets && resTickets.rows.length > 0) {
      return res.json({
        tickets: resTickets.rows.map(r => ({
          ticketNumber: r.ticket_id,
          title: r.title,
          status: r.status,
          priority: r.priority,
          description: r.description
        })),
        testCases: mockMemoryStore.testCases,
        observations: mockMemoryStore.observations,
        devTesting: mockMemoryStore.devTesting
      });
    }
  } catch (err) {
    // fallback
  }

  return res.json({
    tickets: mockMemoryStore.tickets,
    testCases: mockMemoryStore.testCases,
    observations: mockMemoryStore.observations,
    devTesting: mockMemoryStore.devTesting
  });
});

apiRouter.get('/db-status', async (_req: Request, res: Response) => {
  const status = await getDbStatus();
  return res.json(status);
});

// Azure DevOps Server Proxy Routes (Bypasses browser CORS and handles ADO authentication)
let workspaceAdoToken =
  process.env.AZURE_DEVOPS_PAT ||
  process.env.ADO_PAT ||
  '';
let workspaceAdoOrg = 'quantumphinance';
let workspaceAdoProject = 'Beacon Web';

apiRouter.get('/azure/config-status', (_req: Request, res: Response) => {
  return res.json({
    hasToken: !!workspaceAdoToken,
    organization: workspaceAdoOrg,
    project: workspaceAdoProject,
  });
});

apiRouter.post('/azure/save-config', (req: Request, res: Response) => {
  const { pat, organization, project } = req.body;
  if (typeof pat === 'string' && pat.trim()) {
    workspaceAdoToken = pat.trim();
  }
  if (organization) workspaceAdoOrg = organization.trim();
  if (project) workspaceAdoProject = project.trim();
  return res.json({
    success: true,
    hasToken: !!workspaceAdoToken,
    organization: workspaceAdoOrg,
    project: workspaceAdoProject,
  });
});

apiRouter.post('/azure/workitem', async (req: Request, res: Response) => {
  try {
    const { workItemId, organization, project, pat } = req.body;
    const cleanId = String(workItemId || '').match(/\d{3,8}/)?.[0] || String(workItemId || '').trim();
    const cleanOrg = (organization || workspaceAdoOrg || 'quantumphinance').trim();
    const requestedProject = (project || '').trim();
    const token = (pat || workspaceAdoToken || process.env.AZURE_DEVOPS_PAT || process.env.ADO_PAT || '').trim();

    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Work Item / Ticket ID is required' });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Beacon-QA-Hub/1.0',
    };

    if (token) {
      headers['Authorization'] = `Basic ${Buffer.from(':' + token).toString('base64')}`;
    }

    // Attempt candidates in order:
    // 1. Direct Organization-level URL (Works across ANY project in the org! E.g. InsightCorp, Beacon Web, SheetKraft)
    // 2. Specific project candidates
    const candidateUrls: string[] = [
      `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/_apis/wit/workitems/${cleanId}?api-version=7.0`,
    ];

    if (requestedProject && requestedProject !== 'QA HUB') {
      candidateUrls.push(
        `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(requestedProject)}/_apis/wit/workitems/${cleanId}?api-version=7.0&$expand=all`
      );
    }

    const knownProjects = ['InsightCorp', 'Beacon Web', 'SheetKraft'];
    for (const kp of knownProjects) {
      candidateUrls.push(
        `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(kp)}/_apis/wit/workitems/${cleanId}?api-version=7.0&$expand=all`
      );
    }

    let lastResponse: any = null;
    let successfulData: any = null;

    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url, { method: 'GET', headers });
        const cType = resp.headers.get('content-type') || '';

        if (resp.status === 203 || resp.status === 401 || resp.status === 403) {
          lastResponse = resp;
          continue;
        }

        if (resp.ok && cType.includes('application/json')) {
          const json = await resp.json();
          if (json && json.id && json.fields) {
            successfulData = json;
            break;
          }
        } else {
          lastResponse = resp;
        }
      } catch {
        // try next candidate URL
      }
    }

    if (!successfulData) {
      if (lastResponse && (lastResponse.status === 203 || lastResponse.status === 401 || lastResponse.status === 403)) {
        return res.json({
          success: false,
          requiresPat: true,
          statusCode: lastResponse.status,
          ticketNumber: cleanId,
          message: !token
            ? `Azure DevOps organization '${cleanOrg}' requires a Personal Access Token (PAT). Please enter your PAT below with Work Items (Read) permission to fetch live data.`
            : `Azure DevOps rejected access (${lastResponse.status}). Please verify that your PAT has 'Work Items (Read)' permission for ${cleanOrg}.`,
        });
      }

      const errText = lastResponse ? await lastResponse.text().catch(() => '') : '';
      return res.json({
        success: false,
        statusCode: lastResponse ? lastResponse.status : 404,
        ticketNumber: cleanId,
        message: `Azure DevOps API returned 404. Work Item #${cleanId} does not exist in ${cleanOrg}.`,
        errorDetail: errText.slice(0, 300),
      });
    }

    const data = successfulData as any;
    const fields = data?.fields || {};

    const title = fields['System.Title'] || `Ticket #${cleanId}`;
    const rawDesc = fields['System.Description'] || fields['System.History'] || '';
    const description = rawDesc.replace(/<[^>]*>?/gm, '').trim();
    const areaPath = fields['System.AreaPath'] || fields['System.NodeName'] || '';
    const assigneeObj = fields['System.AssignedTo'] || fields['Custom.AssignedQA'];
    const assignee = typeof assigneeObj === 'object' ? assigneeObj?.displayName : String(assigneeObj || '');
    const state = fields['System.State'] || 'Ready for QA';
    const workType = fields['System.WorkItemType'] || 'User Story';

    const rawPriority = fields['Microsoft.VSTS.Common.Priority'];
    let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';
    if (rawPriority === 1 || String(rawPriority) === '1' || String(rawPriority).toLowerCase().includes('critical')) {
      priority = 'Critical';
    } else if (rawPriority === 2 || String(rawPriority) === '2') {
      priority = 'High';
    } else if (rawPriority === 3 || String(rawPriority) === '3') {
      priority = 'Medium';
    } else if (rawPriority === 4 || String(rawPriority) === '4') {
      priority = 'Low';
    }

    const assignedDevObj = fields['Custom.AssignedDeveloper'] || fields['Custom.Developer'];
    const devName = typeof assignedDevObj === 'object' ? assignedDevObj?.displayName : String(assignedDevObj || '');
    const createdByObj = fields['System.CreatedBy'];
    const developer =
      devName ||
      (typeof createdByObj === 'object' ? createdByObj?.displayName : String(createdByObj || ''));
    const rawScenarios =
      fields['Microsoft.VSTS.TCM.ReproSteps'] ||
      fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ||
      description;
    const testingScenarios = rawScenarios.replace(/<[^>]*>?/gm, '').trim();

    return res.json({
      success: true,
      ticketNumber: cleanId,
      title,
      description,
      areaPath,
      assignee,
      developer,
      priority,
      state,
      workType,
      testingScenarios,
      rawFields: fields,
      message: `Successfully fetched Ticket #${cleanId} from Azure DevOps!`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Server error proxying request to Azure DevOps.',
      errorDetail: err?.message || String(err),
    });
  }
});

apiRouter.post('/azure/attach', async (req: Request, res: Response) => {
  try {
    const { workItemId, organization, project, pat, fileName, fileBase64, comment } = req.body;
    const cleanId = String(workItemId || '').match(/\d{3,8}/)?.[0] || String(workItemId || '').trim();
    const cleanOrg = (organization || workspaceAdoOrg || 'quantumphinance').trim();
    const cleanProject = (project || workspaceAdoProject || 'Beacon').trim();
    const token = (pat || workspaceAdoToken || process.env.AZURE_DEVOPS_PAT || process.env.ADO_PAT || '').trim();

    if (!cleanId || !fileName || !fileBase64) {
      return res.status(400).json({ success: false, message: 'workItemId, fileName, and fileBase64 required' });
    }
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Personal Access Token (PAT) required to attach files to Azure DevOps' });
    }

    const authHeader = `Basic ${Buffer.from(':' + token).toString('base64')}`;
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // 1. Upload Attachment Binary
    const uploadUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=7.0`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return res.status(uploadRes.status).json({
        success: false,
        message: `Attachment upload failed (${uploadRes.status} ${uploadRes.statusText})`,
        errorDetail: errText,
      });
    }

    const uploadData = (await uploadRes.json()) as any;
    const attachmentUrl = uploadData?.url;

    if (!attachmentUrl) {
      return res.status(500).json({ success: false, message: 'Azure DevOps did not return an attachment URL' });
    }

    // 2. Link Attachment to Work Item via JSON Patch
    const patchUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_apis/wit/workitems/${cleanId}?api-version=7.0`;
    const patchBody = [
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'AttachedFile',
          url: attachmentUrl,
          attributes: {
            comment: comment || `QA Test Matrix exported from Beacon QA Hub at ${new Date().toLocaleString()}`,
          },
        },
      },
    ];

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(patchBody),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return res.status(patchRes.status).json({
        success: false,
        message: `Failed to link attachment to Work Item #${cleanId}`,
        errorDetail: errText,
      });
    }

    const workItemUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_workitems/edit/${cleanId}`;

    return res.json({
      success: true,
      message: `Successfully attached ${fileName} directly to Azure DevOps Ticket #${cleanId}!`,
      workItemUrl,
      attachmentUrl,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Server error uploading attachment to Azure DevOps',
      errorDetail: err?.message || String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// AI Test Case Generation & Multi-Language Translation (Gemini API with Fallback)
// ---------------------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Deterministic Rich Domain Generator (Guarantees 20+ High-Quality Cases If Offline / Quota Hit)
function generateRichFallbackTestCases(params: {
  scenario: string;
  description: string;
  moduleName?: string;
  ticketNo?: string;
  screenFields?: string[];
  count?: number;
}) {
  const mod = params.moduleName || 'Term Loan';
  const rawScenario = params.scenario || params.description || 'Core feature workflow';
  const ticketNo = params.ticketNo || '1024';
  const fields = params.screenFields && params.screenFields.length > 0
    ? params.screenFields
    : ['Deal Number', 'Principal Amount', 'Interest Rate %', 'Value Date', 'Maturity Date', 'Penalty Rate %', 'Status'];

  const f0 = fields[0] || 'Deal ID';
  const f1 = fields[1] || 'Amount';
  const f2 = fields[2] || 'Rate %';
  const f3 = fields[3] || 'Value Date';

  const cleanScenario = rawScenario.replace(/[\n\r]+/g, ' ').trim();

  const baseCases = [
    // Positive / Happy Path (1 to 6)
    {
      type: 'Positive Workflow',
      scenario: `Verify standard successful workflow for ${cleanScenario}`,
      steps: `1. Log in to Beacon Quality Hub with QA credentials.\n2. Navigate to ${mod} module screen.\n3. Enter valid mandatory inputs: ${f0} = 'TL-24-001', ${f1} = '1,000,000.00', ${f2} = '8.50%', ${f3} = '01-Apr-2025'.\n4. Submit and observe system response.\n5. Verify status transitions and audit log generation.`,
      inputs: `${f0}: TL-24-001 | ${f1}: 1,000,000.00 | ${f2}: 8.50% | ${f3}: 01-Apr-2025`,
      expected: `System processes transaction successfully without errors, displays green success notification, saves record to database, and updates deal state to 'Active / Confirmed'.`,
    },
    {
      type: 'Positive Workflow',
      scenario: `Verify calculation accuracy and ledger entry generation for ${cleanScenario}`,
      steps: `1. Open deal ${f0} = 'TL-24-001'.\n2. Trigger calculation engine for ${cleanScenario}.\n3. Verify amortization schedule, interest accrual, and fee computation.\n4. Check cashflow breakdown view.`,
      inputs: `Principal: 10,000,000 INR | Tenor: 36 Months | Frequency: Monthly | Day Count: Actual/365`,
      expected: `Accrual calculations match financial mathematics precisely (rounded to 2 decimal places), and all cashflow legs display proper value dates and repayment entries.`,
    },
    {
      type: 'Positive Workflow',
      scenario: `Verify automated overdue and penalty calculation when loan is disbursed`,
      steps: `1. Disburse loan deal TL-24-001 with value date 01-Jan-2025.\n2. Shift system date past due date to trigger overdue condition.\n3. Execute End of Day (EOD) accrual process.\n4. Verify penalty interest (10%) and penalty principal (10%) in cashflow view.`,
      inputs: `Disbursement Date: 01-Jan-2025 | Due Date: 01-Feb-2025 | Overdue Days: 15 | Penalty Rate: 10%`,
      expected: `Penalty entries appear in cashflow exclusively because disbursement occurred. Overdue report includes the deal with accurate overdue aging.`,
    },
    {
      type: 'Positive Workflow',
      scenario: `Verify multi-currency and high-value precision in ${mod}`,
      steps: `1. Create new entry in ${mod} with currency USD and high principal amount 50,000,000.00.\n2. Apply exchange rate FX = 86.50.\n3. Save and verify converted INR reporting numbers.`,
      inputs: `Currency: USD | Amount: 50,000,000.00 | Spot FX: 86.50`,
      expected: `System stores high precision float values without rounding discrepancies or scientific notation errors. Converted balance matches INR 4,325,000,000.00.`,
    },
    {
      type: 'Positive Workflow',
      scenario: `Verify successful Excel and Word document export with all columns and screenshots`,
      steps: `1. Navigate to ${mod} report / test grid.\n2. Click 'Download Excel' and 'Export Word (.docx)' buttons.\n3. Open exported files.\n4. Verify ticket header metadata, full column matrix, Actual Result column, and attached screenshots.`,
      inputs: `Export Format: XLSX & DOCX | Ticket #${ticketNo}`,
      expected: `Export files open cleanly without file corruption warnings. Headers, table rows, Actual Result, and screenshot images are clearly rendered and visible.`,
    },
    {
      type: 'Positive Workflow',
      scenario: `Verify update and modification flow of existing approved record`,
      steps: `1. Select an existing record in ${mod}.\n2. Click Edit and update ${f2} from 8.50% to 9.00%.\n3. Save changes.\n4. Verify revision history and audit log.`,
      inputs: `Old Rate: 8.50% | New Rate: 9.00% | Revision Reason: 'Rate hike per RBI notification'`,
      expected: `System saves updated record, increments version number (e.g. v1.1), logs user timestamp, and reflects new rate across future cashflow projections.`,
    },

    // Negative / Validation Scenarios (7 to 13)
    {
      type: 'Negative Validation',
      scenario: `Verify mandatory field validation when ${f0} and ${f1} are left empty`,
      steps: `1. Navigate to create screen in ${mod}.\n2. Leave mandatory fields (${f0}, ${f1}) completely blank.\n3. Click 'Save' or 'Submit'.\n4. Verify UI field highlights and warning banners.`,
      inputs: `${f0}: [EMPTY] | ${f1}: [EMPTY]`,
      expected: `System blocks submission, highlights mandatory fields in red with message 'This field is required', and prevents null records from being inserted into database.`,
    },
    {
      type: 'Negative Validation',
      scenario: `Verify input restriction on negative, zero, and non-numeric characters for ${f1}`,
      steps: `1. Enter negative value '-50000' in ${f1}.\n2. Attempt saving.\n3. Enter alpha-numeric string 'ABC@#$' in numeric rate field.\n4. Attempt saving.`,
      inputs: `${f1}: -50,000.00 | ${f2}: ABCDEF`,
      expected: `System rejects invalid inputs with specific error toast: 'Amount must be greater than zero' and restricts non-numeric keystrokes.`,
    },
    {
      type: 'Negative Validation',
      scenario: `Verify penalty entries DO NOT appear in cashflow without loan disbursement`,
      steps: `1. Create loan deal without completing disbursement stage.\n2. Set payment due date in the past.\n3. Inspect cashflow and overdue report.\n4. Verify penalty calculations are blocked.`,
      inputs: `Loan State: 'Sanctioned / Undisbursed' | Due Date: 10-Jan-2025`,
      expected: `Penalty interest and principal are NOT generated or displayed in cashflow when disbursement has not occurred. System enforces strict business logic guard.`,
    },
    {
      type: 'Negative Validation',
      scenario: `Verify duplicate deal identification error when re-using existing ${f0}`,
      steps: `1. Attempt to create a new record in ${mod} using an already existing ${f0} = 'TL-24-001'.\n2. Click Submit.\n3. Observe database conflict handling.`,
      inputs: `${f0}: TL-24-001 (Existing ID)`,
      expected: `System prevents duplicate entry and displays error: 'Record with ID TL-24-001 already exists in the system'.`,
    },
    {
      type: 'Negative Validation',
      scenario: `Verify invalid date range validation (Maturity Date prior to Value Date)`,
      steps: `1. Set ${f3} (Value Date) = '15-May-2025'.\n2. Set Maturity Date = '10-May-2025' (past date relative to Value Date).\n3. Trigger date validation on blur.`,
      inputs: `Value Date: 15-May-2025 | Maturity Date: 10-May-2025`,
      expected: `System immediately throws validation error: 'Maturity Date cannot be earlier than Value Date' and prevents form submission.`,
    },
    {
      type: 'Negative Validation',
      scenario: `Verify SQL injection and XSS payload resistance in text inputs`,
      steps: `1. In description and remarks fields, enter standard SQL injection strings: \"' OR '1'='1; --\" and XSS script tags: \"<script>alert('XSS')</script>\".\n2. Save record.\n3. Inspect rendered UI and database storage.`,
      inputs: `Payload: '<script>alert(1)</script>' & \"' OR '1'='1\"`,
      expected: `System sanitizes input safely, stores escaped text without executing scripts or altering SQL query structures. No alert dialog appears.`,
    },
    {
      type: 'Negative Validation',
      scenario: `Verify behavior when network disconnects or API server returns 500 error`,
      steps: `1. Fill all valid details in ${mod}.\n2. Simulate network disconnect / offline state.\n3. Click Submit.\n4. Reconnect network and verify retry.`,
      inputs: `Network: Offline / Timeout`,
      expected: `UI displays non-blocking toast: 'Unable to connect to server. Your changes are preserved locally. Please retry.' No data is lost.`,
    },

    // Boundary Value & Edge Cases (14 to 17)
    {
      type: 'Boundary / Edge Case',
      scenario: `Verify boundary condition at maximum permissible currency limits (999,999,999,999.99)`,
      steps: `1. Enter maximum allowed principal 999,999,999,999.99.\n2. Verify formatting with commas.\n3. Attempt to enter 1,000,000,000,000.00.\n4. Check calculation engine for overflow.`,
      inputs: `Amount: 999,999,999,999.99 (Boundary Upper Limit)`,
      expected: `System handles upper boundary with 64-bit precision without buffer overflow or UI text cutoff. Values exceeding maximum throw clean boundary warning.`,
    },
    {
      type: 'Boundary / Edge Case',
      scenario: `Verify leap year calculation (29th Feb) and interest day count convention (366 days)`,
      steps: `1. Create deal with tenor spanning leap year date 29-Feb-2028.\n2. Select day count convention Actual/365 and Actual/360.\n3. Compare computed accrual interest against actuarial standard.`,
      inputs: `Tenor: 01-Jan-2028 to 31-Dec-2028 (366 Days Leap Year)`,
      expected: `System properly recognizes 29 days in February 2028. Daily accrual divisor uses 366 or 365 per selected convention accurately.`,
    },
    {
      type: 'Boundary / Edge Case',
      scenario: `Verify backdated prepayment entry and interest recalculation rollover`,
      steps: `1. Open active deal with past payments recorded.\n2. Post a backdated principal prepayment with value date 30 days prior.\n3. Verify recalculation of all subsequent interest installments.`,
      inputs: `Prepayment: 200,000 INR | Backdated Value Date: T-30 Days`,
      expected: `System reverses subsequent over-accrued interest, re-generates future installment schedule with reduced balance, and updates cashflow.`,
    },
    {
      type: 'Boundary / Edge Case',
      scenario: `Verify grace period boundary (Overdue applied strictly on Day Grace+1)`,
      steps: `1. Configure deal with Grace Period = 3 business days.\n2. Advance date to Due Date + 3 days (within grace period) and verify penalty is 0.\n3. Advance date to Due Date + 4 days (grace period expired).`,
      inputs: `Grace Period: 3 Days | Due Date: 10th | Check on 13th vs 14th`,
      expected: `On 13th (Grace period active), zero penalty is charged. On 14th (Grace expired), penalty interest and penalty principal immediately trigger.`,
    },

    // Security & Data Integrity (18 to 19)
    {
      type: 'Security & Integrity',
      scenario: `Verify Role-Based Access Control (RBAC): QA vs Developer vs Super Admin permissions`,
      steps: `1. Log in as QA user and verify test execution and editing permissions.\n2. Log in as read-only auditor and verify Save/Delete/Approve buttons are disabled.\n3. Verify sign-off authorization requires Senior QA / Super Admin role.`,
      inputs: `User: QA / Super Admin / Auditor`,
      expected: `Strict RBAC enforced. Unauthorized users cannot approve test suites, delete records, or modify finalized sign-offs.`,
    },
    {
      type: 'Security & Integrity',
      scenario: `Verify concurrent session modification lock and optimistic locking`,
      steps: `1. Open deal #${ticketNo} in two separate browser tabs simultaneously.\n2. In Tab 1, update status and save.\n3. In Tab 2, attempt updating with stale data without refreshing.`,
      inputs: `Session 1 & Session 2 simultaneous save`,
      expected: `System detects version conflict via optimistic locking, alerts Tab 2 user with 'Record was updated by another session', and prevents data overwrites.`,
    },

    // UI, Reporting & Multi-Image Export (20 to 22)
    {
      type: 'Reporting & UI',
      scenario: `Verify test cases table inline editing, clipboard paste, and screenshot preview thumbnail`,
      steps: `1. In test cases table, paste a screenshot directly into the evidence cell using Ctrl+V.\n2. Verify image thumbnail renders immediately in the row cell.\n3. Click thumbnail to open high-resolution image preview lightbox.\n4. Edit Actual Result column inline.`,
      inputs: `Clipboard: Screenshot image data | Cell: Row Evidence`,
      expected: `Screenshot thumbnail displays cleanly inside the row. Clicking thumbnail opens full-size modal. Actual Result updates without page reload.`,
    },
    {
      type: 'Reporting & UI',
      scenario: `Verify 'Delete All Test Cases' action with confirmation prompt and table reset`,
      steps: `1. Navigate to test cases table toolbar.\n2. Click 'Delete All Test Cases' on top-left corner of the table.\n3. In confirmation modal, verify ticket ID and test case count.\n4. Confirm deletion and verify table empties gracefully.`,
      inputs: `Action: Delete All Test Cases | Ticket #${ticketNo}`,
      expected: `System prompts user for confirmation. Upon confirmation, all test cases for the ticket are cleared, state updates cleanly, and success notification appears.`,
    },
  ];

  return baseCases.map((c, idx) => {
    const num = idx + 1;
    const tcId = `TC${num < 10 ? '0' + num : num}`;
    return {
      id: `tc-${Date.now()}-${num}`,
      testCaseId: tcId,
      testModule: mod.toLowerCase(),
      featureTab: (cleanScenario.slice(0, 20) || 'general').toLowerCase(),
      testScenario: c.scenario,
      preconditions: `Active ${mod} module loaded; User authenticated with QA role; Master data seeded.`,
      testCases: c.steps,
      testInputs: c.inputs,
      expectedResult: c.expected,
      actualResult: 'Pending execution - ready for QA testing',
      validationScenario: c.type,
      status: 'not run',
      attachments: [],
      screenshot1: '',
    };
  });
}

// POST: /api/ai/generate-test-cases
apiRouter.post('/api/ai/generate-test-cases', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      scenario,
      description,
      screenFields,
      attachedImages = [],
      ticketNo = '1024',
      moduleName = 'Term Loan',
      clientName = 'Treasury Master',
      count = 20,
    } = req.body;

    const userInstructions = [
      prompt || '',
      scenario ? `Scenario: ${scenario}` : '',
      description ? `Description: ${description}` : '',
      screenFields && screenFields.length > 0 ? `Screen Fields: ${screenFields.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const ai = getGeminiClient();

    if (ai) {
      try {
        const systemInstruction = `You are an Elite Principal Financial QA Automation & Manual Testing Lead at Beacon / Quantum Phinance.
The user provides test requirements, scenarios, or bug descriptions. They may write in ANY language (English, Hindi, Hinglish like 'loan close hone pe penalty mat lagao', or shorthand notes).

Your objectives:
1. Understand the user's intent deeply. Translate any Hindi, Hinglish, or informal wording into crisp, professional, enterprise-standard English QA specifications.
2. If screenshot images are attached, carefully analyze the UI elements, fields, error messages, formulas, and buttons depicted in the screenshots.
3. Generate AT LEAST ${Math.max(count, 20)} distinct, comprehensive, production-grade test cases.
4. Structure the test suite with realistic coverage:
   - 6-7 Positive / Happy Path workflows
   - 6-7 Negative / Validation / Exception scenarios (missing inputs, invalid formats, wrong state)
   - 3-4 Boundary Value Analysis & Edge Cases (min/max limits, leap year, grace periods, rollover dates)
   - 2-3 Security, Role Access (RBAC) & Data Integrity scenarios
   - 2-3 UI, Reporting & Excel/Word Export Data Consistency scenarios
5. Every test case MUST contain:
   - testCaseId: string (e.g. 'TC01', 'TC02', ...)
   - testModule: string (e.g. '${moduleName}')
   - featureTab: string (e.g. 'penalty', 'disbursement', 'cashflow')
   - testScenario: string (clear, single-line scenario statement in English)
   - preconditions: string (system prerequisites)
   - testCases: string (numbered step-by-step test execution steps)
   - testInputs: string (concrete test data)
   - expectedResult: string (clear, unambiguous expected outcome)
   - actualResult: string (default to 'Pending execution - ready for QA testing')
   - validationScenario: string ('Positive Workflow' | 'Negative Validation' | 'Boundary / Edge Case' | 'Security & Integrity' | 'Reporting & UI')
   - status: string ('not run')

Return strictly valid JSON in this exact structure without markdown fences:
{
  "summary": "Brief explanation in English of the 20+ test cases generated",
  "testCases": [
    {
      "testCaseId": "TC01",
      "testModule": "${moduleName}",
      "featureTab": "workflow",
      "testScenario": "...",
      "preconditions": "...",
      "testCases": "1. Step one\\n2. Step two",
      "testInputs": "...",
      "expectedResult": "...",
      "actualResult": "Pending execution - ready for QA testing",
      "validationScenario": "Positive Workflow",
      "status": "not run"
    }
  ]
}`;

        // Prepare contents array with optional image parts
        const contentsParts: any[] = [];

        // If base64 screenshot images were provided
        if (Array.isArray(attachedImages) && attachedImages.length > 0) {
          for (const img of attachedImages.slice(0, 3)) {
            if (typeof img === 'string' && img.startsWith('data:image/')) {
              const commaIdx = img.indexOf(',');
              if (commaIdx !== -1) {
                const mimeMatch = img.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                const base64Data = img.substring(commaIdx + 1);
                contentsParts.push({
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                });
              }
            }
          }
        }

        contentsParts.push({
          text: `Module: ${moduleName}\nTicket: #${ticketNo}\nClient: ${clientName}\nTarget Count: ${count}\n\nUser Input & Requirements:\n${userInstructions || 'Generate full test case suite for financial module'}`,
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contentsParts,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const responseText = response.text || '';
        let parsedResult: any = null;
        try {
          parsedResult = JSON.parse(responseText);
        } catch (parseErr) {
          // If response had markdown codeblocks or trailing text
          const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsedResult = JSON.parse(cleaned);
        }

        if (parsedResult && Array.isArray(parsedResult.testCases) && parsedResult.testCases.length > 0) {
          const finalCases = parsedResult.testCases.map((tc: any, i: number) => {
            const num = i + 1;
            const tcId = tc.testCaseId || `TC${num < 10 ? '0' + num : num}`;
            return {
              id: `tc-${Date.now()}-${num}`,
              testCaseId: tcId,
              testModule: tc.testModule || moduleName,
              featureTab: tc.featureTab || 'general',
              testScenario: tc.testScenario || `Test scenario ${num}`,
              preconditions: tc.preconditions || 'System is online and operational.',
              testCases: tc.testCases || '1. Navigate to screen\n2. Perform operation\n3. Verify result',
              testInputs: tc.testInputs || 'Standard parameters',
              expectedResult: tc.expectedResult || 'Operation completes successfully.',
              actualResult: tc.actualResult || 'Pending execution - ready for QA testing',
              validationScenario: tc.validationScenario || (i % 2 === 0 ? 'Positive Workflow' : 'Negative Validation'),
              status: tc.status || 'not run',
              attachments: [],
              screenshot1: '',
            };
          });

          return res.json({
            success: true,
            source: 'gemini-3.8-flash',
            count: finalCases.length,
            summary: parsedResult.summary || `Successfully generated ${finalCases.length} comprehensive test cases via Gemini AI.`,
            testCases: finalCases,
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed or quota reached, falling back to rich domain generator:', geminiError?.message || geminiError);
      }
    }

    // Fallback if no Gemini key or quota reached
    const fallbackCases = generateRichFallbackTestCases({
      scenario,
      description,
      moduleName,
      ticketNo,
      screenFields,
      count,
    });

    return res.json({
      success: true,
      source: 'domain-fallback-engine',
      count: fallbackCases.length,
      summary: `Generated ${fallbackCases.length} production-grade test cases (Positive, Negative, Boundary, Security & Reporting) tailored to Ticket #${ticketNo}.`,
      testCases: fallbackCases,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate test cases',
      errorDetail: err?.message || String(err),
    });
  }
});

// POST: /api/ai/polish-text (Translates Hindi/Hinglish to Clean QA English)
apiRouter.post('/api/ai/polish-text', async (req: Request, res: Response) => {
  try {
    const { text = '', context = 'test-scenario' } = req.body;
    if (!text.trim()) {
      return res.json({ success: true, polishedText: '' });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are a Senior QA Technical Writer. The following text may be in Hindi, Hinglish, informal notes, or broken English.
Translate and refine it into clear, simple, grammatically impeccable English suitable for a professional QA test case or defect description.
Do not add conversational commentary or fluff. Return ONLY the polished English text.

Input Text:
"""
${text}
"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            temperature: 0.1,
          },
        });

        const polished = response.text?.trim() || text;
        return res.json({ success: true, polishedText: polished });
      } catch (gemErr) {
        console.warn('Gemini polish failed, using regex polisher fallback:', gemErr);
      }
    }

    // Quick regex-based English polisher fallback for common Hindi/Hinglish terms
    let clean = text.trim();
    const hindiMap: Record<string, string> = {
      'agar': 'If',
      'jab': 'When',
      'tab': 'then',
      'mat hone dena': 'must not occur',
      'nahi hona chahiye': 'should not happen',
      'hona chahiye': 'must occur',
      'galat': 'invalid',
      'sahi': 'valid',
      'dikhe': 'displayed',
      'dikhna chahiye': 'must be visible',
      'karo': 'perform',
      'bhi': 'also',
    };

    let converted = clean;
    Object.keys(hindiMap).forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      converted = converted.replace(regex, hindiMap[term]);
    });

    if (converted.length > 0) {
      converted = converted.charAt(0).toUpperCase() + converted.slice(1);
      if (!converted.endsWith('.')) converted += '.';
    }

    return res.json({ success: true, polishedText: converted });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to polish text',
      errorDetail: err?.message || String(err),
    });
  }
});

