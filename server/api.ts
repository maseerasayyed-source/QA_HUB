import express, { Request, Response, NextFunction } from 'express';
import { query, getDbStatus } from './db';

export const apiRouter = express.Router();
apiRouter.use(express.json());

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
    const cleanProject = (project || workspaceAdoProject || 'Beacon').trim();
    const token = (pat || workspaceAdoToken || process.env.AZURE_DEVOPS_PAT || process.env.ADO_PAT || '').trim();

    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Work Item / Ticket ID is required' });
    }

    const adoUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(cleanProject)}/_apis/wit/workitems/${cleanId}?api-version=7.0&$expand=all`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Beacon-QA-Hub/1.0',
    };

    if (token) {
      headers['Authorization'] = `Basic ${Buffer.from(':' + token).toString('base64')}`;
    }

    const adoResponse = await fetch(adoUrl, { method: 'GET', headers });
    const contentType = adoResponse.headers.get('content-type') || '';

    // If Azure DevOps returns HTTP 203 or non-JSON content-type, it indicates redirection to Microsoft SSO / authentication required
    if (adoResponse.status === 203 || !contentType.includes('application/json') || adoResponse.status === 401 || adoResponse.status === 403) {
      return res.json({
        success: false,
        requiresPat: true,
        statusCode: adoResponse.status,
        ticketNumber: cleanId,
        message: !token
          ? `Azure DevOps organization '${cleanOrg}' requires a Personal Access Token (PAT). Please enter your PAT below with Work Items (Read) permission to fetch live data.`
          : `Azure DevOps rejected access (${adoResponse.status}). Please verify that your PAT has 'Work Items (Read)' permission for ${cleanOrg}/${cleanProject}.`,
      });
    }

    if (!adoResponse.ok) {
      const errText = await adoResponse.text();
      return res.json({
        success: false,
        statusCode: adoResponse.status,
        ticketNumber: cleanId,
        message: `Azure DevOps API returned ${adoResponse.status} ${adoResponse.statusText}.`,
        errorDetail: errText.slice(0, 300),
      });
    }

    const data = (await adoResponse.json()) as any;
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

