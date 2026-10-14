# JODDB – Daily Work Tracking & Approval System

A full-stack web application for recording daily production work, approving it, and measuring performance.
It was built during a hackathon to model a real operational environment:

- **Technicians** log what they did during the day (work, breaks, waiting for resources).
- **Supervisors** review the entries of their own department and approve or reject them.
- **Planners** define products and operations (with a target rate) and follow productivity, efficiency and utilization.
- **Admins** manage users and have access to everything.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Backend  | Node.js, Express, Sequelize, PostgreSQL |
| Auth     | JWT (Bearer token), passwords hashed with bcrypt |
| Frontend | React 19, Vite, Tailwind CSS, React Router, Recharts, Axios (Arabic, RTL interface) |

## Roles and workflow

| Role        | What they can do |
|-------------|------------------|
| `technicien` | Log work / break / blocked time, see their own history, correct a rejected entry, record breaks, request leaves |
| `supervisor` | See pending entries of **their department**, validate or reject them, cancel an approval, department dashboard, review leave requests (API) |
| `planner`    | Manage products, operations and job orders, planner dashboard, statistics and charts |
| `admin`      | Everything above plus user and department management |

Approval workflow of a task: `pending → validated | rejected`. A rejected task that the technician corrects goes back to `pending`.
A supervisor can never review their own work, and a validated task can no longer be edited by its owner.

## Data model

```
Department 1───* Employee 1───* Task *───1 Product
     │                │                 *───1 Operation
     └──1───* Operation          Employee 1───1 ValidTasks / RejectedTasks (running counters)
```

- `Task.tasktype` is `working`, `break` or `blocked`. Only `working` tasks carry a product, an operation and a number of finished operations.
- `Task.duration` is always computed by the server from `startTime` / `endTime`.
- `Operation.minimum_per_min` is the target rate (operations per minute) set by the planner. It drives the statistics.
- Products and operations that are used by tasks cannot be deleted (history is never lost); departments with employees cannot be deleted.

- **Job orders** set a target quantity for a product + operation between two dates. The completed quantity is never stored: it is the sum of the
  finished operations of the *approved* working tasks for that product and operation inside those dates, so it can never drift.
- **Breaks** (lunch / regular / emergency) and **leaves** (day off / sick / vacation / emergency) belong to one employee. A leave starts as `pending`
  and can only be approved or rejected by a supervisor of the same department (or an admin), never by its owner.

### Statistics

Computed from **approved working tasks** only:

- *Productivity* = actual output / target output (`Σ duration × minimum_per_min`)
- *Efficiency* = standard time (`Σ finished_operations / minimum_per_min`) / actual time
- *Utilization* = actual working time / (worked days × 8 h)

## Running the project

Requirements: Node.js 18+, PostgreSQL 13+.

### 1. Database

```sql
CREATE USER joddb WITH PASSWORD 'choose-a-password';
CREATE DATABASE joddb OWNER joddb;
```

### 2. Backend

```bash
cd backend
cp .env.example .env      # then edit the values (DB credentials, JWT_SECRET, ADMIN_*)
npm install
npm run migrate           # create the tables
npm run seed              # departments, sample products/operations and the first admin account
npm run dev               # http://localhost:5000  (or: npm start)
```

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Log in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` from your `.env`, then create supervisors, technicians and planners
from **User management** (the system generates a random password for each new user).

Need a clean slate? `npm run db:reset && npm run migrate && npm run seed`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # optional, only needed if the API is not on http://localhost:5000/api
npm install
npm run dev               # http://localhost:5173
```

## API overview

All routes except login need `Authorization: Bearer <token>`. `GET /api` lists the endpoints; a Postman collection is in `backend/postman_collection.json`.

| Area | Endpoints | Access |
|------|-----------|--------|
| Auth | `POST /api/employees/login`, `GET /api/employees/profile` | public / any user |
| Users | `/api/admin/users`, `/api/admin/generate-password`, `/api/admin/users/:id/reset-password` | admin |
| Statistics | `GET /api/admin/stats`, `GET /api/admin/stats/employees` | planner, admin |
| Departments | `GET /api/departments` · `POST/PUT/DELETE` | planner/admin · admin |
| Products / Operations | `GET` · `POST/PUT/DELETE` | any user · planner, admin |
| Tasks | `GET /api/tasks/my-tasks`, `POST /api/tasks`, `PUT/DELETE /api/tasks/:id` | owner (admin) |
| Review | `GET /api/tasks/pending`, `GET /api/tasks/department`, `POST /api/tasks/:id/validate`, `POST /api/tasks/:id/reject` | supervisor, admin |
| Planner | `GET /api/planner/dashboard`, `GET/POST /api/planner/job-orders` | planner, admin |
| Breaks / leaves | `GET/POST /api/technician/breaks`, `GET/POST /api/technician/leaves` | any user (own records) |
| Leave review | `GET /api/supervisor/leaves`, `POST /api/supervisor/leaves/:id/approve\|reject` | supervisor (own department), admin |

## Security notes

- Passwords are hashed with bcrypt (the hash is never serialized in any response) and generated passwords use Node's `crypto` CSPRNG.
- The server refuses to start without a `JWT_SECRET`; secrets and database credentials only live in `.env` (git-ignored).
- Role checks are enforced on the server for every route. A task's owner, status and duration cannot be set by the client.
- CORS is limited to `CORS_ORIGIN`.
- Login is rate limited: 10 failed attempts per IP per 15 minutes (`LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS`), successful logins are not counted. Set `TRUST_PROXY=1` behind a reverse proxy.
