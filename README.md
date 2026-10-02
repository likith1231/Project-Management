<div align="center">

<img src="client/src/assets/favicon.ico" width="72" height="72" alt="Logo" />

# 🗂️ Project Management

### Plan projects, assign tasks and track progress across workspaces in one app.

A full-stack project management platform built with **React 19**, **Express 5**, **Prisma**, **PostgreSQL (Neon)**, **Clerk** and **Inngest**.

<p>
  <a href="https://project-mgt-client.vercel.app"><img src="https://img.shields.io/badge/🚀_Live_Demo-Visit-6366f1?style=for-the-badge" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=for-the-badge" alt="PRs Welcome" />
</p>

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Redux_Toolkit-2-764ABC?style=flat-square&logo=redux&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk&logoColor=white" />
  <img src="https://img.shields.io/badge/Inngest-Events-0B0B0F?style=flat-square" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000000?style=flat-square&logo=vercel&logoColor=white" />
</p>

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [📁 Project Structure](#-project-structure)
- [🗄️ Data Model](#️-data-model)
- [🔌 API Reference](#-api-reference)
- [⚡ Background Jobs (Inngest)](#-background-jobs-inngest)
- [🚀 Getting Started](#-getting-started)
- [🔐 Environment Variables](#-environment-variables)
- [☁️ Deployment](#️-deployment)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🏢 | **Multiple workspaces** | Each workspace is a Clerk Organization with its own projects, members and roles (`ADMIN` / `MEMBER`). |
| 📁 | **Project management** | Create and update projects with a status, priority, start/end dates, progress and a team lead. |
| ✅ | **Task tracking** | Tasks have a type (`TASK`, `BUG`, `FEATURE`, `IMPROVEMENT`, `OTHER`), a status, a priority, an assignee and a due date. |
| 💬 | **Comments** | Project members can discuss each task in a comment thread. |
| 📊 | **Analytics** | Charts break tasks down by status, type and priority (built with Recharts). |
| 📅 | **Calendar view** | See a project's tasks laid out by due date. |
| 👥 | **Team management** | Invite people to a workspace and add workspace members to individual projects. |
| 📧 | **Email notifications** | Assignees get an email when a task is assigned and a reminder on the due date if it isn't done yet. |
| 🔐 | **Authentication** | Sign-in and sign-up through Clerk; the API verifies a JWT on every protected request. |
| 🌗 | **Dark mode** | Light and dark themes; the choice is saved in the browser. |
| 📱 | **Responsive UI** | Layouts adapt to desktop, tablet and phone screens. |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="50%">

### 🎨 Frontend (`/client`)
- ⚛️ **React 19** + **Vite 7**
- 🎨 **Tailwind CSS 4**
- 🧠 **Redux Toolkit** for state
- 🧭 **React Router 7**
- 🔐 **Clerk React** for auth
- 📊 **Recharts** for charts
- 🗓️ **date-fns** for dates
- 🔔 **react-hot-toast** for notifications
- ✨ **Lucide React** icons
- 🌐 **Axios** for HTTP

</td>
<td valign="top" width="50%">

### ⚙️ Backend (`/server`)
- 🚂 **Express 5** (Node.js, ES modules)
- 🔺 **Prisma ORM** with the Neon driver adapter
- 🐘 **PostgreSQL** on **Neon** (serverless)
- 🔐 **Clerk Backend** for JWT verification
- ⚡ **Inngest** for event-driven jobs
- 📧 **Nodemailer** over **Brevo SMTP**
- ☁️ Deployed on **Vercel**

</td>
</tr>
</table>

---

## 🏗️ Architecture

```mermaid
flowchart LR
    U([👤 User]) --> C[⚛️ React Client<br/>Vite · Redux · Tailwind]
    C -- "Sign in / sign up" --> K[🔐 Clerk]
    C -- "REST + Bearer JWT" --> S[🚂 Express API]
    S -- "verifyToken()" --> K
    S -- "Prisma ORM" --> D[(🐘 Neon PostgreSQL)]
    K -- "Webhooks<br/>user.* / organization.*" --> I[⚡ Inngest]
    S -- "app/task.assigned" --> I
    I -- "/api/inngest" --> S
    S -- "Nodemailer" --> M[📧 Brevo SMTP]
```

**How it fits together**

1. The user signs in with **Clerk**, and the client sends Clerk's session JWT in the `Authorization` header.
2. The `protect` middleware verifies the token and attaches `req.auth.userId` to the request.
3. Clerk webhooks for users, organizations and invitations go to **Inngest**, which calls the server to keep the database in sync.
4. When a task is created, the server emits `app/task.assigned`. Inngest then emails the assignee, sleeps until the due date, and sends a reminder if the task still isn't `DONE`.

---

## 📁 Project Structure

```
Project-Management/
├── 📂 client/                     # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── app/store.js           # Redux store
│   │   ├── assets/                # Images, icons, dummy data
│   │   ├── components/            # Reusable UI (dialogs, sidebars, charts, cards…)
│   │   ├── configs/api.js         # Axios instance (VITE_BASEURL)
│   │   ├── features/              # Redux slices (workspace, theme)
│   │   ├── pages/                 # Dashboard, Projects, ProjectDetails, TaskDetails, Team, Layout
│   │   ├── App.jsx                # Routes
│   │   └── main.jsx               # Entry point + ClerkProvider
│   ├── vercel.json                # SPA rewrites
│   └── package.json
│
├── 📂 server/                     # Express backend
│   ├── configs/
│   │   ├── prisma.js              # Prisma client + Neon adapter
│   │   └── nodemailer.js          # SMTP transporter
│   ├── controllers/               # workspace, project, task, comment logic
│   ├── inngest/index.js           # Background functions
│   ├── middlewares/authMiddleware.js
│   ├── prisma/schema.prisma       # Database schema
│   ├── routes/                    # Express routers
│   ├── server.js                  # App entry point
│   ├── vercel.json
│   └── package.json
│
├── ERROR_ANALYSIS.md              # Debugging notes
└── README.md
```

### 🧭 Client routes

| Path | Page |
|---|---|
| `/` | 🏠 Dashboard: stats, recent activity, task summary |
| `/projects` | 📁 All projects in the current workspace |
| `/projectsDetail?id=…` | 📋 Project overview, tasks, analytics, calendar, settings |
| `/taskDetails?projectId=…&taskId=…` | ✅ Task details and comments |
| `/team` | 👥 Workspace members and invitations |
| `/sign-in`, `/sign-up` | 🔐 Clerk authentication |

---

## 🗄️ Data Model

```mermaid
erDiagram
    User ||--o{ WorkspaceMember : "joins"
    User ||--o{ Workspace : "owns"
    User ||--o{ Project : "leads"
    User ||--o{ ProjectMember : "belongs to"
    User ||--o{ Task : "assigned"
    User ||--o{ Comment : "writes"
    Workspace ||--o{ WorkspaceMember : "has"
    Workspace ||--o{ Project : "contains"
    Project ||--o{ ProjectMember : "has"
    Project ||--o{ Task : "contains"
    Task ||--o{ Comment : "has"

    User { string id PK
           string name
           string email
           string image }
    Workspace { string id PK
                string name
                string slug
                string ownerId FK }
    Project { string id PK
              string name
              enum status
              enum priority
              int progress
              string team_lead FK }
    Task { string id PK
           string title
           enum status
           enum type
           enum priority
           datetime due_date
           string assigneeId FK }
    Comment { string id PK
              string content
              string userId FK
              string taskId FK }
```

<details>
<summary><b>📌 Enums</b></summary>

| Enum | Values |
|---|---|
| `WorkspaceRole` | `ADMIN`, `MEMBER` |
| `ProjectStatus` | `ACTIVE`, `PLANNING`, `COMPLETED`, `ON_HOLD`, `CANCELLED` |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `DONE` |
| `TaskType` | `TASK`, `BUG`, `FEATURE`, `IMPROVEMENT`, `OTHER` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH` |

</details>

---

## 🔌 API Reference

> 🔒 Every route except `/` and `/api/inngest` requires `Authorization: Bearer <Clerk JWT>`.

### 🏢 Workspaces: `/api/workspaces`
| Method | Endpoint | Description |
|:---:|---|---|
| `GET` | `/` | List the workspaces the current user belongs to |
| `POST` | `/add-member` | Add a member to a workspace (admin only) |

### 📁 Projects: `/api/projects`
| Method | Endpoint | Description |
|:---:|---|---|
| `POST` | `/` | Create a project (workspace admin) |
| `PUT` | `/:id` | Update a project |
| `POST` | `/:projectId/addMember` | Add a member to a project (project lead only) |

### ✅ Tasks: `/api/tasks`
| Method | Endpoint | Description |
|:---:|---|---|
| `POST` | `/` | Create a task and trigger the assignment email |
| `PUT` | `/:id` | Update a task |
| `POST` | `/delete` | Delete one or more tasks (`{ tasksIds: [...] }`) |

### 💬 Comments: `/api/comments`
| Method | Endpoint | Description |
|:---:|---|---|
| `POST` | `/` | Add a comment to a task (project members only) |
| `GET` | `/:taskId` | Get all comments on a task |

---

## ⚡ Background Jobs (Inngest)

| Function | Trigger | What it does |
|---|---|---|
| `sync-user-from-clerk` | `clerk/user.created` | Creates the user in the database |
| `update-user-from-clerk` | `clerk/user.updated` | Updates the user's name, email and avatar |
| `delete-user-with-clerk` | `clerk/user.deleted` | Deletes the user |
| `sync-workspace-from-clerk` | `clerk/organization.created` | Creates the workspace and makes its creator `ADMIN` |
| `update-workspace-from-clerk` | `clerk/organization.updated` | Updates the workspace's name, slug and image |
| `delete-workspace-with-clerk` | `clerk/organization.deleted` | Deletes the workspace |
| `sync-workspace-member-from-clerk` | `clerk/organizationInvitation.accepted` | Adds the invited user as a workspace member |
| `send-task-assignment-mail` | `app/task.assigned` | 📧 Emails the assignee, then sends a reminder on the due date if the task isn't done |

---

## 🚀 Getting Started

### ✅ Prerequisites

- **Node.js** 18+ and **npm**
- A **[Neon](https://neon.tech)** (or any PostgreSQL) database
- A **[Clerk](https://clerk.com)** application with **Organizations** enabled
- An **[Inngest](https://www.inngest.com)** account (or the local Inngest Dev Server)
- **SMTP** credentials (the project is set up for [Brevo](https://www.brevo.com))

### 1️⃣ Clone the repository

```bash
git clone https://github.com/likith1231/Project-Management.git
cd Project-Management
```

### 2️⃣ Set up the backend

```bash
cd server
npm install              # also runs `prisma generate`
# create server/.env (see Environment Variables below)
npx prisma db push       # create the tables in your database
npm run server           # start with nodemon on http://localhost:5000
```

### 3️⃣ Set up the frontend

```bash
cd ../client
npm install
# create client/.env.local (see Environment Variables below)
npm run dev              # http://localhost:5174
```

### 4️⃣ Run Inngest locally (optional)

```bash
npx inngest-cli@latest dev -u http://localhost:5000/api/inngest
```

> 💡 To sync users and organizations locally, point your Clerk webhooks at Inngest (see Clerk's Inngest integration docs).

### 📜 Available scripts

| Location | Command | Description |
|---|---|---|
| `client` | `npm run dev` | Start the Vite dev server |
| `client` | `npm run build` | Build for production |
| `client` | `npm run preview` | Preview the production build |
| `client` | `npm run lint` | Run ESLint |
| `server` | `npm run server` | Start the API with nodemon |
| `server` | `npm start` | Generate the Prisma client and start the API |

---

## 🔐 Environment Variables

### `server/.env`

```env
# Database (Neon / PostgreSQL)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
DIRECT_URL=postgresql://user:password@host/db?sslmode=require

# Clerk
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx

# Inngest
INNGEST_EVENT_KEY=xxxxxxxxxxxxxxxx
INNGEST_SIGNING_KEY=signkey-xxxxxxxxxxxxxxxx

# Email (Brevo SMTP)
SMTP_USER=your-smtp-login
SMTP_PASS=your-smtp-password
SENDER_EMAIL=you@example.com

PORT=5000
```

### `client/.env.local`

```env
VITE_BASEURL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
```

> ⚠️ Never commit real secrets. Keep `.env` files in `.gitignore`.

---

## ☁️ Deployment

Both apps are set up for **[Vercel](https://vercel.com)**:

- **Client** → `client/vercel.json` rewrites every route to `index.html` so client-side routing works.
- **Server** → `server/vercel.json` deploys `server.js` with `@vercel/node`.

After deploying:
1. Add the environment variables above to each Vercel project.
2. Add your frontend URL to the CORS `origin` list in `server/server.js`.
3. Set `VITE_BASEURL` in the client to your deployed API URL.
4. Register `https://<your-api>/api/inngest` as the app URL in the Inngest dashboard.

---

## 🤝 Contributing

Contributions are welcome! 🎉

1. 🍴 Fork the repository
2. 🌿 Create a branch: `git checkout -b feature/amazing-feature`
3. 💾 Commit your changes: `git commit -m "Add amazing feature"`
4. 🚀 Push the branch: `git push origin feature/amazing-feature`
5. 🔃 Open a pull request

See [`client/CONTRIBUTING.md`](client/CONTRIBUTING.md) and [`client/CODE_OF_CONDUCT.md`](client/CODE_OF_CONDUCT.md) for details.

---

## 📜 License

This project is released under the **MIT License**. See [`client/LICENSE.md`](client/LICENSE.md).
The frontend is based on the open-source [GreatStack project-management](https://github.com/GreatStackDev/project-management) template.

---

<div align="center">

### ⭐ If you find this project useful, give it a star!

Made with ❤️ by **[likith1231](https://github.com/likith1231)**

</div>
