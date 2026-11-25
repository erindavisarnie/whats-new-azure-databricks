import { createApp, analytics, server } from '@databricks/appkit';

// Fully-qualified table the app reads. Set WHATS_NEW_TABLE in app.yaml; defaults to the table inside the
// Delta Sharing catalog created in the setup guide.
const DEFAULT_TABLE = 'whats_new_share.whats_new.whats_new_last_month';
const TABLE_NAME = process.env.WHATS_NEW_TABLE?.trim() || DEFAULT_TABLE;

// Guard against misconfiguration: catalog.schema.table, each part plain or backtick-quoted.
const FQN = /^(`[^`]+`|\w+)\.(`[^`]+`|\w+)\.(`[^`]+`|\w+)$/;
if (!FQN.test(TABLE_NAME)) {
  throw new Error(`WHATS_NEW_TABLE must be catalog.schema.table, got "${TABLE_NAME}"`);
}

createApp({
  plugins: [analytics(), server()],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      app.get('/api/config', (_req, res) => {
        res.json({ tableName: TABLE_NAME });
      });
    });
  },
}).catch(console.error);
