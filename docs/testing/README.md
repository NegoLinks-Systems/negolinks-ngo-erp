# Database Test Harness

Every SQL file shipped with this product was executed against a real
PostgreSQL 16 instance before release. These files let you reproduce that
verification on your own machine.

## Files

| File | Purpose |
|---|---|
| `mock_supabase_env.sql` | Creates the `auth` schema, `auth.uid()`, `auth.role()` and the `anon` / `authenticated` / `service_role` roles, so the migrations can run outside Supabase. |
| `rls_isolation_test.sql` | Creates two organizations and proves each tenant sees only its own rows, and that `audit_logs` cannot be updated or deleted. |

## Running the verification

```bash
# 1. Start PostgreSQL 16 and create a scratch database
createdb ngotest

# 2. Install the Supabase stand-ins
psql -d ngotest -f docs/testing/mock_supabase_env.sql

# 3. Install the application schema
psql -v ON_ERROR_STOP=1 -d ngotest -f supabase/sql/01_INSTALL_ALL.sql

# 4. Run it a second time — it must succeed again (idempotency)
psql -v ON_ERROR_STOP=1 -d ngotest -f supabase/sql/01_INSTALL_ALL.sql

# 5. Prove tenant isolation
psql -tA -d ngotest -f docs/testing/rls_isolation_test.sql
```

## Expected results

Installation reports:

```
Tables created ................ 72
Security policies ............. 286
Tables without RLS ............ 0
STATUS: SUCCESS
```

Isolation test reports:

```
A_projects_visible: 2                    <- only Alpha's projects
A_orgs_visible: 1                        <- only Alpha's organization
A_sees_beta_rows: 0                      <- no cross-tenant leakage
B_projects_visible: 1                    <- only Beta's project
B_sees_alpha_rows: 0                     <- no cross-tenant leakage
A_audit_insert: ok                       <- audit entries can be written
A_audit_rows_updated: 0                  <- audit entries cannot be altered
A_audit_rows_after_delete_attempt: 1     <- audit entries cannot be removed
```

Any deviation from these numbers indicates a security regression and should be
investigated before deploying.

The install file also fails loudly on its own: if any table is missing row level
security, or fewer than 60 tables were created, it raises an exception rather
than reporting success.
