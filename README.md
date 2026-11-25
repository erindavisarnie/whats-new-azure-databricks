# What's New in Azure Databricks: Customer Setup Guide

Every month Azure Databricks ships dozens of new features. This kit gives you:

1. **A live dataset**, delivered to your workspace through Delta Sharing, of every feature released in the last
   month. That covers Generally Available, Public Preview, Beta, and shipped enhancements, each with a category,
   a plain-language description, and documentation links. It refreshes daily, with nothing to install or schedule.
2. **A browse app** you run in your own workspace: pick a category, see the features, click one for the
   description and links to the docs.

Setup takes about 20 minutes. Follow the steps **in order**. The names in `code font` must be typed exactly as
shown.

---

## Before you start

| You need | Why | How to check |
|---|---|---|
| A Unity Catalog–enabled Databricks workspace (any cloud or region) | Delta Sharing and Apps use Unity Catalog | **Catalog** appears in the left sidebar |
| Permission to create a catalog from a share: metastore admin, or `CREATE CATALOG` + `USE PROVIDER` on the metastore | Step 2 | Ask your Databricks admin if unsure |
| Databricks Apps enabled, with permission to create apps | Steps 4–7 | **Compute → Apps** tab is visible |
| A SQL warehouse you can use (serverless 2X-Small is plenty) | The app queries through it | **SQL Warehouses** in the left sidebar |
| The **invitation email** we sent you | It contains the provider name for step 2 | |

---

## Step 1: Send us your sharing identifier

1. In the left sidebar, click **Catalog**.
2. At the top of Catalog Explorer, click **Delta Sharing**. (If you don't see it, click the **⚙ gear icon → Delta Sharing**.)
3. Open the **Shared with me** tab.
4. Click **Copy sharing identifier**.
5. Reply to our invitation email with that value. It looks like `aws:us-west-2:1a2b3c4d-…` or `azure:eastus:…`.

> *SQL alternative:* in a SQL editor run `SELECT CURRENT_METASTORE();` and send us the result.

**Wait for our confirmation** that you've been added before continuing. It's usually quick.

---

## Step 2: Create the `whats_new_share` catalog from the share

1. Go to **Catalog → Delta Sharing → Shared with me**.
2. In the **Providers** list, find the **provider name from your invitation email**.
   Tip: if the list is long, use the search/filter box. The provider appears the moment we add you.
3. Click the provider. You'll see a share named **`whats_new`**.
4. Next to `whats_new`, click **Create catalog**.
5. Catalog name: **`whats_new_share`** ← type exactly this (see [Appendix A](#appendix-a-using-a-different-catalog-name) if you must use another name).
6. Click **Create**.

> *SQL alternative:*
> ```sql
> CREATE CATALOG whats_new_share USING SHARE `<provider name from your email>`.whats_new;
> ```

**Check it worked:** open a SQL editor and run:
```sql
SELECT category, count(*) AS features
FROM whats_new_share.whats_new.whats_new_last_month
GROUP BY category
ORDER BY features DESC;
```
You should see roughly a dozen categories. If you get an error, see [Troubleshooting](#troubleshooting).

### Optional: let your users query the data
1. **Catalog** → click **`whats_new_share`** → **Permissions** tab → **Grant**.
2. Choose the users or groups (for example `account users`).
3. Tick **USE CATALOG**, **USE SCHEMA**, and **SELECT** → **Grant**.

---

## Step 3: Add this repository to your workspace

1. In the left sidebar, click **Workspace**.
2. Go to your home folder (**Workspace → Users → *your email***).
3. Click **Create** (top right) → **Git folder**.
4. **Git repository URL:** paste the URL of this repository (the GitHub page you are reading, ending in `.git` or not).
5. **Git provider:** GitHub. Leave the folder name as suggested.
6. Click **Create Git folder**.

You now have a folder containing `app.yaml`, `package.json`, `client/`, `server/`, and `config/`.

> This repository is public, so no Git credentials are needed. If your workspace blocks external Git
> URLs, download this repo as a ZIP from GitHub (**Code → Download ZIP**) and use **Workspace → ⋮ → Import**
> instead. Do not upload a `node_modules` folder.

---

## Step 4: Create the app

1. In the left sidebar, click **Compute**, then the **Apps** tab.
2. Click **Create app** → **Create a custom app**.
3. **App name:** `whats-new` → click **Next: Configure**.
4. Under **App resources**, click **+ Add resource** → **SQL warehouse**:
   - **SQL warehouse:** choose your warehouse
   - **Permission:** **Can use**
   - **Resource key:** **`sql-warehouse`** ← must be exactly this; the app looks for this name
5. Click **Create app**.
6. Wait until the app's compute status shows **Running** (a minute or two). The app is created but has no code yet.

---

## Step 5: Give the app permission to read the shared data

The app runs as its own **service principal**. It needs read access to the catalog **before** the first deploy,
because the build step checks the queries against the table.

1. On the app's page (**Compute → Apps → whats-new**), find **Service principal** in the app details and copy
   its name or ID.
2. Go to **Catalog** → click **`whats_new_share`** → **Permissions** tab → **Grant**.
3. In **Principals**, paste the service principal and select it.
4. Tick **USE CATALOG**, **USE SCHEMA**, and **SELECT**.
5. Click **Grant**.

> *SQL alternative:*
> ```sql
> GRANT USE CATALOG, USE SCHEMA, SELECT ON CATALOG whats_new_share TO `<app service principal ID>`;
> ```

---

## Step 6: Deploy the app

1. Return to **Compute → Apps → whats-new**.
2. Click **Deploy**.
3. For the source code path, browse to the Git folder from Step 3 (for example
   `/Workspace/Users/you@company.com/whats-new-azure-databricks`) → **Select** → **Deploy**.
4. The first deploy takes about 3–5 minutes (it installs packages and builds the app). Watch progress in the
   **Deployments** section. If it fails, open **Logs** and see [Troubleshooting](#troubleshooting).
5. When the status shows **Running**, click the app's **URL**.

You should see **"What's new this month"**, a **Category** dropdown, release-stage filters, and a list of features.
Click any feature to see its description and documentation links.

---

## Step 7: Let your colleagues use the app

1. On the app's page, click **Permissions** (top right).
2. Add users or groups → permission **Can Use** → **Add** → **Save**.
3. Share the app URL with them.

App users don't need their own access to the shared catalog. The app reads it as its service principal.

---

## Keeping it up to date

- **Data:** automatic. The share refreshes daily, and the app always shows the latest snapshot (the refresh
  date is shown under the page title).
- **App updates:** when we announce a new version, open your Git folder → click the **branch name** → **Pull**,
  then on the app page click **Deploy** again (same source path).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| I can't find the provider in **Shared with me** | You lack permission to see providers, or we haven't added you yet | Run `SHOW PROVIDERS;`. If you get a permission error, ask your metastore admin for `USE PROVIDER` (or to do Step 2 for you). If it's not listed, contact us. |
| Deploy fails, and the logs show `INSUFFICIENT_PERMISSIONS … does not have USE SCHEMA` | Step 5 not done (or granted to the wrong principal) | Do Step 5 with the app's service principal, then click **Deploy** again |
| Deploy fails, and the logs show `TABLE_OR_VIEW_NOT_FOUND` | Catalog isn't named `whats_new_share` | Rename the catalog, or follow [Appendix A](#appendix-a-using-a-different-catalog-name) |
| App opens but shows **"Could not load features"** | Warehouse resource missing or wrong key | App page → **Edit** → check the SQL warehouse resource key is `sql-warehouse` with **Can use** → **Save** → **Deploy** |
| App shows a "warehouse starting" notice | Warehouse was stopped; it auto-starts | Wait ~1 minute (serverless) and the page fills in |
| App URL shows **"App not available"** | App is stopped or still deploying | App page → check status; click **Start** if stopped |

---

## Appendix A: Using a different catalog name

If your catalog can't be named `whats_new_share`, replace `whats_new_share` with your catalog name in these
four places in your Git folder, then deploy:

1. `app.yaml`: the `value:` under `WHATS_NEW_TABLE`
2. `config/queries/categories.sql`: line 2
3. `config/queries/features.sql`: line 3
4. `config/queries/snapshot_info.sql`: line 2

(The SQL lines are sample values the build uses to check the queries; `app.yaml` is what the running app uses.)
Edit the files in the workspace file editor, or edit them in a fork of this repo.

## Appendix B: Deploy with the Databricks CLI (instead of Steps 4 and 6)

For teams that use the [Databricks CLI](https://docs.databricks.com/dev-tools/cli/) (a recent version). Do Steps 1–2 first, then:

```bash
git clone <this repository URL> && cd <repository folder>
databricks bundle deploy --profile <your-profile> --var sql_warehouse_id=<your-warehouse-id>
```
The first deploy creates the app and its service principal but fails at the build step. Do **Step 5**, then run
the same command again. Finish with **Step 7**. Add `--var table_name=<catalog>.whats_new.whats_new_last_month` if
you used a different catalog name (and update the SQL files per Appendix A).

## Appendix C: What's in the dataset

Shared catalog → schema `whats_new`:

**`whats_new_last_month`** is the current month's digest and the table the app reads.

| Column | Description |
|---|---|
| `feature_name` | Short feature name |
| `category` | Product area, e.g. *Genie & AI/BI*, *Lakeflow & Data Engineering*, *Governance & Unity Catalog* |
| `release_stage` | `GA`, `Public Preview`, `Beta`, or `Enhancement` (shipped improvement with no stage label) |
| `release_date` | Date published in the Azure Databricks release notes |
| `summary` | Plain-language description (AI-assisted; see the linked docs for authoritative detail) |
| `why_it_matters` | One-sentence customer benefit |
| `release_note` | Original release-note text |
| `primary_doc_url` | Main documentation link |
| `doc_links` | All documentation links in the entry |
| `release_note_url` | Link to the entry in the official release notes |
| `window_start`, `refreshed_at` | Reporting window start and snapshot time |

**`feature_releases`** is the full history (all stages, including retirements and experimental features), with
change data feed enabled.

Source: the public [Azure Databricks release notes](https://learn.microsoft.com/azure/databricks/release-notes/product/).
Descriptions are generated with AI from the official release notes. Always check the linked documentation.
