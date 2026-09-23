import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { query, getDbStatus } from './db';

export const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '50mb' }));
apiRouter.use(express.urlencoded({ extended: true, limit: '50mb' }));

import fs from 'fs';
import path from 'path';

const STORE_FILE_PATH = path.join(process.cwd(), 'server', 'qa_hub_store.json');

// Persistent data cache for multi-user sync across all QA / Dev users
interface ServerStore {
  users: Array<{ name: string; role: string; email: string }>;
  activityLogs: any[];
  tickets: any[];
  testCasesMap: Record<string, any[]>;
  testCaseHeadersMap: Record<string, any>;
  observationsMap: Record<string, any[]>;
  devTestingMap: Record<string, any[]>;
  devTestingHeadersMap: Record<string, any>;
}

function loadServerStoreFromDisk(): ServerStore {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const data = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      return {
        users: parsed.users || [
          { name: 'Maseera Sayyed', role: 'Super Admin', email: 'maseerasayyed@quantumphinance.com' },
          { name: 'QA User', role: 'QA', email: 'qa@quantumphinance.com' },
          { name: 'BA User', role: 'BA', email: 'ba@quantumphinance.com' },
          { name: 'Developer User', role: 'Developer', email: 'dev@quantumphinance.com' },
          { name: 'Product User', role: 'Product Team', email: 'product@quantumphinance.com' }
        ],
        activityLogs: parsed.activityLogs || [],
        tickets: parsed.tickets || [],
        testCasesMap: parsed.testCasesMap || {},
        testCaseHeadersMap: parsed.testCaseHeadersMap || {},
        observationsMap: parsed.observationsMap || {},
        devTestingMap: parsed.devTestingMap || {},
        devTestingHeadersMap: parsed.devTestingHeadersMap || {}
      };
    }
  } catch (err) {
    console.warn('[QA Hub Server] Could not read disk store:', err);
  }

  return {
    users: [
      { name: 'Maseera Sayyed', role: 'Super Admin', email: 'maseerasayyed@quantumphinance.com' },
      { name: 'QA User', role: 'QA', email: 'qa@quantumphinance.com' },
      { name: 'BA User', role: 'BA', email: 'ba@quantumphinance.com' },
      { name: 'Developer User', role: 'Developer', email: 'dev@quantumphinance.com' },
      { name: 'Product User', role: 'Product Team', email: 'product@quantumphinance.com' }
    ],
    activityLogs: [],
    tickets: [],
    testCasesMap: {},
    testCaseHeadersMap: {},
    observationsMap: {},
    devTestingMap: {},
    devTestingHeadersMap: {}
  };
}

const mockMemoryStore = loadServerStoreFromDisk();

function saveServerStoreToDisk() {
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(mockMemoryStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('[QA Hub Server] Error writing store to disk:', err);
  }
}

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

// Sync full state to/from Persistent Store & DB
apiRouter.post('/sync-state', async (req: AuthenticatedRequest, res: Response) => {
  const {
    tickets,
    testCases,
    testCasesMap,
    observations,
    observationsMap,
    devTesting,
    devTestingMap,
    testCaseHeadersMap,
    devTestingHeadersMap,
  } = req.body;
  const user = req.userContext;

  if (Array.isArray(tickets)) {
    // Merge tickets smartly by ticketNumber / id
    const existingMap = new Map<string, any>();
    mockMemoryStore.tickets.forEach((t) => {
      const key = (t.ticketNumber || t.id || '').toLowerCase();
      if (key) existingMap.set(key, t);
    });

    tickets.forEach((incoming) => {
      const key = (incoming.ticketNumber || incoming.id || '').toLowerCase();
      if (key) {
        existingMap.set(key, { ...(existingMap.get(key) || {}), ...incoming });
      }
    });

    mockMemoryStore.tickets = Array.from(existingMap.values());
  }

  if (testCasesMap) {
    mockMemoryStore.testCasesMap = { ...mockMemoryStore.testCasesMap, ...testCasesMap };
  } else if (testCases) {
    mockMemoryStore.testCasesMap = { ...mockMemoryStore.testCasesMap, ...testCases };
  }

  if (testCaseHeadersMap) {
    mockMemoryStore.testCaseHeadersMap = { ...mockMemoryStore.testCaseHeadersMap, ...testCaseHeadersMap };
  }

  if (observationsMap) {
    mockMemoryStore.observationsMap = { ...mockMemoryStore.observationsMap, ...observationsMap };
  } else if (observations) {
    mockMemoryStore.observationsMap = { ...mockMemoryStore.observationsMap, ...observations };
  }

  if (devTestingMap) {
    mockMemoryStore.devTestingMap = { ...mockMemoryStore.devTestingMap, ...devTestingMap };
  } else if (devTesting) {
    mockMemoryStore.devTestingMap = { ...mockMemoryStore.devTestingMap, ...devTesting };
  }

  if (devTestingHeadersMap) {
    mockMemoryStore.devTestingHeadersMap = { ...mockMemoryStore.devTestingHeadersMap, ...devTestingHeadersMap };
  }

  // Save to disk so that data is permanent across server reboots
  saveServerStoreToDisk();

  // Also persist to PostgreSQL tables if connected
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
          [t.ticketNumber || t.ticket_id, t.featureName || t.title || '', t.status || 'Open', t.priority || 'Medium', t.description || '', t.createdBy || user?.userName || '']
        );
      }
    }
  } catch (err) {
    // Ignore db write failure and use disk store
  }

  await logActivity(user?.userName || 'User', user?.userRole || 'Role', 'State Sync / DB Persistence Update', 'StateSync');

  return res.json({
    status: 'success',
    syncedAt: new Date().toISOString(),
    ticketCount: mockMemoryStore.tickets.length,
  });
});

apiRouter.get('/sync-state', async (_req: Request, res: Response) => {
  return res.json({
    tickets: mockMemoryStore.tickets,
    testCasesMap: mockMemoryStore.testCasesMap,
    testCaseHeadersMap: mockMemoryStore.testCaseHeadersMap,
    observationsMap: mockMemoryStore.observationsMap,
    devTestingMap: mockMemoryStore.devTestingMap,
    devTestingHeadersMap: mockMemoryStore.devTestingHeadersMap,
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

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

async function callGemini(options: {
  contents: any[];
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured on server');

  let lastError: any = null;
  for (const model of CANDIDATE_GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {
          temperature: options.temperature ?? 0.2,
        };
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
        if (options.responseMimeType) config.responseMimeType = options.responseMimeType;

        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config,
        });

        const text = response.text?.trim() || '';
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        console.warn(`[Gemini] Model ${model} (attempt ${attempt}) error (${status}):`, err?.message || String(err));
        if (status === 503 || status === 429) {
          await new Promise((r) => setTimeout(r, 450));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed');
}

apiRouter.get(['/ai/status', '/api/ai/status'], async (_req: Request, res: Response) => {
  const key = process.env.GEMINI_API_KEY;
  const ai = getGeminiClient();
  let testResult = 'not-tested';
  let workingModel = null;
  let testError = null;

  if (ai) {
    for (const m of CANDIDATE_GEMINI_MODELS) {
      try {
        const resp = await ai.models.generateContent({
          model: m,
          contents: [{ text: 'Ping' }],
        });
        if (resp.text) {
          testResult = resp.text.trim();
          workingModel = m;
          break;
        }
      } catch (e: any) {
        testError = `${m}: ${e?.message || String(e)}`;
      }
    }
  }

  return res.json({
    hasKey: !!key,
    keyLen: key ? key.length : 0,
    hasClient: !!ai,
    workingModel,
    testResult,
    testError,
  });
});

// Deterministic Clean QA Generator (Directly derived from user's description, without random fake IDs)
function generateRichFallbackTestCases(params: {
  scenario: string;
  description: string;
  moduleName?: string;
  ticketNo?: string;
  screenFields?: string[];
  count?: number;
}) {
  const mod = params.moduleName || 'Financial Module';
  const rawText = (params.description || params.scenario || 'Feature workflow verification').trim();
  const ticketNo = params.ticketNo || '1024';

  const shouldMarkAllPass = /pass|working as expected|actual result pass/i.test(rawText);

  // Extract numbered or bulleted points from user input
  const lines = rawText.split(/[\n\r]+/);
  const numberedPoints: { num: number; text: string }[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)[\.\)\-:]\s*(.+)$/);
    if (match) {
      numberedPoints.push({ num: parseInt(match[1], 10), text: match[2].trim() });
    } else if (
      !/currently me ek testing|ab me tujhe wo bhi scenarios|abhi k liye sare actual result/i.test(trimmed) &&
      trimmed.length > 5
    ) {
      otherLines.push(trimmed.replace(/^[-*•]\s*/, ''));
    }
  }

  const generated: any[] = [];

  // If user provided numbered points, handle every single one specifically
  if (numberedPoints.length > 0) {
    numberedPoints.forEach((pt, pIdx) => {
      const lower = pt.text.toLowerCase();
      let scenario = `Validate scenario ${pIdx + 1}`;
      let verification = `Verify that ${pt.text}`;
      let expected = 'Action executes properly and system updates relevant records.';
      let actual = 'Verified successfully in accordance with specifications.';
      let type = 'Positive Workflow';

      if (lower.includes('gl code') && (lower.includes('new fiels') || lower.includes('new fields') || lower.includes('editable'))) {
        scenario = 'Validate editability of newly added GL Code fields';
        verification = 'Verify that all newly added GL Code fields in the Global Accounting Code Master are editable.';
        expected = 'All newly added GL Code fields should be editable and the user should be able to update/save the required values.';
        actual = 'All newly added GL Code fields are editable and values can be updated/saved successfully.';
      } else if (lower.includes('old branch') || (lower.includes('already accounting') && lower.includes('reversal'))) {
        scenario = 'Validate accounting entries for existing deals on an old branch';
        verification = 'Verify that accounting entries are not regenerated for deals whose accounting entries were already generated and saved on the old branch.';
        expected = 'No additional accounting entry or reversal entry should be created for the existing deal.';
        actual = 'No additional accounting or reversal entry is generated.';
      } else if (lower.includes('gsec') || lower.includes('slr') || lower.includes('lcr')) {
        scenario = 'Validate G-Sec GL Code based on Investment Purpose';
        verification = 'Verify that the GL Code configured for different G-Sec purposes such as SLR, LCR, Investment, Lien, Other, etc. is reflected correctly in accounting entries.';
        expected = 'The accounting entry should reflect the GL Code configured for the respective G-Sec Investment Purpose.';
        actual = 'The configured GL Code is reflected correctly based on the selected G-Sec Investment Purpose.';
      } else if (lower.includes('bond') || lower.includes('coupon') || lower.includes('ncd')) {
        scenario = 'Validate Bond (Coupon/NCD) GL Code';
        verification = 'Verify that the GL Code configured for Bond (Coupon/NCD) is reflected correctly in accounting entries.';
        expected = 'The accounting entry should reflect the GL Code configured for the respective Bond (Coupon/NCD) transaction.';
        actual = 'The configured GL Code is reflected correctly in accounting.';
      } else if (lower.includes('fd') || lower.includes('fixed deposit')) {
        scenario = 'Validate FD GL Code';
        verification = 'Verify that the GL Code configured for FD is reflected correctly in accounting entries.';
        expected = 'The accounting entry should reflect the GL Code configured for the respective FD transaction.';
        actual = 'The configured GL Code is reflected correctly in accounting.';
      } else if (lower.includes('cp') || lower.includes('commercial paper')) {
        scenario = 'Validate CP GL Code';
        verification = 'Verify that the GL Code configured for CP is reflected correctly in accounting entries.';
        expected = 'The accounting entry should reflect the GL Code configured for the respective CP transaction.';
        actual = 'The configured GL Code is reflected correctly in accounting.';
      } else if (lower.includes('treps') && (lower.includes('invest') || lower.includes('investment'))) {
        scenario = 'Validate TREPS Investment GL Code';
        verification = 'Verify that the GL Code configured for TREPS investment is reflected correctly in accounting entries.';
        expected = 'The accounting entry should reflect the GL Code configured for the respective TREPS Investment.';
        actual = 'The configured GL Code is reflected correctly in accounting.';
      } else if (lower.includes('treps') && (lower.includes('borrow') || lower.includes('borrowing'))) {
        scenario = 'Validate TREPS Borrowing GL Code fields and entries';
        verification = 'Verify that the configured GL Code fields for TREPS borrowing are reflected correctly and proper accounting entries are created.';
        expected = 'The configured TREPS Borrowing GL Code should be reflected and corresponding accounting entry should be posted correctly.';
        actual = 'The configured GL Code and accounting entries are posted correctly.';
      } else if (lower.includes('deal wise') || lower.includes('deal-wise')) {
        scenario = 'Validate visibility of GL Code fields in Deal-wise Accounting';
        verification = 'Verify whether the newly added GL Code fields are displayed in Deal-wise Accounting.';
        expected = 'Newly added GL Code fields should be visible/accessible in Deal-wise Accounting as per the configuration.';
        actual = 'All GL Code fields are properly visible and accessible in Deal-wise Accounting.';
      } else if (lower.includes('jis date') || lower.includes('date pe') || lower.includes('update hue')) {
        scenario = 'Validate effective date for GL Code updates in accounting entries';
        verification = 'Verify that accounting entries reflect the GL Code based on the date the code was updated in the GL master.';
        expected = 'Accounting entries generated on or after the update date should reflect the updated GL Code.';
        actual = 'Accounting entries correctly reflect the updated GL Code as per the update date.';
      } else if (lower.includes('undo') || lower.includes('rollback')) {
        scenario = 'Validate GL Code visibility after Undo action in GL Master';
        verification = 'Verify that after performing an Undo action in the GL Master, the GL Code is no longer visible in accounting.';
        expected = 'After undoing the action from the GL Master, the code should not be visible or applied to accounting entries.';
        actual = 'The undone GL Code is not visible and not applied to accounting entries.';
      } else {
        const cleanText = pt.text.replace(/\.$/, '');
        const isNeg = /error|alert|invalid|reject|cannot|not visible|prevent|not allow/i.test(cleanText);
        scenario = `Validate ${cleanText.slice(0, 55)}`;
        verification = cleanText.toLowerCase().startsWith('verify') ? cleanText : `Verify that ${cleanText}`;
        expected = isNeg
          ? 'System enforces restriction and prevents invalid operation with clear alert.'
          : 'Operation executes successfully and relevant data/entries update consistently.';
        actual = isNeg
          ? 'Verified successfully: System restricted invalid operation and displayed proper notification.'
          : `Verified successfully: ${cleanText} executed as expected in accordance with specifications.`;
        type = isNeg ? 'Negative Validation' : 'Positive Workflow';
      }

      generated.push({
        scenario,
        verification,
        expected,
        actual: shouldMarkAllPass ? actual : actual,
        type,
      });
    });
  } else {
    // Standard line-by-line fallback
    const rawPoints = otherLines.length > 0 ? otherLines : [rawText];
    rawPoints.forEach((pt) => {
      const cleanPt = pt.replace(/\.$/, '');
      const isNeg = /error|alert|invalid|blank|reject|prevent|cannot|should not|not allow/i.test(cleanPt);
      generated.push({
        scenario: `Validate ${cleanPt.slice(0, 60)}`,
        verification: cleanPt.toLowerCase().startsWith('verify') ? cleanPt : `Verify that ${cleanPt}`,
        expected: isNeg
          ? 'System enforces restriction and prevents invalid operation.'
          : 'Operation executes successfully and relevant records update consistently.',
        actual: isNeg
          ? 'Verified successfully: System restricted invalid input.'
          : `Verified successfully: ${cleanPt} executed as expected.`,
        type: isNeg ? 'Negative Validation' : 'Positive Workflow',
      });
    });
  }

  // Add supplemental enterprise test scenarios if count is needed
  const domainScenarios = [
    {
      scenario: `UI screen consistency and layout verification`,
      verification: `Verify that all relevant fields and action buttons for '${mod}' are displayed consistently and clearly on the screen.`,
      expected: `• All relevant fields and action buttons render without visual defects.\n• Labels and values are properly aligned.\n• Controls are responsive.`,
      actual: `Verified successfully: UI elements, fields, and action buttons rendered consistently without defects.`,
      type: 'Positive Workflow',
    },
    {
      scenario: `Mandatory field validation check`,
      verification: `Verify that the system prevents submission and highlights required fields when mandatory inputs are left blank.`,
      expected: `• System blocks submission.\n• Required fields are highlighted with appropriate warning messages.\n• Incomplete data is not saved.`,
      actual: `Verified successfully: System prevented submission and clearly highlighted required blank fields.`,
      type: 'Negative Validation',
    },
    {
      scenario: `Audit trail and transaction history reflection`,
      verification: `Verify that after processing changes in '${mod}', the action is accurately recorded in transaction history with proper timestamp and user ID.`,
      expected: `• Transaction history records the event accurately.\n• User and timestamp details are preserved in audit trail.\n• History details match processed operation.`,
      actual: `Verified successfully: Transaction history and audit trail accurately recorded the action.`,
      type: 'Positive Workflow',
    },
  ];

  domainScenarios.forEach((ds) => {
    if (generated.length < (params.count || 12)) {
      generated.push(ds);
    }
  });

  return generated.map((c, idx) => {
    const num = idx + 1;
    const tcId = `TC${num < 10 ? '0' + num : num}`;
    return {
      id: `tc-${Date.now()}-${num}`,
      testCaseId: tcId,
      testModule: mod.toLowerCase(),
      featureTab: 'General',
      testScenario: c.scenario,
      preconditions: 'Standard environment and user permissions configured.',
      testCases: c.verification,
      testInputs: 'Standard parameters',
      expectedResult: c.expected,
      actualResult: c.actual,
      validationScenario: c.type,
      status: 'pass',
      attachments: [],
      screenshot1: '',
    };
  });
}

// POST: /ai/generate-test-cases and /api/ai/generate-test-cases
apiRouter.post(['/ai/generate-test-cases', '/api/ai/generate-test-cases'], async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      scenario,
      description,
      screenFields,
      attachedImages = [],
      attachments = [],
      ticketNo = '1024',
      ticketNumber,
      moduleName = 'Term Loan',
      clientName = 'Treasury Master',
      count = 20,
    } = req.body;

    const finalTicketNo = String(ticketNumber || ticketNo || '1024').trim().replace(/^#+/, '');

    // Extract any document text and image attachments
    const docTexts: string[] = [];
    const imagePayloads: string[] = [...(Array.isArray(attachedImages) ? attachedImages : [])];

    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        if (!att) continue;
        if (att.type === 'image' && typeof att.content === 'string' && att.content.startsWith('data:image/')) {
          imagePayloads.push(att.content);
        } else if (typeof att.content === 'string' && att.content.trim()) {
          docTexts.push(`[Attached Document: ${att.name || 'Doc'}]\n${att.content.slice(0, 3000)}`);
        }
      }
    }

    const userInstructions = [
      prompt || '',
      scenario ? `Specific Scenario / Acceptance Details: ${scenario}` : '',
      description ? `Ticket Description / Requirements: ${description}` : '',
      screenFields && screenFields.length > 0 ? `Detected Screen Fields: ${screenFields.join(', ')}` : '',
      docTexts.length > 0 ? docTexts.join('\n\n') : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const ai = getGeminiClient();

    if (ai) {
      try {
        const systemInstruction = `You are a Principal Banking & Treasury QA Architect and Test Engineering Lead.
The user provides ticket requirements, feature descriptions, and testing notes for:
Module: ${moduleName}
Ticket: #${finalTicketNo}
Client: ${clientName}

The user's input may be written in ANY language (English, Hindi, Hinglish, casual notes, or shorthand, e.g. "mujhe check krna hai every field in term loan", "agar blank chhod de to alert aana chahiye", "GL code reflect nahi ho raha h").

YOUR OBJECTIVES:
1. Deeply understand the user's intent. If written in Hindi, Hinglish, or casual phrasing, accurately interpret their functional requirements into crystal-clear English test cases.
2. If the user mentions specific fields, bugs, or workflows (e.g. GL codes, undo actions, fee structures, blank validations), ensure MULTIPLE dedicated test cases rigorously validate those exact requirements.
3. If the user asks to check all fields or test the module thoroughly, generate comprehensive coverage across all standard ${moduleName} workflows:
   - Deal / Facility Creation & Booking (Deal ID, counterparty, sanctioned limit vs disbursed amount, currency)
   - Interest Parameters (Fixed vs Floating, Benchmark/MCLR, Spread %, Day count convention 30/360 or Actual/365, Reset frequency)
   - Tenor, Value Date, First Repayment Date, Maturity Date validations
   - Repayment & Amortization Schedules (Principal & Interest split, Bullet, Equal installments, Moratorium period)
   - Mandatory field validation & Empty/Blank field prevention
   - Boundary & Negative Testing (Negative numbers, zero amounts, exceeding sanctioned limit, backdated restrictions)
   - Accounting & GL voucher postings, Maker-Checker authorization workflow, and Audit Trail logs
4. Generate AT LEAST ${Math.max(count, 20)} distinct, natural, production-grade test cases.
5. Format for each test case:
   - testCaseId: string ('TC01', 'TC02', etc.)
   - testModule: string ('${moduleName}')
   - featureTab: string ('General' or relevant sub-feature)
   - testScenario: string (A concise, understandable scenario title in simple English, e.g. 'Validate mandatory field validation for Loan Amount', 'Verify interest recalculation upon benchmark rate reset', 'Validate deal authorization by Senior Checker')
   - testCases: string (A single, direct verification statement starting with 'Verify that ...', written in clear, simple English)
   - testInputs: string (Specific input values or parameters, or 'Valid parameters')
   - expectedResult: string (Clear bullet points using '• ', e.g.:
• System displays appropriate validation error message.
• Prevents transaction save without mandatory field.
• Form field is highlighted with warning alert.)
   - actualResult: string (A clear positive verification statement, e.g. 'Verified successfully: Mandatory field validation triggered and prevented submission without valid input.')
   - validationScenario: string ('Positive Workflow' | 'Negative Validation' | 'Boundary & Integrity')
   - status: string ('pass')

Return strictly valid JSON in this exact structure without markdown code blocks:
{
  "summary": "Clear summary in English of the test suite generated",
  "testCases": [
    {
      "testCaseId": "TC01",
      "testModule": "${moduleName}",
      "featureTab": "General",
      "testScenario": "...",
      "testCases": "Verify that ...",
      "testInputs": "...",
      "expectedResult": "• Point 1\\n• Point 2",
      "actualResult": "Verified successfully: ...",
      "validationScenario": "Positive Workflow",
      "status": "pass"
    }
  ]
}`;

        const contentsParts: any[] = [];

        // Attach image parts if present
        if (Array.isArray(imagePayloads) && imagePayloads.length > 0) {
          for (const img of imagePayloads.slice(0, 3)) {
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
          text: `Module: ${moduleName}\nTicket: #${finalTicketNo}\nClient: ${clientName}\nTarget Test Case Count: ${count}\n\nUser Input & Requirements:\n${userInstructions || `Generate full comprehensive test cases suite for ${moduleName} module`}`,
        });

        const responseText = await callGemini({
          contents: contentsParts,
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        });

        let parsedResult: any = null;
        try {
          parsedResult = JSON.parse(responseText);
        } catch (parseErr) {
          const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsedResult = JSON.parse(cleaned);
        }

        if (parsedResult && Array.isArray(parsedResult.testCases) && parsedResult.testCases.length > 0) {
          const finalCases = parsedResult.testCases.map((tc: any, i: number) => {
            const num = i + 1;
            const tcId = tc.testCaseId || `TC${num < 10 ? '0' + num : num}`;
            const scenarioText = tc.testScenario || `Test scenario ${num}`;
            const verification = tc.testCases || `Verify that ${scenarioText}`;
            return {
              id: `tc-${Date.now()}-${num}`,
              testCaseId: tcId,
              testModule: tc.testModule || moduleName,
              featureTab: tc.featureTab || 'General',
              testScenario: scenarioText,
              preconditions: tc.preconditions || 'Standard environment and permissions configured.',
              testCases: verification.startsWith('Verify') ? verification : `Verify that ${verification}`,
              testInputs: tc.testInputs || 'Standard parameters',
              expectedResult: tc.expectedResult || '• System performs the operation successfully.\n• Relevant balances and audit logs remain synchronized.',
              actualResult: tc.actualResult || `Verified successfully: ${scenarioText} executed as expected in accordance with specification.`,
              validationScenario: tc.validationScenario || (i % 2 === 0 ? 'Positive Workflow' : 'Negative Validation'),
              status: (tc.status || 'pass').toLowerCase(),
              attachments: [],
              screenshot1: '',
            };
          });

          return res.json({
            success: true,
            source: 'gemini-3.1-flash-lite',
            count: finalCases.length,
            summary: parsedResult.summary || `Successfully generated ${finalCases.length} comprehensive test cases via Gemini AI.`,
            testCases: finalCases,
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to domain generator:', geminiError?.message || geminiError);
      }
    }

    // Fallback if no Gemini key or quota reached
    const fallbackCases = generateRichFallbackTestCases({
      scenario,
      description,
      moduleName,
      ticketNo: finalTicketNo,
      screenFields,
      count,
    });

    return res.json({
      success: true,
      source: 'local-domain-engine',
      count: fallbackCases.length,
      testCases: fallbackCases,
    });
  } catch (err: any) {
    console.error('Error generating test cases:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate test cases',
      errorDetail: err?.message || String(err),
    });
  }
});

// POST: /ai/batch-translate-testcases and /api/ai/batch-translate-testcases
// Translates all test cases in the table in a single high-speed Gemini call
apiRouter.post(['/ai/batch-translate-testcases', '/api/ai/batch-translate-testcases'], async (req: Request, res: Response) => {
  try {
    const { testCases = [] } = req.body;
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.json({ success: true, testCases: [] });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const compactList = testCases.map((tc: any, idx: number) => ({
          idx,
          id: tc.id,
          testScenario: tc.testScenario || '',
          testCases: tc.testCases || '',
          expectedResult: tc.expectedResult || '',
          actualResult: tc.actualResult || '',
        }));

        const prompt = `You are a Senior QA Architect and Technical Writer.
The following test cases may contain Hindi, Hinglish, casual notes, broken English, or shorthand.
Translate and polish every single test case into clean, simple, natural, crystal-clear QA English.

Input Test Cases JSON:
${JSON.stringify(compactList, null, 2)}

Rules:
1. Translate all Hindi/Hinglish terms accurately into simple English (e.g. "blank chhodne par" -> "when left blank", "alert aana chahiye" -> "an alert message must be displayed").
2. Keep the phrasing simple, direct, and completely understandable.
3. Keep testCases starting with 'Verify that ...'.
4. Format expectedResult cleanly with '• ' bullets.
5. Return strictly valid JSON array with the exact same indices and format:
[
  {
    "idx": 0,
    "testScenario": "Simple English Scenario",
    "testCases": "Verify that ...",
    "expectedResult": "• Expected result 1\\n• Expected result 2",
    "actualResult": "Verified successfully: ..."
  }
]`;

        const responseText = await callGemini({
          contents: [{ text: prompt }],
          responseMimeType: 'application/json',
          temperature: 0.1,
        });

        let parsed: any[] = [];
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = testCases.map((tc: any, i: number) => {
            const match = parsed.find((p: any) => p.idx === i || p.id === tc.id);
            if (match) {
              return {
                ...tc,
                testScenario: match.testScenario || tc.testScenario,
                testCases: match.testCases || tc.testCases,
                expectedResult: match.expectedResult || tc.expectedResult,
                actualResult: match.actualResult || tc.actualResult,
              };
            }
            return tc;
          });

          return res.json({ success: true, testCases: updated });
        }
      } catch (gemErr) {
        console.warn('Batch translation Gemini call failed:', gemErr);
      }
    }

    return res.json({ success: true, testCases });
  } catch (err: any) {
    console.error('Error in batch translate:', err);
    return res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// POST: /ai/polish-text and /api/ai/polish-text (Translates any language / Hindi / Hinglish to Clean, Simple QA English)
apiRouter.post(['/ai/polish-text', '/api/ai/polish-text'], async (req: Request, res: Response) => {
  try {
    const { text = '', context = 'test-scenario' } = req.body;
    if (!text || !text.trim()) {
      return res.json({ success: true, polishedText: '' });
    }

    const isObs = context === 'observation' || context === 'rfe';
    const isTaskName = context === 'taskName' || context === 'task-name' || context === 'title';
    const isDesc = context === 'description';
    const ai = getGeminiClient();
    if (ai) {
      try {
        let prompt = '';
        if (isObs) {
          prompt = `You are a Principal QA Architect and Technical Writer for a corporate banking & Treasury software application (Beacon Treasury Master).
A QA tester has provided an Observation, Defect Note, or RFE suggestion in ANY language (Hinglish, Hindi, casual notes, broken English, shorthand, or technical slang).

Transform this input into a crystal-clear, formal, corporate QA Observation statement matching these exact examples:
- Input: "FD more than 90 days wale me, FD investment ka GL code reflect nahi ho raha h"
  Output: "For FD investments with a tenure of more than 90 days, the Investment GL Code is not getting reflected."
- Input: "GL codes are missing for the existing deal in FD"
  Output: "GL codes are missing for the existing FD deal."
- Input: "deal wise me jo existing deal hai us me internal UI pe to koi field nahi dikh rahi hai interest, investment code k liye ..but front UI pe codes dikh rahe hai and generate me bhi visible ho rahe hai"
  Output: "For existing deals, the Interest GL Code and Investment GL Code fields are not visible on the Internal UI. However, the GL codes are displayed on the Front UI and are also visible in the generated output."
- Input: "UI level pe fees after maturity bhi rakh sakte hai .. bulk import me bhi allow hona chahiye"
  Output: "Observation: Fees can be configured after maturity at the UI level. The same should also be allowed through Bulk Import. Bulk Import should not restrict fee entry solely because the fee date falls after the maturity date."
- Input: "bulk authorize me reject ka option nahi hai"
  Output: "Observation: In Bulk Authorization, the Reject option is not available. A Reject option should be provided to allow the user to reject selected records during bulk authorization."
- Input: "sanction limit exceed hone par alert nahi aa raha"
  Output: "The system does not display an alert warning when the sanction limit is exceeded."

Rules:
1. Translate accurately from Hindi, Hinglish, or casual wording into professional corporate English.
2. Return ONLY the polished observation statement. Do NOT include markdown code blocks, conversational pleasantries, or quotes.

Input Text:
"""
${text}
"""`;
        } else if (isTaskName) {
          prompt = `You are a Senior QA Architect.
Translate the following feature/task title from Hindi, Hinglish, casual notes, or shorthand into a concise, single-line, simple and easily understandable English task title (e.g. "Term Loan - Field Validations and Interest Calculation").
Return ONLY the one-line title without quotes or pleasantries.

Input:
"""
${text}
"""`;
        } else if (isDesc) {
          prompt = `You are a Senior Treasury QA Architect and Technical Lead.
The user provided a feature description, acceptance requirements, or testing notes in casual language (Hindi, Hinglish, casual English, or shorthand).

Task:
Translate and organize this into a simple, natural, and easily understandable English QA Description.
- If the user provided multiple requirements/points, format it cleanly as:
Overview:
[1-2 clear, simple sentences explaining the business context and changes]

Acceptance Criteria:
1. [Requirement 1 in simple, crystal-clear English]
2. [Requirement 2 in simple, crystal-clear English]
...

- If it is a short single-topic text, output a clean, simple, natural English paragraph.
- Translate every Hindi/Hinglish phrase accurately (e.g. "editable hona chahiye" -> "must be editable", "entry nahi banna chahiye" -> "no new or reversal entries should be created").
- Return ONLY the clean, polished English text without conversational chat, pleasantries, or code blocks.

Input Text:
"""
${text}
"""`;
        } else {
          prompt = `You are an expert QA Technical Writer and Translator.
The user enters requirements, observations, defect notes, or test conditions in ANY language (Hindi, Hinglish, casual notes, broken English, or shorthand).

Convert this input into natural, crystal-clear, formal corporate English (matching top GPT QA standards).
Examples:
- Input: "deal wise me jo existing deal hai us me internal UI pe to koi field nahi dikh rahi hai interest, investment code k liye ..but front UI pe codes dikh rahe hai and generate me bhi visible ho rahe hai"
  Output: "For existing deals, the Interest GL Code and Investment GL Code fields are not visible on the Internal UI. However, the GL codes are displayed on the Front UI and are also visible in the generated output."
- Input: "agar loan amount blank chhod de to alert aana chahiye"
  Output: "Verify that an alert message is displayed when the Loan Amount field is left blank."

Rules:
1. Translate and polish to concise, corporate-ready English.
2. Do NOT add conversational commentary, quotation marks, or explanations. Return ONLY the polished English text.

Input Text:
"""
${text}
"""`;
        }

        const polished = await callGemini({
          contents: [{ text: prompt }],
          temperature: 0.1,
        });

        if (polished) {
          return res.json({ success: true, polishedText: polished });
        }
      } catch (gemErr) {
        console.warn('Gemini polish failed, using dictionary polisher fallback:', gemErr);
      }
    }

    // Comprehensive offline dictionary fallback for Hindi/Hinglish QA terms
    let clean = text.trim();
    const hindiMap: Record<string, string> = {
      'agar': 'if',
      'jab': 'when',
      'tab': 'then',
      'mat hone dena': 'must not occur',
      'nahi hona chahiye': 'should not occur',
      'hona chahiye': 'must occur',
      'galat': 'invalid',
      'sahi': 'valid',
      'dikhe': 'displayed',
      'dikhna chahiye': 'should be displayed',
      'karo': 'perform',
      'bhi': 'also',
      'chhod de': 'left blank',
      'blank': 'empty',
      'daale': 'entered',
      'daalo': 'enter',
      'click karo': 'click',
      'button pe click': 'click the button',
      'check karo': 'verify that',
      'dekhna hai': 'verify that',
      'error aana chahiye': 'an error message should be displayed',
      'popup aana chahiye': 'a popup dialog should appear',
      'alert aana chahiye': 'an alert notification should appear',
      'save ho jaye': 'record should be saved successfully',
      'delete ho jaye': 'item should be deleted successfully',
      'pehle': 'before',
      'baad me': 'after',
      'zyada': 'greater than',
      'kam': 'less than',
      'barabar': 'equal to',
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

// POST: /ai/convert-language-command and /api/ai/convert-language-command
// Takes ANY language command and converts it to simple English + structured test case
apiRouter.post(['/ai/convert-language-command', '/api/ai/convert-language-command'], async (req: Request, res: Response) => {
  try {
    const { command = '', moduleName = 'Term Loan', ticketNo = '1024' } = req.body;
    if (!command || !command.trim()) {
      return res.status(400).json({ success: false, message: 'Command cannot be empty' });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are an elite Principal QA Architect and Technical Writer.
A QA engineer has provided a test requirement, condition, or observation in ANY language (Hindi, Hinglish, casual notes, broken English, or shorthand).

Transform this input into a pristine, corporate-grade QA test case matching top GPT standards:
1. "englishText": Direct, clear, polished professional English translation of what was stated.
2. "testScenario": High-level validation objective (e.g. "Validate the Undo functionality for the Split In action from the transaction history.")
3. "testCases": Clear, formal step-by-step verification statement (e.g. "Verify that when the Split In action is undone from the transaction history of the Split In deal, the corresponding Split Out action is also automatically undone in the related existing deal, and vice versa.")
4. "expectedResult": Bullet-pointed specific expected behaviors (using '• ' bullets):
   • First expected behavior
   • Second expected behavior
   • Synchronization / persistence verification
5. "actualResult": Professional confirmation statement describing successful execution (e.g. "Undoing the Split In action successfully undid the corresponding Split Out action in the related deal, and vice versa. Both split actions were synchronized correctly after the Undo operation.")
6. "validationScenario": "Positive Workflow" or "Negative Validation"

Command / Note:
"""
${command}
"""

Return JSON in this exact structure:
{
  "englishText": "...",
  "testScenario": "...",
  "testCases": "...",
  "expectedResult": "...",
  "actualResult": "...",
  "validationScenario": "Positive Workflow" | "Negative Validation"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const rawText = response.text || '';
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        if (parsed) {
          return res.json({
            success: true,
            englishText: parsed.englishText || command,
            structuredTestCase: {
              testScenario: parsed.testScenario || parsed.englishText,
              testCases: parsed.testCases || `Verify that ${parsed.englishText || command}`,
              expectedResult: parsed.expectedResult || '• System performs the operation successfully.\n• Data remains synchronized.',
              actualResult: parsed.actualResult || 'Verified successfully in accordance with expected behavior.',
              validationScenario: parsed.validationScenario || 'Positive Workflow',
            },
          });
        }
      } catch (gemErr) {
        console.warn('Gemini command converter failed, using fallback:', gemErr);
      }
    }

    // Comprehensive offline fallback matching GPT screenshot style
    const isNegative = /error|galat|invalid|fail|alert|nahi|not|warn|block|reject/i.test(command);
    const cleanCmd = command.replace(/^(agar|jab|check|dekhna)\s+/i, '').trim();
    const polishedEnglish = `Validate the functionality where ${cleanCmd}`;

    return res.json({
      success: true,
      englishText: command,
      structuredTestCase: {
        testScenario: polishedEnglish,
        testCases: `Verify that when ${cleanCmd}, the system processes the request accurately in ${moduleName} for Ticket #${ticketNo}.`,
        expectedResult: isNegative
          ? `• System displays appropriate validation error message.\n• Prevents incorrect persistence.\n• User is alerted to correct the inputs.`
          : `• Operation executes without errors.\n• Corresponding records and balances remain fully synchronized.\n• Status updates to completed state.`,
        actualResult: isNegative
          ? 'System properly displayed validation alert and prevented invalid operation as expected.'
          : 'Operation completed successfully and all related actions and balances were synchronized correctly as expected.',
        validationScenario: isNegative ? 'Negative Validation' : 'Positive Workflow',
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process command',
      errorDetail: err?.message || String(err),
    });
  }
});

// POST: /ai/chat and /api/ai/chat
// Multi-turn conversational chatbot using Gemini 3.5 Flash
apiRouter.post(['/ai/chat', '/api/ai/chat'], async (req: Request, res: Response) => {
  try {
    const { messages = [], ticketContext = {} } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are Beacon AI QA Chatbot, an elite ChatGPT-caliber Senior QA Architect and Test Engineering Lead for banking and treasury enterprise applications.

You assist QA testers, Developers, and Product Leads in generating, refining, reviewing, and analyzing test cases.

Context:
Ticket Number: #${ticketContext.ticketNo || '1024'}
Module: ${ticketContext.moduleName || 'Term Loan / Treasury Master'}
Feature: ${ticketContext.featureName || 'Financial Workflow'}
Description: ${ticketContext.description || ''}

User Communication Style:
- The user often writes in casual Hindi, Hinglish, English, or conversational shorthand with feature descriptions, background stories, and numbered scenarios.
- Example user prompt:
  "currently me ek testing kr rahi hu, accounting me jo Gl code ka column hai pahle wo deal wie accounting master se fetch hota tha , client ko har deal ka indivisual code create krna padta tha .. but ab Global accounting code master me humne wo fields add ki hai ... 1) Gl code me jo new fiels add hui h wo sab editable hona chahiye ... 2) old branch pe jo deal already accounting saved hogai h ... 3) gsec ... 4) same for Bond ... 10) after UNdo ... abhi k liye sare actual result pass hi conider kr"
- When the user asks you to generate test cases or provides scenarios, acknowledge warmly and directly in friendly conversational tone:
  "Bilkul. Main in points ko proper QA test case format mein convert kar raha hoon, aur abhi ke liye Actual Result = Expected Result and Status = Working as expected consider kar raha hoon." (or English/Hinglish matching user's tone).
- Provide a clean, crystal-clear Markdown Table with exact columns:
  | # | Test Scenario | Test Case | Expected Result | Actual Result | Status |
- Rules for generating test cases:
  1. Translate every concept into clear, professional, easily understandable English.
  2. Map each numbered scenario directly to a row (1, 2, 3, etc.).
  3. Expand shorthand like "same for Bond", "same for FD", "same for CP", "same for TREPS investment" into complete, separate, explicit domain test cases.
  4. If user says "actual result pass hi consider kr" or "working as expected", write a clear positive confirmation in Actual Result and set Status to "Working as expected ✅".
  5. Include a JSON code block with language identifier 'json:qa-cases' at the end of the message:
\`\`\`json:qa-cases
[
  {
    "testCaseId": "TC01",
    "testScenario": "Validate editability of newly added GL Code fields",
    "testCases": "Verify that all newly added GL Code fields in the Global Accounting Code Master are editable.",
    "expectedResult": "All newly added GL Code fields should be editable and the user should be able to update/save the required values.",
    "actualResult": "All newly added GL Code fields are editable and values can be updated/saved successfully.",
    "status": "pass",
    "validationScenario": "Positive Workflow"
  }
]
\`\`\`
- In multi-turn conversations, remember past context, allow the user to refine cases, add negative test cases, or ask any QA architecture questions.`;

    if (ai) {
      try {
        const contents = messages.map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content || m.text || '' }],
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        const replyText = response.text || '';

        // Extract any json:qa-cases block
        let extractedCases: any[] = [];
        const jsonMatch = replyText.match(/```json:qa-cases\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            extractedCases = JSON.parse(jsonMatch[1]);
          } catch (e) {
            console.warn('Could not parse embedded JSON cases:', e);
          }
        }

        return res.json({
          success: true,
          reply: replyText,
          model: 'gemini-3.5-flash',
          structuredCases: extractedCases,
        });
      } catch (gemErr) {
        console.warn('Gemini chat failed, using fallback generator:', gemErr);
      }
    }

    // Fallback if API key is not configured or network error
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const fallbackCases = generateRichFallbackTestCases({
      scenario: lastUserMessage,
      description: ticketContext.description || '',
      moduleName: ticketContext.moduleName || 'Term Loan',
      ticketNo: ticketContext.ticketNo || '1024',
      count: 12,
    });

    let markdownTable = `Bilkul. Main in points ko proper QA test case format mein convert kar raha hoon, aur abhi ke liye Actual Result = Expected Result and Status = Working as expected consider kar raha hoon.\n\n`;
    markdownTable += `### ${ticketContext.moduleName || 'Accounting'} – Test Cases\n\n`;
    markdownTable += `| # | Test Scenario | Test Case | Expected Result | Actual Result | Status |\n`;
    markdownTable += `|---|---|---|---|---|---|\n`;

    fallbackCases.forEach((tc, idx) => {
      const num = idx + 1;
      const cleanExpected = tc.expectedResult.replace(/\n/g, ' ');
      const cleanActual = tc.actualResult.replace(/\n/g, ' ');
      markdownTable += `| ${num} | ${tc.testScenario} | ${tc.testCases} | ${cleanExpected} | ${cleanActual} | Working as expected ✅ |\n`;
    });

    markdownTable += `\n\`\`\`json:qa-cases\n${JSON.stringify(fallbackCases, null, 2)}\n\`\`\``;

    return res.json({
      success: true,
      reply: markdownTable,
      model: 'beacon-offline-engine',
      structuredCases: fallbackCases,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Server error in AI Chat',
      errorDetail: err?.message || String(err),
    });
  }
});

