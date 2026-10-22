import assert from "node:assert/strict";

// Test-only replacements for session lookup and the service-role database client.
// Route guards, request parsing, response mapping, encryption, and audit writing
// still execute the application code. No credentials or network are used.
export const context = {};

export function resetContext(user, rows = []) {
  Object.assign(context, {
    user,
    rows: structuredClone(rows),
    clientCalls: 0,
    queries: [],
    audits: [],
  });
}

export async function getSessionUser() {
  return context.user;
}

export function createAdminSupabase() {
  context.clientCalls += 1;
  return {
    from(table) {
      assert.ok(["appointments", "audit_logs"].includes(table));
      const query = { table, filters: [], update: null };
      context.queries.push(query);
      const builder = {
        select() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        eq(column, value) {
          query.filters.push([column, value]);
          return builder;
        },
        update(values) {
          query.update = values;
          return builder;
        },
        async insert(values) {
          assert.equal(table, "audit_logs");
          context.audits.push(values);
          return { error: null };
        },
        maybeSingle() {
          const { data } = execute();
          return Promise.resolve({ data: data[0] ?? null, error: null });
        },
        then(resolve, reject) {
          return Promise.resolve(execute()).then(resolve, reject);
        },
      };
      function execute() {
        const data = context.rows.filter((row) =>
          query.filters.every(([column, value]) => row[column] === value),
        );
        if (query.update) {
          for (const row of data) Object.assign(row, query.update);
        }
        return { data: structuredClone(data), error: null };
      }
      return builder;
    },
  };
}
