# BuilderPrep Pro — static deployable starter

This package is a **direct-upload, static, offline-friendly web app starter** for a contractor-license study platform.

It was built from your product specification for a serious exam-prep system with:

- study mode
- exam mode with timer
- smart review queue
- favorites and review-later lists
- progress tracking
- multi-license data structure
- admin import/export
- installable PWA shell
- offline cache
- English / Spanish UI toggle

## What is included right now

### Fully working in this starter
- Static SPA that you can upload directly to a web host
- Local profile storage
- Local progress persistence
- Question bank from JSON seed data
- Import questions from JSON/CSV
- Export question bank
- Export/import full backup
- Study mode
- Timed exam mode
- Review center
- Progress analytics (local)
- PWA manifest + service worker

### Prepared but still local-only
- User accounts are local profile fields, not real server auth yet
- Sync is local-first; cloud sync is not connected yet
- Admin panel writes to local browser storage, not a server database
- Ranking is local gamification, not global leaderboard

## Folder structure

```text
builderprep-pro/
├─ index.html
├─ styles.css
├─ manifest.webmanifest
├─ service-worker.js
├─ README.md
├─ assets/
│  ├─ icon.svg
│  ├─ icon-192.png
│  └─ icon-512.png
├─ data/
│  └─ seed.json
└─ js/
   ├─ app.js
   ├─ constants.js
   ├─ logic.js
   ├─ storage.js
   └─ views.js
```

## How to upload it to your website

### Option 1 — simple shared hosting / cPanel
1. Unzip the project.
2. Upload **all files and folders** to your public web folder:
   - `public_html/`
   - or your domain root
3. Make sure the folder structure stays intact.
4. Visit your domain.

### Option 2 — local testing on Windows
Because this app uses modules and a service worker, test it with a local web server instead of double-clicking the HTML file.

#### Python
```bash
python -m http.server 8080
```
Then open:
```text
http://localhost:8080
```

#### VS Code Live Server
You can also open the folder in VS Code and run **Live Server**.

## Import format

### JSON
You can import either:
- an array of questions
- or an object with a `questions` array

### CSV
Recommended columns:

```text
licenseId,examId,category,topic,difficulty,question_en,question_es,answerA_en,answerB_en,answerC_en,answerD_en,correctAnswerId,explanation_en,explanation_es,tags
```

`tags` should be comma-separated.

## Recommended next upgrade path

If you want the **full production architecture** later, the clean migration path from this starter is:

1. Keep this UI and data model as the UX reference.
2. Move question storage from browser/localStorage to PostgreSQL.
3. Add a real backend with:
   - Next.js / NestJS / Supabase
   - PostgreSQL
   - role-based auth
   - cloud sync
4. Replace local admin writes with protected admin API endpoints.
5. Replace local analytics with server analytics.
6. Move large local banks to IndexedDB or server-paginated APIs.

## Important note

This version is intentionally designed to be **deployable immediately** on basic hosting, without a build step.
That makes it easy to upload now.

If you want, the next phase can be a **professional React + TypeScript + Vite/Next.js codebase** with:
- real auth
- database
- server sync
- admin roles
- analytics backend
- spaced repetition service
- production deployment pipeline
