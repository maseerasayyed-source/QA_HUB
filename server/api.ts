import express, { Request, Response, NextFunction } from 'express';
import { query } from './db';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// In-memory fallback data cache if PostgreSQL is offline during development
const mockMemoryStore = {
  users: [
    { name: 'Maseera Sayyed', role: 'Super Admin', email: 'maseera@company.com' },
    { name: 'QA User', role: 'QA', email: 'qa@company.com' },
    { name: 'BA User', role: 'BA', email: 'ba@company.com' },
    { name: 'Developer User', role: 'Developer', email: 'dev@company.com' },
    { name: 'Product User', role: 'Product Team', email: 'product@company.com' }
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
  const { userName, role } = req.body;
  if (!userName || !role) {
    return res.status(400).json({ error: 'userName and role required' });
  }

  try {
    await query('INSERT INTO users (name, role) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET role = EXCLUDED.role', [userName, role]);
  } catch (err) {
    const existing = mockMemoryStore.users.find(u => u.name === userName);
    if (existing) {
      existing.role = role;
    } else {
      mockMemoryStore.users.push({ name: userName, role, email: '' });
    }
  }

  await logActivity(req.userContext?.userName || userName, req.userContext?.userRole || role, `User logged in / role assigned (${role})`, 'Auth');
  return res.json({ status: 'ok', name: userName, role });
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
