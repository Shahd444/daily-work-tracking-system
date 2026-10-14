-- Reset PostgreSQL database (development only).
-- Drops every table and ENUM type used by the app. Afterwards run: npm run migrate && npm run seed

DROP TABLE IF EXISTS "job_orders" CASCADE;
DROP TABLE IF EXISTS "breaks" CASCADE;
DROP TABLE IF EXISTS "leaves" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;
DROP TABLE IF EXISTS "valid_tasks" CASCADE;
DROP TABLE IF EXISTS "rejected_tasks" CASCADE;
DROP TABLE IF EXISTS "operations" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;
DROP TABLE IF EXISTS "departments" CASCADE;
DROP TABLE IF EXISTS "SequelizeMeta" CASCADE;
DROP TABLE IF EXISTS "SequelizeData" CASCADE;

DROP TYPE IF EXISTS "enum_employees_role" CASCADE;
DROP TYPE IF EXISTS "enum_departments_department_name" CASCADE;
DROP TYPE IF EXISTS "enum_tasks_tasktype" CASCADE;
DROP TYPE IF EXISTS "enum_tasks_validationStatus" CASCADE;
DROP TYPE IF EXISTS "enum_breaks_break_type" CASCADE;
DROP TYPE IF EXISTS "enum_leaves_leave_type" CASCADE;
DROP TYPE IF EXISTS "enum_leaves_status" CASCADE;
