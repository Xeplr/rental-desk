# rental-desk

**Rental Desk** — the example app built in the video series *Build a real app
without hand-coding its screens*: equipment, customers and rentals designed in
Configure UI, plus three small functions in `api/functions/rentals.js` (a rule on
save, two buttons, a board). Watch the seven videos of the series: **[Vibe App Development — the playlist](https://www.youtube.com/playlist?list=PLYXyU6NRwvC8)**

A fresh install (`npm run setup`, then start it) has all of it: the forms and
lists are in `api/screens/` and publish themselves on first start, creating
their tables; the side rail comes from `api/migrations-auth/0006_rental_desk_menus.sql`.
The *New rental* flow is in `api/flows/` for reference — flows live in the
workflow database, so make it again in Configure UI → Flows (steps in that
folder's README). No records are included.

An xeplr application, created by [`@xeplr/cli`](https://www.npmjs.com/package/@xeplr/cli).

```
rental-desk/
├─ api/        the API and the sign-in service          → api/README.md
├─ ui/         the React app                           → ui/README.md
├─ BUILDING.md every step of building the app: what is a click, what needs a function
└─ CLAUDE.md   how to change this app — for Claude, and a good read for people
```

## Start it

Needs **PostgreSQL** and **Redis** running.

```bash
cd api && npm run start-auth     # sign-in           http://localhost:19301
cd api && npm run start-api      # the API           http://localhost:19302
cd ui  && npm run dev            # the app           http://localhost:19300
```

Open http://localhost:19300 and sign in as `admin@rentaldesk.local`.

Flows (`@xeplr/workflow-api`) run **inside the API**, in a database of their
own that the API creates on first start — nothing else to start.

## Where each address goes

The browser only ever calls **paths** on the app's own address — never a port.
What serves each path is decided in ONE place per environment: Vite's dev proxy
locally (`ui/vite.config.js`, from `ui/.env`), nginx in production.

| path | served by | local (`ui/.env`) | production (nginx) |
|---|---|---|---|
| `/auth/api/…` | the sign-in service | `AUTH_URL` | `127.0.0.1:<AUTH_PORT>` |
| `/api/workflow/…` | flows — `@xeplr/workflow-api`, inside the API | `API_URL` | `127.0.0.1:<RENTAL_DESK_PORT>` |
| `/api/…`, `/health`, `/whoami` | the API | `API_URL` | `127.0.0.1:<RENTAL_DESK_PORT>` |

### Production

`api/production.env.example` lists every setting (copy it to
`api/production.env`, fill in, start with `NODE_ENV=production`). Build the UI
(`cd ui && npm run build`) and let nginx serve it and route the paths:

```nginx
server {
  server_name app.example.com;
  root /srv/rental-desk/ui/dist;

  location /auth/api/     { proxy_pass http://127.0.0.1:19301; }
  location /api/          { proxy_pass http://127.0.0.1:19302; }
  location = /health      { proxy_pass http://127.0.0.1:19302; }
  location = /whoami      { proxy_pass http://127.0.0.1:19302; }
  location /              { try_files $uri /index.html; }   # the React app's own pages
}
```

Every one of these checks the same sign-in token, so one login covers them all.

## What is in it

- **Sign-in** — login, register, password reset, profile, and the admin screens for users, roles and permissions (`@xeplr/auth`, `@xeplr/ui-account`).
- **Tasks** — a sample built from screens: a list, and a form it opens on a page of its own, saved into an ordinary `tasks` table. The form is filled in over three steps and uses every control there is — text, a dropdown, radio buttons, a tick box, a date, a date and time, several tags at once, and a file.
- **Configure UI** — in the settings menu, for Super Admin: every form (make one, design it, publish it, add it to the side rail), every flow (screens one after another — each screen's events, and where it goes next) and the side rail itself (rename, reorder, hide).
- **Flows** — in the side rail: the journeys people can start, run by `@xeplr/workflow-api` inside the API.
- **Functions** — `api/functions/`: your code, registered by event and picked by name in a screen's events or a flow step (see "Functions" below).

## Create a new UI

**[`BUILDING.md`](BUILDING.md) is the step-by-step guide** — masters, forms,
the menu, roles and flows by clicking; buttons, worked-out lists, rules and
emails as a function you write in `api/functions/` and then pick from a
dropdown in the designer; and what still needs a page written by hand.

- **Without code** — Configure UI → Forms → New form → design → Publish → Add to menu.
- **With Claude** — open Claude in this folder and give it (change the name and the fields):

  > Create a new UI for farming departments. One record is a farming department with: Name (required), Region (dropdown: North, South, East, West), Area in acres (number, at least 0), Started on (date), Notes (long text). Show Name, Region and Area in the list. Follow "Create a new UI" in CLAUDE.md.

## Flows

Your forms, one after another. Design one in **Configure UI → Flows**: pick the screens, and for each one say what runs around its records (its **events**) and where the journey goes once it is saved — a screen, a **function that decides**, or the end. Publish it, and people start it from **Flows** in the side rail (or at `/journey/<key>`). The run id joins the address once it starts, so a journey can be reloaded, left, or handed to someone else and opened on the step it is on.

Flows are run by **`@xeplr/workflow-api`**, **inside this API** — `bin/www` starts it after the screens. Nothing else to start:

| | |
|---|---|
| **Database** | its own, `DB_WORKFLOW` (`rental_desk_workflow`), beside this app's — a sub-product embedded in an app keeps its tables apart. Created and migrated the first time the API starts. Each screen still saves into its own table in `DB_API`. |
| **Tenancy** | none, like the rest of this app — flows belong to the whole app. Workflow never creates companies or workspaces of its own. |
| **Permissions** | each route checks the caller's (`List flows`, `Start flow run`, `Publish flow`…), granted by `@xeplr/workflow-api`'s `migrations-auth`, which `XEPLR_AUTH_MIGRATIONS` loads. |

## Functions — your code, picked by name

Code around a form's records — a check on save, an email after, a list narrowed to the user's own — is a **function** in `api/functions/`, registered with `@xeplr/actions` under the **event** it is for. A screen names it in its `events`; a flow step names a `decide` function to choose where to go next. The designer shows each event only the functions written for it, with what they are handed and return; the code stays in `api/functions/` and runs on the server.

| event | runs | return |
|---|---|---|
| `beforeLoad` | before records are read | nothing, or a narrower `ctx.query` |
| `beforeSave` | before a record is written | the values to save; `ctx.reject(message, { field })` refuses |
| `afterSave` | once it is saved | (ignored) |
| `beforeDelete` | before a delete | nothing; `ctx.reject` refuses |
| `onError` | when load / save / delete failed | (ignored) |
| `decide` | a flow step is done | the next step's key |

A screen's **controls** name functions too, each picked from a dropdown in the designer:

| event | named by | return |
|---|---|---|
| `button` | a button's **Runs** (Actions → Buttons) | `{ message }` |
| `buttonOptions` | a checklist in a button's popup | the entries to tick |
| `listRows` | a list's **Rows from** | `{ rows, counts, kpis }` |
| `rowDetails` | a list column's **Hover box from** | the hover box's lines |
| `recordDetails` | a Details control's **Details from** | `{ sections }` |
| `feedEntries` | a Comments & history control's **Entries from** | the comments and events |
| `suggest` | an Autocomplete field's **Suggestions from** | the suggestions |

Every step of building the app — which are clicks, which need a function, and a recipe for each — is in **`BUILDING.md`**.

`api/functions/index.js` registers two to start from: `tidyTaskTitle` (Tasks' `beforeSave`) and `byPriority` (a `decide`). A screen that names a function nobody registered is refused when it is published, by name.

## Rules this app follows

| Rule | Why |
|---|---|
| Records live in **real tables**, one column per field — never JSON. | Reports stay plain SQL. |
| A **key** and a **label**, everywhere: code uses keys (form keys, menu keys); people read labels, renamed in Configure UI. | Renaming what people see never breaks code. |
| **`REDIS_PREFIX`** in `api/development.env` is required and unique to this app. | Apps sharing a Redis would otherwise serve each other's sessions and permissions. |
| Designing and publishing forms is **Super Admin only**. | Publishing changes database tables. |
| Rules that must hold go in **server functions** (`api/functions/`), named in a screen's events; the browser only shapes what people see and send. | The browser is not a security boundary. |
| Every data address is under **`/api`**. | A page and a data path must never collide. |
| A screen is a **document**; a button is a **registered function and its parameters**; a page written by hand is **web only**, listed in `ui/pages.json` with the reason. | What is a document can be drawn anywhere — a phone app too. The pre-commit hook and Configure UI → Menu say which pages are not. |
| Every file the app keeps is under **`XEPLR_DATA_DIR`**, a folder per company. | One place to back up, and no company reads another's files. |

The full list, and where each piece lives, is in `CLAUDE.md`.
