# JODDB – Backend

Express + Sequelize + PostgreSQL REST API. See the [root README](../README.md) for the overview, workflow and setup steps.

## Structure

```
backend/
├── config/config.js        # database config, read from .env
├── controllers/            # request handlers (admin, department, employee, operation, planner + job orders, product, supervisor leave review, task, technician breaks/leaves)
├── middleware/             # auth (JWT + role checks), login rate limit, error handler
├── migrations/             # schema (departments, employees, products, operations, tasks, valid/rejected counters, job orders, breaks, leaves)
├── models/                 # Sequelize models and associations
├── routes/                 # route definitions
├── seeders/                # first admin, departments, sample products and operations
├── utils/                  # jwt helpers, planner statistics
├── reset-database.js|sql   # drop all tables (development only)
└── server.js
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` / `npm start` | Start the API (nodemon / node) |
| `npm run migrate` / `npm run migrate:undo` | Run / revert migrations |
| `npm run seed` / `npm run seed:undo` | Run / revert seeders (executed seeders are tracked, so re-running is safe) |
| `npm run db:reset` | Drop every table and ENUM type (refuses to run when `NODE_ENV=production`) |

## Environment variables

See [`.env.example`](.env.example): `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
