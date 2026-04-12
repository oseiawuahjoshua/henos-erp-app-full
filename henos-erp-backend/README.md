# Henos Energy ERP — Backend Server

## 📁 Project Structure

```
henos-erp-backend/          ← This folder (the backend)
├── prisma/
│   └── schema.prisma       ← Database blueprint (models/tables)
├── src/
│   ├── index.js            ← Server entry point (start here)
│   ├── db.js               ← Database connection (Prisma client)
│   ├── seed.js             ← Creates first admin + starter data
│   ├── middleware/
│   │   └── auth.js         ← Login token verification
│   └── routes/             ← One file per section of the app
│       ├── auth.js         ← Login / logout
│       ├── users.js        ← User management
│       ├── customers.js    ← Customer records
│       ├── orders.js       ← Sales orders
│       ├── invoices.js     ← Invoices & payments
│       ├── expenses.js     ← Expense tracking
│       └── ...etc
├── .env.example            ← Environment config template
├── .gitignore
└── package.json

henos-erp/                  ← Frontend (your existing React app)
```

---

## 🧠 Understanding the Database (Beginner's Guide)

### What is a Database?

A **database** is like a very organised filing cabinet that lives on a computer.
Instead of paper files, it stores information in **tables** (like spreadsheets).

```
Your PostgreSQL database looks like this:

┌─────────────────────────────────────────────────────┐
│                  henos_erp (database)               │
├──────────────┬──────────────┬───────────────────────┤
│ users table  │ orders table │  invoices table  │ ... │
├──────────────┼──────────────┼──────────────────┤     │
│ id           │ id           │ id               │     │
│ name         │ customerId   │ amount           │     │
│ password     │ product      │ amountPaid       │     │
│ role         │ qty          │ status           │     │
│ ...          │ status       │ ...              │     │
└──────────────┴──────────────┴──────────────────┴─────┘
```

### What is PostgreSQL?

**PostgreSQL** (often called "Postgres") is the actual database engine — the software
that stores and retrieves your data. It's free, powerful, and used by big companies.

### What is Prisma?

**Prisma** is a translator between your JavaScript code and PostgreSQL.

Without Prisma, you'd write raw SQL like:
```sql
SELECT * FROM users WHERE id = 'HN-ADMIN-001' AND active = true;
```

With Prisma, you write JavaScript:
```js
await prisma.user.findFirst({ where: { id: 'HN-ADMIN-001', active: true } })
```

Prisma handles the SQL for you. Cleaner, safer, and easier to read.

### What is Express?

**Express** is the web framework — it makes your Node.js server able to receive
HTTP requests from the React frontend and send back responses.

Think of it like a restaurant:
- The **React frontend** = the customer placing an order
- **Express** = the waiter taking the order
- **Prisma** = the chef who gets the food (data) from the kitchen
- **PostgreSQL** = the kitchen/pantry where all the food is stored

### How does login work? (JWT Tokens)

1. User types ID + password in React → React sends it to `POST /api/auth/login`
2. Backend checks the database: does this user exist? Is the password correct?
3. If yes → backend creates a **JWT token** (a signed digital pass)
4. React stores this token and sends it with every future request
5. Backend checks the token on every request to know who's asking

```
React App                    Backend Server              PostgreSQL
   │                              │                          │
   │  POST /api/auth/login        │                          │
   │  { id: "HN-ABC-1234",        │                          │
   │    password: "MyPass" } ───► │                          │
   │                              │  SELECT * FROM users     │
   │                              │  WHERE id = '...' ─────► │
   │                              │                          │
   │                              │ ◄── user found ──────────│
   │                              │                          │
   │ ◄── { token: "eyJ..." } ─── │  (creates JWT token)     │
   │                              │                          │
   │  GET /api/orders             │                          │
   │  Authorization: Bearer eyJ.. │                          │
   │  ───────────────────────────►│                          │
   │                              │  (verifies token)        │
   │                              │  SELECT * FROM orders ──►│
   │ ◄── [ list of orders ] ───── │ ◄────────────────────────│
```

---

## 🚀 Setup Guide (Step by Step)

### Step 1: Get PostgreSQL

**Option A — Supabase (FREE, recommended for beginners, no install needed)**
1. Go to https://supabase.com and create a free account
2. Click **New Project** → give it a name like `henos-erp`
3. Set a strong database password (save it!)
4. Wait ~2 minutes for the project to start
5. Go to **Project Settings → Database → Connection String → URI**
6. Copy the connection string — it looks like:
   `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

**Option B — Local PostgreSQL (installed on your computer)**
1. Download from https://www.postgresql.org/download/
2. Install it (keep default settings, remember the password you set)
3. Your connection string will be: `postgresql://postgres:YOURPASSWORD@localhost:5432/henos_erp`
4. Then create the database: open pgAdmin → right-click Databases → Create → name it `henos_erp`

---

### Step 2: Configure the backend

```bash
# In the henos-erp-backend folder:
cd henos-erp-backend

# Copy the example env file
cp .env.example .env
```

Open `.env` in a text editor and fill in your details:
```env
DATABASE_URL="postgresql://postgres:YOURPASSWORD@localhost:5432/henos_erp"
JWT_SECRET="make-this-a-long-random-string-at-least-32-characters-long"
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

---

### Step 3: Install packages

```bash
npm install
```

This downloads all the libraries listed in `package.json`.

---

### Step 4: Set up the database tables

```bash
# This reads your schema.prisma and creates all the tables in PostgreSQL
npm run db:push

# OR use migrations (better for production — tracks changes over time):
npm run db:migrate
```

After running this, your PostgreSQL database will have all the tables
(users, orders, invoices, etc.) automatically created.

---

### Step 5: Seed the database (create first admin user)

```bash
npm run db:seed
```

This creates:
- ✅ The default admin account
- ✅ The 6 EaziGas exchange points
- ✅ Sample product prices

**Default admin login:**
```
Employee ID: HN-ADMIN-001
Password:    Admin@Henos2025
```

---

### Step 6: Start the backend server

```bash
npm run dev
```

You'll see:
```
╔══════════════════════════════════════════════╗
║  🔥  Henos Energy ERP — Backend Server       ║
║      Running on http://localhost:4000        ║
╚══════════════════════════════════════════════╝
```

Test it by opening http://localhost:4000/health in your browser.
You should see: `{"status":"ok","message":"Henos Energy ERP Backend is running! 🚀"}`

---

### Step 7: Start the frontend (in a separate terminal)

```bash
cd ../henos-erp
npm run dev
```

The React app runs on http://localhost:5173

---

## 📋 All Available API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in, get token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/users` | List all users (admin) |
| POST | `/api/users` | Create user (admin) |
| PATCH | `/api/users/:id` | Update user (admin) |
| DELETE | `/api/users/:id` | Delete user (admin) |
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense |
| GET | `/api/prices` | List prices |
| GET | `/api/stock` | List stock |
| GET | `/api/deliveries` | List deliveries |
| GET | `/api/deliveries/log` | Delivered orders log |
| GET | `/api/eazigas` | List exchange points |
| GET | `/api/holding/:area` | Holding records (elh/kum/wcd) |
| GET | `/api/stations` | LPG stations |
| GET | `/api/esg/metrics` | ESG metrics |
| GET | `/api/notifications/:channel` | Notifications |

---

## 🔧 Useful Commands

```bash
# View your database in a visual browser UI
npm run db:studio

# Reset and recreate all tables (WARNING: deletes all data!)
npx prisma migrate reset

# After changing schema.prisma, apply changes
npm run db:migrate

# Check what's in the database
npm run db:studio   # opens http://localhost:5555
```

---

## 🌐 Connecting Frontend to Backend

The frontend currently uses localStorage for data. To connect it to this backend:

1. Backend must be running on port 4000
2. Frontend should send requests to `http://localhost:4000/api/...`
3. Each request needs the JWT token in the `Authorization` header

The next development step is updating the React app to call these API
endpoints instead of using the local state.
