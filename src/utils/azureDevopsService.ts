/**
 * Azure DevOps REST API Integration Service
 * Allows direct attachment of QA Test Cases, Execution Matrices, and Observations to ADO Work Items (Tickets).
 */

export interface AzureDevopsConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
}

export interface AttachFileResult {
  success: boolean;
  message: string;
  workItemUrl?: string;
  attachmentUrl?: string;
  errorDetail?: string;
}

export interface FetchWorkItemResult {
  success: boolean;
  message: string;
  ticketNumber?: string;
  id?: string;
  title?: string;
  description?: string;
  solution?: string;
  areaPath?: string;
  iterationPath?: string;
  assignee?: string;
  assignedTo?: string;
  qaAssignee?: string;
  developer?: string;
  ba?: string;
  assignedBa?: string;
  clientName?: string;
  moduleName?: string;
  suggestedModuleId?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  deliveryPriority?: string;
  customPriority?: string;
  state?: string;
  workType?: string;
  testingScenarios?: string;
  acceptanceCriteria?: string;
  scopingEffort?: any;
  designEffort?: any;
  devEffortPlanned?: any;
  testingEffortPlanned?: any;
  projectMilestone?: any;
  requiresPat?: boolean;
  rawFields?: Record<string, any>;
  errorDetail?: string;
  workItem?: {
    id?: string;
    title?: string;
    description?: string;
    acceptanceCriteria?: string;
    priority?: string;
    assignedTo?: string;
    state?: string;
  };
}

const STORAGE_KEY_CONFIG = 'beacon_azure_devops_config';

/**
 * Loads saved Azure DevOps configuration from browser local storage
 */
export function loadSavedAdoConfig(): Partial<AzureDevopsConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load saved Azure DevOps config', e);
  }
  return {
    organization: 'quantumphinance',
    project: 'Beacon',
    personalAccessToken: '',
  };
}

/**
 * Saves Azure DevOps configuration to browser local storage and workspace server
 */
export function saveAdoConfig(config: AzureDevopsConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    // Also save to server workspace configuration so other team sessions benefit
    fetch('/api/azure/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pat: config.personalAccessToken,
        organization: config.organization,
        project: config.project,
      }),
    }).catch((err) => console.warn('Workspace ADO save to server warning', err));
  } catch (e) {
    console.error('Failed to save Azure DevOps config', e);
  }
}

/**
 * Extracts a numeric Work Item ID from ticket strings like "Ticket #21653", "21653", "BEACON-21653"
 */
export function extractWorkItemId(ticketInput: string): string {
  const match = ticketInput.match(/\d{3,8}/);
  return match ? match[0] : ticketInput.trim();
}

/**
 * Fetches Work Item details from Azure DevOps WIT REST API
 * Uses backend proxy (/api/azure/workitem) to bypass browser CORS restrictions and handle authentication.
 */
export async function fetchWorkItemFromAzure(params: {
  organization?: string;
  project?: string;
  workItemId: string;
  pat?: string;
} | string): Promise<FetchWorkItemResult> {
  const paramObj = typeof params === 'string' ? { workItemId: params } : params;
  const saved = loadSavedAdoConfig();
  const cleanOrg = (paramObj.organization || saved.organization || 'quantumphinance').trim();
  const cleanProject = (paramObj.project || saved.project || 'Beacon Web').trim();
  const pat = (paramObj.pat || saved.personalAccessToken || '').trim();
  const cleanId = extractWorkItemId(paramObj.workItemId);

  if (!cleanOrg || !cleanProject || !cleanId) {
    return {
      success: false,
      message: 'Organization, Project, and numeric Work Item ID are required.',
    };
  }

  // 1. Primary Strategy: Fetch via Server Proxy (/api/azure/workitem)
  // Server-side Node fetch bypasses browser CORS and can access Azure DevOps directly
  try {
    const proxyResponse = await fetch('/api/azure/workitem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workItemId: cleanId,
        organization: cleanOrg,
        project: cleanProject,
        pat: pat,
      }),
    });

    const contentType = proxyResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data: any = await proxyResponse.json();
      if (data) {
        data.id = data.id || data.ticketNumber || cleanId;
        data.assignedTo = data.assignedTo || data.assignee;
        data.acceptanceCriteria = data.acceptanceCriteria || data.testingScenarios;
        data.workItem = data.workItem || {
          id: data.id,
          title: data.title,
          description: data.description,
          acceptanceCriteria: data.acceptanceCriteria,
          priority: data.priority,
          assignedTo: data.assignedTo,
          state: data.state,
        };
      }
      return data as FetchWorkItemResult;
    }
  } catch (proxyErr) {
    console.warn('Server proxy /api/azure/workitem did not respond, attempting direct fetch', proxyErr);
  }

  // 2. Direct Browser Fallback (Safely checks Content-Type so "<!DOCTYPE" HTML is never passed to json())
  try {
    const isInvalidProject = !cleanProject || cleanProject === 'QA HUB';
    const url = isInvalidProject
      ? `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/_apis/wit/workitems/${cleanId}?$expand=all&api-version=7.0`
      : `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
          cleanProject
        )}/_apis/wit/workitems/${cleanId}?$expand=all&api-version=7.0`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (pat) {
      headers['Authorization'] = `Basic ${btoa(':' + pat)}`;
    }

    const response = await fetch(url, { method: 'GET', headers });
    const cType = response.headers.get('content-type') || '';

    // Handle Microsoft login redirection / non-JSON responses
    if (
      response.status === 203 ||
      !cType.includes('application/json') ||
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        success: false,
        requiresPat: true,
        ticketNumber: cleanId,
        message: !pat
          ? `Azure DevOps organization '${cleanOrg}' requires authentication. Please enter your Personal Access Token (PAT) below.`
          : `Azure DevOps rejected access (${response.status}). Please verify that your PAT has 'Work Items (Read)' permission for ${cleanOrg}/${cleanProject}.`,
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        ticketNumber: cleanId,
        message: `Azure DevOps API returned ${response.status} ${response.statusText}. Please verify PAT or Ticket #${cleanId}.`,
        errorDetail: errText.slice(0, 300),
      };
    }

    const data = await response.json();
    const fields = data?.fields || {};

    const extractPerson = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') {
        const cleaned = val.replace(/<[^>]+>/g, '').trim();
        const match = cleaned.match(/^([^<]+)/);
        return (match ? match[1] : cleaned).trim();
      }
      if (typeof val === 'object') {
        if (val.displayName) return String(val.displayName).trim();
        if (val.name) return String(val.name).trim();
        if (val.uniqueName) return String(val.uniqueName).replace(/<[^>]+>/g, '').trim();
      }
      return String(val).trim();
    };

    const findFld = (patterns: (string | RegExp)[]): any => {
      const keys = Object.keys(fields);
      for (const pat of patterns) {
        if (typeof pat === 'string') {
          const lower = pat.toLowerCase();
          const matchKey = keys.find((k) => k.toLowerCase() === lower);
          if (matchKey && fields[matchKey] !== undefined && fields[matchKey] !== null && fields[matchKey] !== '') {
            return fields[matchKey];
          }
        } else {
          const matchKey = keys.find((k) => pat.test(k));
          if (matchKey && fields[matchKey] !== undefined && fields[matchKey] !== null && fields[matchKey] !== '') {
            return fields[matchKey];
          }
        }
      }
      return undefined;
    };

    const title = fields['System.Title'] || `Ticket #${cleanId}`;
    const rawDesc = fields['System.Description'] || fields['System.History'] || '';
    const description = rawDesc.replace(/<[^>]*>?/gm, '').trim();
    const solutionRaw = findFld(['Custom.Solution', 'Microsoft.VSTS.Common.Solution', /solution/i]) || '';
    const solution = String(solutionRaw).replace(/<[^>]*>?/gm, '').trim();

    const areaPath = fields['System.AreaPath'] || fields['System.NodeName'] || '';
    const iterationPath = fields['System.IterationPath'] || '';

    // QA Assignee
    const rawQaField = findFld([
      'Custom.AssignedQA',
      'Custom.QA',
      'Custom.QAAssignee',
      'Custom.AssignedTester',
      'Custom.Tester',
      /(assigned.*qa|qa.*assignee|assigned.*tester|\.qa$)/i,
    ]);
    const assignedQaName = extractPerson(rawQaField);

    // BA
    const rawBaField = findFld([
      'Custom.AssignedBA',
      'Custom.BA',
      'Custom.BusinessAnalyst',
      /(assigned.*ba|business.*analyst|\.ba$)/i,
    ]);
    const assignedBaName = extractPerson(rawBaField);

    // Developer
    const rawDevField = findFld([
      'Custom.AssignedDeveloper',
      'Custom.Developer',
      'Custom.AssignedDev',
      'Custom.Dev',
      /(assigned.*developer|assigned.*dev|\.developer$|\.dev$)/i,
    ]);
    let assignedDevName = extractPerson(rawDevField);

    const systemAssignedTo = extractPerson(fields['System.AssignedTo']);
    const systemCreatedBy = extractPerson(fields['System.CreatedBy']);

    if (!assignedDevName) {
      if (systemAssignedTo && systemAssignedTo !== assignedQaName && systemAssignedTo !== assignedBaName) {
        assignedDevName = systemAssignedTo;
      }
    }

    const finalQa = assignedQaName || (systemAssignedTo !== assignedDevName && systemAssignedTo !== assignedBaName ? systemAssignedTo : 'Maseera Sayyed');
    let finalDev = assignedDevName;
    if (!finalDev) {
      if (systemAssignedTo && systemAssignedTo !== finalQa && systemAssignedTo !== assignedBaName) {
        finalDev = systemAssignedTo;
      } else if (systemCreatedBy && systemCreatedBy !== finalQa && systemCreatedBy !== assignedBaName) {
        finalDev = systemCreatedBy;
      }
    }

    // Priority
    const rawDeliveryPriority = findFld(['Custom.DeliveryPriority', /delivery.*priority/i]);
    const rawCustomPriority = findFld(['Custom.CustomPriority', /custom.*priority/i]);
    const rawPriority = fields['Microsoft.VSTS.Common.Priority'];

    const delivStr = String(rawDeliveryPriority || '').toLowerCase().trim();
    const custStr = String(rawCustomPriority || '').toLowerCase().trim();
    const vstsNum = Number(rawPriority);

    let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';
    if (delivStr === 'immediate' || delivStr.includes('critical') || custStr === 'p1' || vstsNum === 1) {
      priority = 'Critical';
    } else if (custStr === 'p2' || delivStr === 'high' || vstsNum === 2) {
      priority = 'High';
    } else if (custStr === 'p3' || delivStr === 'medium' || delivStr === 'normal' || vstsNum === 3) {
      priority = 'Medium';
    } else if (custStr === 'p4' || delivStr === 'low' || vstsNum === 4) {
      priority = 'Low';
    }

    // Client Name
    let clientName = '';
    const rawClient = findFld(['Custom.ClientName', 'Custom.Client', /client/i]);
    if (rawClient) {
      clientName = String(rawClient).trim();
    }
    if (!clientName && areaPath) {
      const parts = areaPath.split(/[\\/]/).map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        clientName = parts[parts.length - 1];
      } else if (parts.length === 2 && parts[0] === 'InsightCorp') {
        clientName = parts[1];
      }
    }
    if (!clientName) {
      const caglMatch = (description + ' ' + title).match(/\b(CAGL|CreditAccess|Treasury Master|Tata Capital|Bajaj Finance)\b/i);
      if (caglMatch) {
        clientName = caglMatch[1].toUpperCase();
      }
    }

    // Module matching
    const combinedSearch = `${title} ${description} ${areaPath}`.toLowerCase();
    let suggestedModuleId = 'mod-1';
    let suggestedModuleName = 'Term Loan';

    if (
      combinedSearch.includes('mutual fund') ||
      combinedSearch.includes('mutual funds') ||
      combinedSearch.includes('nav') ||
      combinedSearch.includes('unit split') ||
      combinedSearch.includes('uti liquid') ||
      /\bmf\b/.test(combinedSearch)
    ) {
      suggestedModuleId = 'mod-12';
      suggestedModuleName = 'Mutual Funds (MF)';
    } else if (combinedSearch.includes('term loan') || combinedSearch.includes('amortization') || /\btl\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-1';
      suggestedModuleName = 'Term Loan';
    } else if (combinedSearch.includes('fixed deposit') || combinedSearch.includes('term deposit') || /\bfd\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-11';
      suggestedModuleName = 'Fixed Deposit (FD)';
    } else if (combinedSearch.includes('cash credit') || /\bcc\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-5';
      suggestedModuleName = 'Cash Credit (CC)';
    } else if (combinedSearch.includes('overdraft') || /\bod\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-6';
      suggestedModuleName = 'Overdraft (OD)';
    } else if (combinedSearch.includes('short term loan') || /\bstl\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-2';
      suggestedModuleName = 'Short Term Loan (STL)';
    } else if (combinedSearch.includes('working capital') || /\bwcdl\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-3';
      suggestedModuleName = 'Working Capital Demand Loan';
    } else if (combinedSearch.includes('letter of credit') || /\bloc\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-4';
      suggestedModuleName = 'Letter of Credit (LOC)';
    } else if (combinedSearch.includes('debenture') || combinedSearch.includes('ncd')) {
      suggestedModuleId = 'mod-8';
      suggestedModuleName = 'Non-Convertible Debentures';
    } else if (combinedSearch.includes('gsec') || combinedSearch.includes('government securit')) {
      suggestedModuleId = 'mod-9';
      suggestedModuleName = 'Government Securities (GSec)';
    } else if (combinedSearch.includes('commercial paper') || /\bcp\b/.test(combinedSearch)) {
      suggestedModuleId = 'mod-10';
      suggestedModuleName = 'Commercial Paper (CP)';
    } else if (combinedSearch.includes('investment') || combinedSearch.includes('portfolio')) {
      suggestedModuleId = 'mod-7';
      suggestedModuleName = 'Investments';
    } else if (combinedSearch.includes('treasury') || combinedSearch.includes('alm')) {
      suggestedModuleId = 'mod-13';
      suggestedModuleName = 'Treasury & ALM';
    } else if (combinedSearch.includes('accounting') || combinedSearch.includes('ledger') || combinedSearch.includes('voucher')) {
      suggestedModuleId = 'mod-16';
      suggestedModuleName = 'Accounting & Ledger';
    }

    const state = fields['System.State'] || 'Ready for QA';
    const rawScenarios =
      fields['Microsoft.VSTS.TCM.ReproSteps'] ||
      fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ||
      description;
    const testingScenarios = rawScenarios.replace(/<[^>]*>?/gm, '').trim();

    return {
      success: true,
      message: `Successfully fetched Ticket #${cleanId} from Azure DevOps!`,
      ticketNumber: cleanId,
      id: cleanId,
      title,
      description,
      solution,
      areaPath,
      iterationPath,
      clientName: clientName || 'CAGL',
      moduleName: suggestedModuleName,
      suggestedModuleId,
      assignee: finalQa,
      assignedTo: finalQa,
      qaAssignee: finalQa,
      developer: finalDev || '',
      ba: assignedBaName || '',
      assignedBa: assignedBaName || '',
      priority,
      deliveryPriority: rawDeliveryPriority ? String(rawDeliveryPriority) : undefined,
      customPriority: rawCustomPriority ? String(rawCustomPriority) : undefined,
      state,
      testingScenarios,
      rawFields: fields,
      workItem: {
        id: cleanId,
        title,
        description,
        acceptanceCriteria: testingScenarios,
        priority,
        assignedTo: finalQa,
        state,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      requiresPat: !pat,
      ticketNumber: cleanId,
      message: !pat
        ? `Azure DevOps organization '${cleanOrg}' requires a Personal Access Token (PAT). Enter your PAT below with Work Items (Read) permissions.`
        : `Network or CORS error communicating with Azure DevOps.`,
      errorDetail: err?.message || String(err),
    };
  }
}

/**
 * Direct REST API upload to attach a file to an Azure DevOps Work Item
 * Prefers server proxy (/api/azure/attach) to avoid browser CORS issues.
 */
export async function attachFileToAzureWorkItem(params: {
  organization: string;
  project: string;
  workItemId: string;
  pat: string;
  fileBlob: Blob;
  fileName: string;
  comment?: string;
}): Promise<AttachFileResult> {
  const { organization, project, workItemId, pat, fileBlob, fileName, comment } = params;

  const cleanOrg = organization.trim();
  const cleanProject = project.trim();
  const cleanId = extractWorkItemId(workItemId);

  if (!cleanOrg || !cleanProject || !cleanId) {
    return {
      success: false,
      message: 'Organization, Project, and numeric Work Item ID are required.',
    };
  }

  if (!pat.trim()) {
    return {
      success: false,
      message: 'Personal Access Token (PAT) is required to attach files to Azure DevOps.',
    };
  }

  // Helper to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || res;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 1. Try Server-side Proxy (/api/azure/attach)
  try {
    const fileBase64 = await blobToBase64(fileBlob);
    const proxyRes = await fetch('/api/azure/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workItemId: cleanId,
        organization: cleanOrg,
        project: cleanProject,
        pat: pat.trim(),
        fileName,
        fileBase64,
        comment,
      }),
    });

    const cType = proxyRes.headers.get('content-type') || '';
    if (cType.includes('application/json')) {
      const data: AttachFileResult = await proxyRes.json();
      return data;
    }
  } catch (proxyErr) {
    console.warn('Server proxy /api/azure/attach failed, attempting direct upload', proxyErr);
  }

  // 2. Direct browser upload fallback
  try {
    const uploadUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=7.0`;

    const authHeader = `Basic ${btoa(':' + pat.trim())}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBlob,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      return {
        success: false,
        message: `Attachment upload failed (${uploadResponse.status} ${uploadResponse.statusText})`,
        errorDetail: errText.slice(0, 300),
      };
    }

    const uploadData = await uploadResponse.json();
    const attachmentUrl = uploadData?.url;

    if (!attachmentUrl) {
      return {
        success: false,
        message: 'Azure DevOps did not return an attachment URL.',
      };
    }

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
            comment:
              comment ||
              `QA Test Cases & Execution Matrix exported from Beacon QA Hub at ${new Date().toLocaleString()}`,
          },
        },
      },
    ];

    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(patchBody),
    });

    if (!patchResponse.ok) {
      const errText = await patchResponse.text();
      return {
        success: false,
        message: `Failed to link file to Work Item #${cleanId} (${patchResponse.status} ${patchResponse.statusText})`,
        errorDetail: errText.slice(0, 300),
      };
    }

    const workItemUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_workitems/edit/${cleanId}`;

    return {
      success: true,
      message: `Successfully attached ${fileName} directly to Azure DevOps Ticket #${cleanId}!`,
      workItemUrl,
      attachmentUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Network or CORS error contacting Azure DevOps API.',
      errorDetail: err?.message || String(err),
    };
  }
}
