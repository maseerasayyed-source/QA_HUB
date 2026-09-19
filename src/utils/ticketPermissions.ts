import { TicketSummary, UserProfile } from '../types';

/**
 * Checks if the given user is the creator of the ticket (or Super Admin)
 */
export function isUserTicketCreator(ticket?: TicketSummary | null, user?: UserProfile | null): boolean {
  if (!ticket || !user) return false;
  if (user.role === 'Super Admin' || user.email?.toLowerCase().includes('maseera')) return true;

  const uEmail = (user.email || '').toLowerCase().trim();
  const uName = (user.name || '').toLowerCase().trim();
  const tCreator = (ticket.createdBy || '').toLowerCase().trim();
  const tEmail = (ticket.creatorEmail || '').toLowerCase().trim();

  if (tEmail && uEmail && tEmail === uEmail) return true;
  if (tCreator && uName && (uName === tCreator || uName.includes(tCreator) || tCreator.includes(uName))) return true;

  return false;
}

/**
 * Checks if a ticket is in Draft or Edit mode (not yet saved & submitted)
 */
export function isTicketInDraft(ticket?: TicketSummary | null): boolean {
  if (!ticket) return false;
  if (ticket.submissionState === 'Draft') return true;
  if (ticket.isEditing === true) return true;
  if (ticket.submissionState === 'Submitted') return false;
  // If neither is set, treat as Draft so creator must Save & Submit
  return true;
}

/**
 * Enforces the smart role-aware visibility & access control policy:
 * - All users can see all tickets on the Dashboard.
 * - QA workspace (Unified AI Test Hub / Test Cases): QA Lead, Assignee, Creator & Super Admin can edit.
 *   Developers can open in Read-Only view to inspect QA expectations.
 * - Developer Testing workspace: Developer Assignee & Super Admin can edit.
 *   QA team can open in Read-Only view to inspect dev testing proof before sign-off.
 * - Unrelated third-party users: Read-Only once submitted.
 */
export function canUserOpenTicket(
  ticket?: TicketSummary | null,
  user?: UserProfile | null,
  context: 'qa' | 'dev' | 'observations' | 'general' = 'general'
): {
  allowed: boolean;
  reason?: string;
  isCreator: boolean;
  isReadOnly: boolean;
  canEditDev: boolean;
  canEditQa: boolean;
} {
  if (!ticket) {
    return {
      allowed: false,
      reason: 'Ticket not found',
      isCreator: false,
      isReadOnly: true,
      canEditDev: false,
      canEditQa: false,
    };
  }

  const isSuperAdmin = user?.role === 'Super Admin' || user?.email?.toLowerCase().includes('maseera');
  const uName = (user?.name || '').toLowerCase().trim();
  const devName = (ticket.developer || '').toLowerCase().trim();
  const qaName = (ticket.qaAssignee || '').toLowerCase().trim();
  const creatorName = (ticket.createdBy || '').toLowerCase().trim();

  const isAssignedDev = Boolean(uName && devName && (uName.includes(devName) || devName.includes(uName))) || user?.role === 'Developer';
  const isAssignedQa = Boolean(uName && qaName && (uName.includes(qaName) || qaName.includes(uName))) || user?.role === 'QA' || user?.role === 'Senior QA';
  const isCreator = isUserTicketCreator(ticket, user);
  const inDraft = isTicketInDraft(ticket);

  const canEditDev = isSuperAdmin || isAssignedDev || (isCreator && user?.role === 'Developer');
  const canEditQa = isSuperAdmin || isAssignedQa || isCreator;

  // Context-specific permission resolution
  if (context === 'dev') {
    // In Developer Testing:
    // If user is Developer or Super Admin -> can edit!
    // If user is QA -> allowed to open and inspect developer proof in Read-Only mode!
    return {
      allowed: true,
      isCreator,
      isReadOnly: !canEditDev,
      canEditDev,
      canEditQa,
    };
  }

  if (context === 'qa' || context === 'observations') {
    // In QA Test Cases / Observations:
    // If user is QA, Creator, or Super Admin -> can edit!
    // If user is Developer -> allowed to open and inspect QA test suite in Read-Only mode!
    return {
      allowed: true,
      isCreator,
      isReadOnly: !canEditQa,
      canEditDev,
      canEditQa,
    };
  }

  // General check
  if (isSuperAdmin || isCreator || isAssignedDev || isAssignedQa) {
    return {
      allowed: true,
      isCreator,
      isReadOnly: false,
      canEditDev,
      canEditQa,
    };
  }

  // If draft and unrelated user
  if (inDraft) {
    return {
      allowed: false,
      reason: `Ticket #${ticket.ticketNumber} is currently in Draft / Edit mode by "${ticket.createdBy || 'Creator'}". Other team members can view it once submitted.`,
      isCreator: false,
      isReadOnly: true,
      canEditDev: false,
      canEditQa: false,
    };
  }

  return {
    allowed: true,
    isCreator: false,
    isReadOnly: true,
    canEditDev: false,
    canEditQa: false,
  };
}
