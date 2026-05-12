# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the default Next.js setup

This project uses:

- Next.js App Router
- TypeScript
- TanStack Query
- Zustand
- ShadCN UI
- Firebase / Firestore
- Firebase Cloud Functions
- CSS Variables architecture

Do NOT assume Pages Router patterns or outdated Next.js APIs.

Before generating or modifying code:

- Follow App Router best practices
- Respect Server vs Client Component boundaries
- Avoid deprecated APIs/patterns
- Preserve existing architecture and folder structure
- Read installed package APIs/types if unsure

---

# CORE ENGINEERING RULES

## Most Important Rule

Do NOT break existing functionality.

This is a production-scale school management application with:

- Admin
- Sub-admin
- Teacher
- Parent

roles and complex interconnected flows.

All changes must be:

- backward-compatible
- production-ready
- scalable
- secure
- low-cost for Firebase

Avoid regressions at all costs.

---

# Architecture Rules

## State Management

### TanStack Query

Use TanStack Query ONLY for:

- server state
- Firestore data
- cached API responses

### Zustand

Use Zustand ONLY for:

- auth state
- UI state
- branch selection
- temporary local state
- preferences

Do NOT store Firestore collections or large server datasets in Zustand.

---

# Query Architecture Rules

Use centralized query keys.

Preferred:

```ts
queryKeys.students.byBranch(branchId);
```

Avoid:

```ts
["students"];
```

Always:

- use scoped invalidation
- reuse cached data
- use staleTime/gcTime strategically

Never use:

```ts
queryClient.invalidateQueries();
```

Always scope invalidations.

---

# Firebase Optimization Rules

Firebase cost optimization is VERY important.

## Avoid unnecessary realtime listeners

Use realtime ONLY for:

- chat
- unread notifications
- active/live sessions

Avoid realtime for:

- fees
- timetable
- exams
- reports
- dashboards
- analytics

Prefer:

- getDocs
- paginated queries
- cached queries

---

# Firestore Rules

Never:

- fetch entire collections unnecessarily
- use broad collection scans
- create N+1 query patterns
- duplicate listeners
- invalidate all cache globally

Always:

- scope queries by:
  - branchId
  - classId
  - sectionId
  - teacherId

- use indexed queries
- use pagination where needed
- use batch writes where appropriate

---

# Security Rules

Do NOT trust frontend role checks alone.

Always enforce:

- Firestore security rules
- server-side validation
- Cloud Function/API validation where required

Protect:

- marks
- attendance
- exams
- fees
- reminders
- user roles
- branch access

Prevent:

- cross-branch access
- unauthorized reads/writes
- privilege escalation

---

# Branch & Teacher Scope Rules

Branch filtering is global across the app.

Modules affected:

- Students
- Teachers
- Fees
- Events
- Timetable
- Exams
- Marks
- Attendance
- Dashboards

Teacher access MUST be scoped by:

- assigned branches
- assigned classes
- assigned sections

Teachers should ONLY:

- view assigned students
- take attendance for assigned classes
- manage timetable for assigned classes
- manage exams/marks for assigned classes

Never expose unauthorized data.

---

# Performance Rules

Avoid unnecessary rerenders.

Use:

- React.memo
- useMemo
- useCallback

ONLY where beneficial.

Avoid:

- inline objects/functions in heavy renders
- unstable dependency arrays
- unnecessary remounting
- rerender cascades

Prevent:

- select flickering
- layout shifts
- white flashes
- unstable loading states

---

# Safe Access & Defensive Coding Rules

Always use safe defensive coding patterns.

Prefer:

```ts
user?.name;
assessment?.subjects ?? [];
teacher?.branchIds?.includes(branchId);
```

Avoid unsafe access like:

```ts
user.name;
assessment.subjects;
teacher.branchIds.includes(branchId);
```

Requirements:

- Use optional chaining everywhere appropriate
- Use nullish coalescing (`??`) for safe defaults
- Prevent undefined/null runtime crashes
- Prevent hydration mismatch issues
- Prevent async-state access errors
- Prevent transient loading-state crashes
- Handle partially loaded Firebase data safely
- Handle missing branch/class/user data gracefully

Important:

- Do NOT overuse optional chaining blindly
- Validate required data properly before critical actions
- Keep TypeScript types strict and safe
- Avoid unsafe type assertions (`as any`)
- Avoid non-null assertions (`!`) unless absolutely necessary

Preferred:

```ts
const students = data?.students ?? [];
const branchId = selectedBranch?.id ?? "";
```

Avoid:

```ts
const students = data.students;
const branchId = selectedBranch.id;
```

When writing new code:

- Always write defensive production-safe logic
- Preserve existing functionality
- Avoid risky assumptions
- Keep code stable during async loading/refetching
- Ensure components never crash due to missing data

This app must remain:

- production-ready
- stable
- resilient
- low-bug
- safe under realtime/async conditions

---

# UI Rules

Use:

- ShadCN UI
- existing design system
- CSS variables

Maintain:

- current UI consistency
- responsive design
- mobile-first behavior

Do NOT redesign working UI unnecessarily.

---

# Form Rules

Forms must:

- prevent duplicate submissions
- prevent race conditions
- preserve loading/error states
- reset ONLY after successful save
- avoid controlled/uncontrolled warnings

Use stable default values.

---

# Error Handling Rules

All async operations must use:

- centralized try/catch handling
- standardized error utilities
- safe user-facing messages

Never expose raw Firebase/internal errors to UI.

Avoid:

- silent failures
- swallowed errors
- unsafe async flows

---

# Code Cleanup Rules

When optimizing:

- remove unused imports
- remove dead code
- remove duplicate logic
- remove unnecessary state/effects

BUT:

- verify before removal
- do NOT remove indirectly used logic
- preserve existing flows

No risky deletions.

---

# Folder Structure Guidance

Prefer feature/domain-based organization.

Example:

```txt
src/features/chat
src/features/exams
src/features/fees
src/features/attendance
```

Keep:

- hooks reusable
- services isolated
- business logic modular

---

# Mobile Navigation Rules

This app uses:

- top navbar
- mobile bottom navigation

There is NO sidebar.

Navigation must:

- remain smooth
- avoid rerenders
- avoid remounting pages
- support role-based rendering

Maximum 5 bottom navigation items.

---

# Preferred Development Approach

Before implementing:

1. Analyze existing flow
2. Check for dependent features
3. Check query invalidation impact
4. Check Firebase billing impact
5. Check rerender impact
6. Check security implications
7. Preserve backward compatibility

Prefer:

- safe incremental refactors
- scoped changes
- reusable utilities
- architecture-safe implementations

Avoid:

- quick hacks
- aggressive rewrites
- breaking existing APIs
- unnecessary abstraction

---

# Production Requirements

All code must be:

- production-ready
- TypeScript-safe
- scalable
- maintainable
- secure
- optimized
- mobile-friendly
- low Firebase cost
- smooth UX
- backward-compatible

<!-- END:nextjs-agent-rules -->
