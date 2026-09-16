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
  title?: string;
  description?: string;
  areaPath?: string;
  assignee?: string;
  developer?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  state?: string;
  workType?: string;
  testingScenarios?: string;
  requiresPat?: boolean;
  rawFields?: Record<string, any>;
  errorDetail?: string;
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
}): Promise<FetchWorkItemResult> {
  const saved = loadSavedAdoConfig();
  const cleanOrg = (params.organization || saved.organization || 'quantumphinance').trim();
  const cleanProject = (params.project || saved.project || 'Beacon Web').trim();
  const pat = (params.pat || saved.personalAccessToken || '').trim();
  const cleanId = extractWorkItemId(params.workItemId);

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
      const data: FetchWorkItemResult = await proxyResponse.json();
      return data;
    }
  } catch (proxyErr) {
    console.warn('Server proxy /api/azure/workitem did not respond, attempting direct fetch', proxyErr);
  }

  // 2. Direct Browser Fallback (Safely checks Content-Type so "<!DOCTYPE" HTML is never passed to json())
  try {
    const url = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_apis/wit/workitems/${cleanId}?api-version=7.0&$expand=all`;

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

    const title = fields['System.Title'] || `Ticket #${cleanId}`;
    const rawDesc = fields['System.Description'] || fields['System.History'] || '';
    const description = rawDesc.replace(/<[^>]*>?/gm, '').trim();

    const areaPath = fields['System.AreaPath'] || fields['System.NodeName'] || '';
    const assigneeObj = fields['System.AssignedTo'];
    const assignee = typeof assigneeObj === 'object' ? assigneeObj?.displayName : String(assigneeObj || '');

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

    const createdByObj = fields['System.CreatedBy'];
    const developer =
      fields['Custom.Developer'] ||
      (typeof createdByObj === 'object' ? createdByObj?.displayName : String(createdByObj || ''));
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
      title,
      description,
      areaPath,
      assignee,
      developer,
      priority,
      state,
      testingScenarios,
      rawFields: fields,
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
