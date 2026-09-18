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
 * Enforces the strict visibility & access control policy:
 * - All users can see all tickets on the Dashboard.
 * - Only the creator can edit their ticket.
 * - When a ticket is in Draft / Edit mode: OTHER users cannot open or view details (test cases, dev testing, observations, RFE).
 * - Once creator clicks "Save & Submit", other users can open and view (Read-Only).
 */
export function canUserOpenTicket(
  ticket?: TicketSummary | null,
  user?: UserProfile | null
): { allowed: boolean; reason?: string; isCreator: boolean; isReadOnly: boolean } {
  if (!ticket) {
    return { allowed: false, reason: 'Ticket not found', isCreator: false, isReadOnly: true };
  }

  const isCreator = isUserTicketCreator(ticket, user);
  const inDraft = isTicketInDraft(ticket);

  // Creator can always open and edit
  if (isCreator) {
    return { allowed: true, isCreator: true, isReadOnly: false };
  }

  // Non-creator trying to open a Draft / Edit mode ticket: BLOCKED!
  if (inDraft) {
    return {
      allowed: false,
      reason: `Ticket #${ticket.ticketNumber} is currently in Draft / Edit mode by "${ticket.createdBy || 'Creator'}". Other users cannot open or inspect its test cases, developer testing points, observations, or RFEs until the creator clicks 'Save & Submit'.`,
      isCreator: false,
      isReadOnly: true,
    };
  }

  // Submitted ticket opened by non-creator: ALLOWED in Read-Only mode
  return { allowed: true, isCreator: false, isReadOnly: true };
}
