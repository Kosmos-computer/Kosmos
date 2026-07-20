import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type OrderStatus =
  | "pending"
  | "provisioning"
  | "ready"
  | "failed"
  | "suspended"
  | "deleted";

export interface OrderRow {
  id: string;
  tenant_name: string;
  app_name: string;
  customer_email: string | null;
  stripe_session_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: OrderStatus;
  tenant_url: string | null;
  entry_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export class Store {
  private db: Database.Database;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    // Prefer legacy control.db when present (existing Fly volume data).
    const modern = path.join(dataDir, "control-plane.db");
    const legacy = path.join(dataDir, "control.db");
    const dbPath =
      fs.existsSync(legacy) &&
      (!fs.existsSync(modern) || fs.statSync(modern).size === 0)
        ? legacy
        : modern;
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tenant_name TEXT NOT NULL UNIQUE,
        app_name TEXT NOT NULL UNIQUE,
        customer_email TEXT,
        stripe_session_id TEXT NOT NULL UNIQUE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        status TEXT NOT NULL,
        tenant_url TEXT,
        entry_url TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(stripe_session_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);
    const columns = this.db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "entry_url")) {
      this.db.exec("ALTER TABLE orders ADD COLUMN entry_url TEXT");
    }
  }

  getBySession(sessionId: string): OrderRow | undefined {
    return this.db.prepare("SELECT * FROM orders WHERE stripe_session_id = ?").get(sessionId) as
      | OrderRow
      | undefined;
  }

  getByTenantName(name: string): OrderRow | undefined {
    return this.db.prepare("SELECT * FROM orders WHERE tenant_name = ?").get(name) as
      | OrderRow
      | undefined;
  }

  getByAppName(appName: string): OrderRow | undefined {
    return this.db.prepare("SELECT * FROM orders WHERE app_name = ?").get(appName) as
      | OrderRow
      | undefined;
  }

  getBySubscriptionId(subscriptionId: string): OrderRow | undefined {
    return this.db
      .prepare("SELECT * FROM orders WHERE stripe_subscription_id = ?")
      .get(subscriptionId) as OrderRow | undefined;
  }

  getByEmail(email: string): OrderRow | undefined {
    const normalized = email.trim().toLowerCase();
    return this.db
      .prepare(
        `SELECT * FROM orders
         WHERE lower(customer_email) = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .get(normalized) as OrderRow | undefined;
  }

  createOrder(input: {
    id: string;
    tenantName: string;
    appName: string;
    customerEmail: string | null;
    stripeSessionId: string;
  }): OrderRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO orders (
          id, tenant_name, app_name, customer_email, stripe_session_id,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .run(input.id, input.tenantName, input.appName, input.customerEmail, input.stripeSessionId, now, now);
    return this.getBySession(input.stripeSessionId)!;
  }

  markProvisioning(sessionId: string, stripeCustomerId: string | null, stripeSubscriptionId: string | null): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE orders SET
          status = 'provisioning',
          stripe_customer_id = COALESCE(?, stripe_customer_id),
          stripe_subscription_id = COALESCE(?, stripe_subscription_id),
          updated_at = ?
        WHERE stripe_session_id = ?`,
      )
      .run(stripeCustomerId, stripeSubscriptionId, now, sessionId);
  }

  markReady(sessionId: string, tenantUrl: string, entryUrl: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE orders SET status = 'ready', tenant_url = ?, entry_url = ?, error = NULL, updated_at = ? WHERE stripe_session_id = ?`,
      )
      .run(tenantUrl, entryUrl, now, sessionId);
  }

  markFailed(sessionId: string, error: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE orders SET status = 'failed', error = ?, updated_at = ? WHERE stripe_session_id = ?`)
      .run(error, now, sessionId);
  }

  markSuspended(sessionId: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE orders SET status = 'suspended', updated_at = ? WHERE stripe_session_id = ?`)
      .run(now, sessionId);
  }

  markDeleted(sessionId: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE orders SET status = 'deleted', updated_at = ? WHERE stripe_session_id = ?`)
      .run(now, sessionId);
  }

  /** Remove order so the tenant/app name can be reused after destroy. */
  removeOrder(sessionId: string): void {
    this.db.prepare(`DELETE FROM orders WHERE stripe_session_id = ?`).run(sessionId);
  }
}
