# Using SQLite for CrystalPaint

This guide explains how to set up the new SQLite database used by the `taintedpaint` web app. The database replaces the previous `metadata.json` file and stores all board data in `storage/metadata.db`.

## 1. Install dependencies

From the `taintedpaint` directory install packages (a new dependency `better-sqlite3` is required):

```bash
cd taintedpaint
npm install
```

## 2. Initialize the database

Run the provided script to create `storage/metadata.db` with the required tables and default columns:

```bash
npm run init-db
```

The command creates `storage/metadata.db` if it does not exist and inserts the base columns.

## 3. Start the application

After initializing the database you can run the development server:

```bash
npm run dev
```

The API routes will read and write board data from the SQLite database automatically.

## How it works

- The database file lives in `storage/metadata.db`.
- Tables `columns` and `tasks` store column definitions and task metadata.
- The helper script `scripts/init-db.js` sets up the schema and inserts the initial column list.
- The code in `taintedpaint/lib/boardDataStore.ts` uses `better-sqlite3` to read and update data.

No additional SQLite knowledge is required—the provided scripts handle initialization and the application manages all queries.
