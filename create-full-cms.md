# Project Plan: Create Full CMS

## Overview
This plan transitions the VYBE Africa website from a static layout to a dynamic Content Management System (CMS) powered by Supabase. Staff members can update and publish posts, manage active programs, modify the team directory, customize dynamic page text blocks, and update key impact statistics directly from a centralized unified CMS dashboard.

**Project Type:** WEB

---

## Success Criteria
- [ ] Dedicated git branch `feature/full-cms` created.
- [ ] Database schemas deployed successfully in Supabase (Team, Stats, Gallery, Page Content).
- [ ] Supabase Storage buckets (`images`, `media`) created and configured with appropriate RLS policies.
- [ ] New unified CMS dashboard (`cms_dashboard.html`) built with tabbed panels for all sections.
- [ ] Public pages (`homepage.html`, `team_directory.html`, `about.html`, `child-protection.html`, `climate.html`) fetch and render live content.
- [ ] Fallback content displayed gracefully if database connectivity is slow or fails.
- [ ] Row Level Security (RLS) policies prevent unauthorized edits.

---

## Tech Stack
- **Database:** Supabase (PostgreSQL)
- **Asset Storage:** Supabase Storage (Buckets: `images`, `media`)
- **Frontend Logic:** HTML5 / CSS3 / JavaScript (ES6+ client-side)
- **Authentication:** Supabase Auth (integrated, roles checked from user data)

---

## Proposed File Structure
```
/
├── assets/js/
│   └── cms-client.js        # NEW: Common Supabase query wrapper and dynamic DOM injector
├── add_cms_tables.sql       # NEW: SQL migration script containing the table definitions and RLS setup
├── cms_dashboard.html       # NEW: Centralized dashboard portal for managing all CMS content
├── homepage.html            # MODIFY: Fetch & inject news, stats, and text dynamically
├── team_directory.html      # MODIFY: Fetch & inject team list dynamically
├── about.html               # MODIFY: Load main text sections dynamically
├── child-protection.html    # MODIFY: Load objectives dynamically
└── climate.html             # MODIFY: Load climate initiatives dynamically
```

---

## Task Breakdown

### Phase 1: Analysis, Git Branching & Schema Design
- [ ] **Task 1.1: Create Branch**
  - **Agent:** `project-planner`
  - **Skills:** `clean-code`
  - **INPUT:** Project root
  - **OUTPUT:** Dedicated git branch `feature/full-cms`
  - **VERIFY:** Run `git status` or `git branch`
- [ ] **Task 1.2: SQL Migrations**
  - **Agent:** `database-architect`
  - **Skills:** `database-design`
  - **INPUT:** Schema designs
  - **OUTPUT:** `add_cms_tables.sql` containing team, stats, gallery, and page content table structures
  - **VERIFY:** Execute migrations in Supabase SQL editor; verify tables exist
- [ ] **Task 1.3: Storage Buckets Setup**
  - **Agent:** `database-architect`
  - **Skills:** `database-design`
  - **INPUT:** Supabase Storage configuration
  - **OUTPUT:** Storage policies enabling write access for authenticated staff, read access for public
  - **VERIFY:** Check bucket availability via Supabase dashboard

### Phase 2: Shared Client Layer & Central Dashboard
- [ ] **Task 2.1: CMS Client Core**
  - **Agent:** `backend-specialist`
  - **Skills:** `api-patterns`
  - **INPUT:** Supabase credentials
  - **OUTPUT:** `assets/js/cms-client.js` with fetch and upload utilities
  - **VERIFY:** Check file imports and verify dynamic data functions return correctly
- [ ] **Task 2.2: Unified CMS Dashboard UI**
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **INPUT:** HTML boilerplate and assets
  - **OUTPUT:** `cms_dashboard.html` unified admin panel with responsive tabs
  - **VERIFY:** Access controls redirect to login if not logged in

### Phase 3: Dashboard Operations (CRUD & Media Upload)
- [ ] **Task 3.1: Page Content & Posts Editors**
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **INPUT:** `cms_dashboard.html`
  - **OUTPUT:** Functional rich/raw text editors for pages and news articles
  - **VERIFY:** Content saved successfully to Supabase and uploads images to bucket
- [ ] **Task 3.2: Team & Programs Editor**
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **INPUT:** `cms_dashboard.html`
  - **OUTPUT:** Member and program CRUD panels with file uploading
  - **VERIFY:** Operations execute successfully on database

### Phase 4: Dynamic Frontend Integration
- [ ] **Task 4.1: Dynamic Public Info Pages**
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **INPUT:** `about.html`, `child-protection.html`, `climate.html`
  - **OUTPUT:** Client-side rendering of page contents with fallback text
  - **VERIFY:** Updates in CMS show instantly on public pages
- [ ] **Task 4.2: Dynamic Team & Homepage**
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **INPUT:** `homepage.html`, `team_directory.html`
  - **OUTPUT:** Fetch news, stats, team dynamic listing
  - **VERIFY:** Verify counters, images, and content are live

---

## Phase X: Verification
- [ ] **P0: Security Scan:** Run `python .agents/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] **P0: Build & Lint:** Run lint validation.
- [ ] **P1: UX Audit:** Run `python .agents/skills/frontend-design/scripts/ux_audit.py .`
- [ ] **Runtime Check:** Verify local server serving dynamic data correctly.
