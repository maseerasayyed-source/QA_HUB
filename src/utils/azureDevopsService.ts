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
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  state?: string;
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
 * Saves Azure DevOps configuration to browser local storage
 */
export function saveAdoConfig(config: AzureDevopsConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save Azure DevOps config', e);
  }
}

/**
 * Extracts a numeric Work Item ID from ticket strings like "Ticket #21653", "21653", "BEACON-21653"
 */
export function extractWorkItemId(ticketInput: string): string {
  const match = ticketInput.match(/\d{4,8}/);
  return match ? match[0] : ticketInput.trim();
}

/**
 * Fetches Work Item details directly from Azure DevOps WIT REST API
 */
export async function fetchWorkItemFromAzure(params: {
  organization?: string;
  project?: string;
  workItemId: string;
  pat?: string;
}): Promise<FetchWorkItemResult> {
  const saved = loadSavedAdoConfig();
  const cleanOrg = (params.organization || saved.organization || 'quantumphinance').trim();
  const cleanProject = (params.project || saved.project || 'Beacon').trim();
  const pat = (params.pat || saved.personalAccessToken || '').trim();
  const cleanId = extractWorkItemId(params.workItemId);

  if (!cleanOrg || !cleanProject || !cleanId) {
    return {
      success: false,
      message: 'Organization, Project, and numeric Work Item ID are required.',
    };
  }

  try {
    const url = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(
      cleanProject
    )}/_apis/wit/workitems/${cleanId}?api-version=7.0&$expand=all`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (pat) {
      headers['Authorization'] = `Basic ${btoa(':' + pat)}`;
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        message: `Azure DevOps API returned ${response.status} ${response.statusText}. Please verify PAT or Ticket #${cleanId}.`,
        errorDetail: errText,
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

    const state = fields['System.State'] || 'Ready for QA';

    return {
      success: true,
      message: `Successfully fetched Ticket #${cleanId} from Azure DevOps!`,
      ticketNumber: cleanId,
      title,
      description,
      areaPath,
      assignee,
      priority,
      state,
      rawFields: fields,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Network or CORS error fetching from Azure DevOps API.',
      errorDetail: err?.message || String(err),
    };
  }
}

/**
 * Direct REST API upload to attach a file to an Azure DevOps Work Item
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
      message: 'Personal Access Token (PAT) is required for direct API upload.',
    };
  }

  try {
    // 1. Upload Attachment Binary to Azure DevOps WIT Attachments API
    const uploadUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(cleanProject)}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=7.0`;
    
    // Azure DevOps uses Basic Auth with empty username and PAT as password
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
        errorDetail: errText,
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

    // 2. Link Attachment to Work Item via JSON Patch
    const patchUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(cleanProject)}/_apis/wit/workitems/${cleanId}?api-version=7.0`;

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
        errorDetail: errText,
      };
    }

    const workItemUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(cleanProject)}/_workitems/edit/${cleanId}`;

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
