# Student P0 UX Definition

**Status:** Source of truth for the Student experience in Release 1, Increment A.
**Product source:** [backend PRD](../../../nexalab-be/docs/product/prd.md), especially FR-06–15. Release 1 uses a shared four-role architecture; this document intentionally details only the Student-first increment.

## 1. Audit of the current design docs

| Existing material | Reuse | Change for Student P0 |
| --- | --- | --- |
| Foundations, components, layout and accessibility checklists | Reuse the token discipline, responsive intent, clear states and anti-slop rules. | Use the tokens and hierarchy in this document for the Student role. |
| Screen specs | Reuse as an inventory only. | Its priority labels predate the PRD; AI Tutor moves from P0 to P1. |
| `design-system.md` | Reference only when no current numbered document covers a pattern. | It is legacy and conflicts with the numbered documents. |
| Existing UI | Reuse Lucide, responsive CSS, React Query loading/error patterns and real lab data. | Remove enterprise-dashboard signals from Student P0 and add traceable progress details. |

## 2. Scope and decisions

**Scope:** Vietnamese THCS Natural Science, Grades 8–9, detailed Student UX for Release 1 Increment A. Teacher, Parent, and Admin remain in the shared architecture but their complete UX is deferred to later increments.

**Open Curriculum loop:** **Chọn môn → Chọn khối → Mục lục chương/chủ đề → Bài học (nội dung → video → bài tập cơ bản) → Lab nền tảng nếu có → Tiến độ**. Class Space is a separate, membership-scoped destination for teacher-created resources, unscored study-card/study-quiz practice, explicitly assigned scored tests, and class-linked Labs.

The lesson library may show an optional subject-level external ebook/reference link configured by an admin. Label it as an external publisher/source link; opening it does not imply NexaLab hosts or has reproduction rights to the material.

- No leaderboard, streak, badge economy, coins or gems in P0.
- No Student AI Tutor/Hint in P0. It is P1 and must not appear in Student P0 navigation, CTA copy or dashboard cards.
- No mascot implementation in P0. The referenced three-mascot idea remains an identity exploration, not a P0 requirement. Use a small line-art science illustration in the Continue card; it is decorative support, not a product character.
- Every percentage, score or count links to its underlying lesson, quiz or practical attempts. A number without a drill-down is not shown as an achievement metric.
- No real-world safety implication: simulations are educational models, not real experiments.

## 2b. Open Curriculum and Class Space access

Open Curriculum is not gated by assignment, enrollment, quiz, or completion. Its student flow is:

```
[Chọn môn] → [Chọn khối có nội dung, sắp xếp tăng dần]
          → [Mục lục chương/chủ đề theo giáo trình]
          → [Danh sách bài theo thứ tự]
          → [Nội dung bài] → [Video] → [Bài tập cơ bản]
          → [Lab nền tảng nếu môn/chủ đề có Lab đã phát hành]
```

**Access rules:**
- Released shared lessons, video, basic exercises, references, and foundational Labs open without assignment or course progress prerequisites. A Lab is optional and never gates other shared materials.
- Quizlet/study-card decks and quizzes do not appear in the Open Curriculum lesson flow. Only a teacher creates them in Class Space; access requires active, approved class membership.
- Class Space study quizzes are unscored practice. Scored tests, due dates, and target-scoped submissions exist only when a teacher explicitly assigns a test. Quiz/test completion is never a default prerequisite for either a foundational or custom Lab.
- Foundational Labs appear in the global Lab catalog using official subject/grade/chapter/topic links. Teacher-created custom Labs appear only in their Class Space and link to the relevant class lesson and its subject/grade/chapter/topic context. Assignment targets govern scored submissions when assigned.
- Class resource sharing is separate from assigning work. A student without a class still sees Open Curriculum; a student outside a class never sees that class's private resources.
- Do not show an unavailable placeholder subject or grade as if it contains released lessons. Show corpus coverage separately from student progress.

The Dashboard Continue card points to the next unfinished open-course activity when one exists, otherwise to the subject/lesson selector. It never sends a student to a quiz or locked Lab as a required next step.

## 3. Concept and tone

### Phòng thí nghiệm của em

A bright, soft personal workspace where a student sees progress through genuine action: try, observe, retry. It should feel like a science workbench made for a learner, not a corporate analytics dashboard.

1. **Action first:** one primary "Tiếp tục" action takes the student to the next learning-loop step.
2. **Compare with self:** show personal history and evidence, never rank students against one another.
3. **Numbers are explainable:** tapping/clicking a metric opens its sources and definitions.

Copy is short, concrete and supportive: “Em đã thử 2 lần. Hãy điều chỉnh nhiệt độ thấp hơn rồi chạy lại.” Avoid generic hype such as “Chinh phục kiến thức ngay!”.

## 4. Visual direction

### Tokens

| Role | Token | Value |
| --- | --- | --- |
| Outer frame | `bg-frame` | `#C9D3E3` |
| App canvas | `bg-canvas` | `#F2F7FA` |
| Surface | `surface` | `#FFFFFF` |
| Navigation and standard active state | `primary` | `#1F6F78` |
| Learning-step CTA | `action` | `#F6C945` with `#14202B` text |
| Primary text | `text` | `#14202B` |
| Secondary text | `text-muted` | `#506070` |
| Physics surface / ink | `subject-physics` / `subject-physics-ink` | `#D3ECF7` / `#075985` |
| Chemistry surface / ink | `subject-chemistry` / `subject-chemistry-ink` | `#F5DFC0` / `#7C3D12` |
| Biology surface / ink | `subject-biology` / `subject-biology-ink` | `#D9EBC7` / `#2E5D22` |
| Success surface / ink | `state-success` / `state-success-ink` | `#D5EFC8` / `#2F6B2A` |
| In progress surface / ink | `state-progress` / `state-progress-ink` | `#FFF1C2` / `#7A5A00` |
| Needs practice surface / ink | `state-practice` / `state-practice-ink` | `#F8D9EE` / `#8A2F6A` |
| System error surface / ink | `state-error` / `state-error-ink` | `#FDE0DC` / `#A3281C` |

The global token source is [01. Design Foundations](01-DESIGN-FOUNDATIONS.md). Subject color signals subject context only; it never signals a score, due date or verdict. Use **Be Vietnam Pro** for Vietnamese interface text. Use a tabular, monospace face only for scientific numerical readouts. Headings and metrics use 700–800; labels use 500; body text is at least 16px on mobile. Verify every final foreground/background pair at WCAG AA before implementation.

Cards use a 24px radius; nested cards use 16px. Buttons and chips are pills. Use pastel surfaces, a one-level soft shadow and spacing to group content; do not create visual hierarchy through heavy borders, glows, glass effects or gradients. Use one Lucide icon family at 1.75px stroke.

## 5. Information architecture and responsive layout

### Desktop

| Area | Student content |
| --- | --- |
| Left navigation rail | Trang chủ, Bài học, Lớp học, Lab, Bài tập, Tiến độ, Tài khoản |
| Stat row | Tiến độ bài được giao, bài còn lại, lượt thử lab; neutral unless each metric belongs to a real subject |
| Main column | Large Continue card, current open lesson (content, video, basic exercise), optional foundational Lab, then weekly activity |
| Right column | Assignments and due dates, recent attempts |

### Tablet and mobile

On tablet, move the right column below the main content. On mobile, show one vertical column in this order: stats, Continue card, assignments, recent attempts, remaining content.

The bottom navigation has at most five destinations: **Trang chủ, Bài học, Lớp học, Bài tập, Tiến độ**. The global foundational Lab catalog is reachable from Bài học subject/chapter context and keeps search/filter access; a Lab is never hidden behind a quiz gate. Tài khoản is available from the top-right profile menu; it is not a sixth tab. Reserve bottom padding so the tab bar never covers scrollable content.

## 6. Screen definitions

### 6.1 Dashboard

**Layout (Desktop):** Left nav rail → Stat row (3 cards) → [Continue card + Lesson pathway] || [Assignments + Recent attempts]

**Continue card:**
- Background: current subject's pastel token (`subject-*` surface).
- Content: subject chip, lesson title (max 2 lines, ellipsis), progress indicator (e.g., "Bước 2/4"), one primary CTA button using `action` token.
- CTA label reflects the exact next step per section 2b: *"Xem video 6 phút"*, *"Làm bài kiểm tra nhỏ"*, *"Bắt đầu thực hành"*.
- Decorative line-art science illustration (right side, desktop only). Not a mascot, not interactive.
- **Edge case — no active lesson:** Show a neutral card with CTA *"Chọn bài học để bắt đầu"* linking to Lesson list. No illustration placeholder needed.

**Open-course progress (directly below Continue card):**
- Horizontal scroll on mobile; inline row on desktop.
- Each step = icon + label + completion badge. No lock state is used for shared curriculum progress.
- Steps: Nội dung bài · Video · Bài tập cơ bản · (Lab nền tảng nếu có).
- Completion states are informational; no step is locked by quiz or assignment. Tapping a step opens that released resource.

**Stat row (3 cards):**
- Each card: label, numeric value (use `NumberFlow` for animated digit transitions), and a chevron-right affordance that links to the evidence drill-down.
- Neutral surface unless all underlying evidence belongs to one subject.
- **Edge case — no data yet:** Show `–` (em dash) not `0%` or `0`, with a one-line explanation below.

**Weekly activity chart:**
- Accessible bar chart via `recharts`. Each bar = one day. Color: `primary` for days with activity, `bg-canvas` border for empty days.
- Include a text summary: *"Em đã học 4 ngày trong tuần này."*
- On hover/focus: tooltip showing exact count. `prefers-reduced-motion`: suppress bar grow animation, show static bars immediately.
- **Edge case — all zero:** Show a gentle empty state inside the chart area with copy *"Chưa có hoạt động tuần này."*

**Bài tập + Recent attempts (right column / bottom on mobile):**
- Bài tập: due-date sorted list of the student's assigned work. Past-due uses `state-error-ink` text color only — no red background, no alarm icon.
- Recent attempts: last 3–5 attempts, each showing subject, step type, verdict chip. Never show rank or comparison.
- **Edge case — no assignments:** Empty state with Lucide `ClipboardList` icon and copy *"Chưa có bài được giao."*

---

### 6.2 Open Curriculum catalog (`/lessons`)

Use a guided curriculum hierarchy instead of showing all chapter groups together:

1. **Subject selection:** show subjects that have released curriculum content; do not render “coming soon” placeholders as available catalog entries.
2. **Grade selection:** after choosing a subject, show only grades with released content, in ascending order. Show availability/coverage separately where a grade has no released material.
3. **Chapter/topic table of contents:** choosing a grade opens an ordered, scannable table of contents using stable curriculum taxonomy IDs. Each chapter/topic shows its lesson count and progress where available.
4. **Lesson list:** selecting a chapter/topic shows its lessons in official curriculum order, with breadcrumbs back to subject, grade, and table of contents.
5. **Lesson detail:** opening a lesson keeps the selected subject/grade/chapter context for return navigation and surfaces any matching foundational Lab.

Search and filters are secondary to this hierarchy. Grade ordering is deterministic ascending; chapter/topic/lesson ordering follows official curriculum order, not title sorting. Empty and unreleased states distinguish “not published yet” from “student has not completed it.”

**Lesson card:**
- Title (max 2 lines) · Subject chip · Type badge (Đọc / Video / Lab) · Progress ring or bar · One next-action button.
- Progress ring: `state-success` when 100%, `state-progress` when partial, empty ring when 0%. Never show a numeric score inside the ring — that is the drill-down's job.
- Released shared lessons are never locked by quiz, assignment, enrollment, or prior completion.
- **State: No results from filter** — Empty state with Lucide `SearchX` icon, copy *"Không tìm thấy bài học phù hợp."* and a reset-filters button.
- **State: No released lessons in this subject/grade** — Clear availability empty state; do not imply the student needs an assignment.

**Pagination / virtualization:** If lesson count exceeds 30, use `Virtuoso` for the list to avoid layout thrash.

---

### 6.3 Bài học and Bài tập detail

**Bài học page structure:**
1. Compact lesson title and breadcrumb, followed by one horizontal tab row.
2. Default tab is **Nội dung bài** with the learning objective and reading content. Other available tabs are **Video bài giảng** and **Tài liệu**; study cards are not a public lesson tab.
3. Show lesson-level basic exercises in the open learning context when present. Surface a matching foundational Lab as optional. Ebook access belongs in Tài liệu, not as a competing CTA in the lesson header.

The lesson title is the page H1. Main textbook sections use H2 and their subsections use H3, with readable paragraph and list spacing. Preserve Unicode science notation (for example subscripts, superscripts, Greek letters, degree signs, and arrows); do not guess at OCR corrections or silently rewrite equations.

The page uses distinct tabs for lesson content, video, and materials when available. Lesson/video/basic-exercise progress is persisted by the server. Students can revisit completed content. A study-card deck is available only from its Class Space.

The Assignment area lists explicitly assigned/due-dated/scored work only. Class Space lists teacher-posted resources for active, approved members; decks and study quizzes are unscored practice, while tests appear in Assignments only when explicitly assigned. Class Labs link to their class lesson and subject/grade/chapter/topic; they are distinct from foundational Labs in the public catalog.

**Video player:**
- Show the player only after the student opens the Video bài giảng tab. Do not autoplay.
- Show: neutral lesson video title, duration chip, playback-progress bar, and a transcript toggle only when an approved transcript is available.
- States: loading skeleton → playing → paused → completed (check mark on thumbnail) → unavailable (retry CTA + alternative text).
- Do not autoplay. Respect `prefers-reduced-motion` by pausing auto-advance.
- Official completion occurs at 90% watched or the media `ended` event. Seeking cannot reduce the recorded high-water mark. If video is unavailable, show the approved transcript/equivalent content and an explicit completion action; do not silently skip the step.

**Class Space study-card decks:**
- Decks are created by a teacher and appear only inside the relevant Class Space for active, approved members.
- One card at a time. Previous/Next buttons support keyboard arrows; show card count (for example, “3 / 8”).
- No streak counter, coin reward, or score-like progress bar. Respect `prefers-reduced-motion` by skipping flip animation.

**Class Space study and tests:**
- Only teachers create decks and study quizzes. Students may review cards or answer study quizzes for practice; these do not receive a score or grade.
- A scored test is a separate teacher-created activity and appears in Assignments only when explicitly assigned. Follow server-owned scoring, answer-key privacy, retry, and target rules. Test state never unlocks a shared resource or Lab.
- Teachers may author content directly, enter or import source data, or request AI-generated advanced extensions grounded in the linked lesson. AI content stays a draft until the teacher reviews and publishes it.

**Lab presentation:** foundational Labs are open when released; teacher-created Labs appear within their Class Space context. Do not render either as locked behind a quiz by default.

---

### 6.4 Lab and practical (3D / simulation workspace)

**Layout:** Full-bleed canvas area occupies ≥ 70% of viewport height. Control panel is a collapsible side drawer (desktop) or bottom sheet (mobile).

**Controls:**
- Every gesture (rotate, zoom, drag) has an equivalent visible button or slider.
- Keyboard: arrow keys for rotation, `+/-` for zoom, `Space` to reset.
- Touch: pinch-to-zoom and drag are supported; bottom sheet controls do not obscure the canvas or the verdict area.

**Loading:**
- Canvas area shows a skeleton that mirrors the final layout (not a spinner).
- If loading exceeds 4 s: show a progress message *"Đang tải mô phỏng…"*
- **Error:** Retry CTA inside the canvas area. Student-entered parameters must be preserved in component state across retries when technically feasible.

**Mobile bottom sheet (controls):**
- Triggered by a persistent floating button (Lucide `SlidersHorizontal`) that stays above the fold.
- Sheet animation: `translate-y` + `opacity` from bottom, 220ms, interruptible.
- Sheet does not cover the verdict area at the top of the canvas.

**Edge case — unsupported device / WebGL unavailable:** Show a non-canvas fallback message with a static diagram and a link to the text description of the experiment.

---

### 6.5 Challenge result and retry

**Verdict display:**
- Only render server-provided verdict string: **Đạt**, **Đạt một phần**, or **Cần luyện thêm**.
- Use verdict chips: `state-success` surface for Đạt, `state-progress` for Đạt một phần, `state-practice` for Cần luyện thêm. **Never use `state-error` / red for a wrong answer.**
- Reason/evidence block: server-provided plain text. If empty, show nothing — not a placeholder.

**Success path:**
- Brief celebratory feedback: verdict chip scales in (220ms `transform: scale` + `opacity`), then a single confetti particle burst (CSS only, 3 particles max, `prefers-reduced-motion` removes it entirely).
- Two CTAs: *"Xem chi tiết"* (secondary) and *"Tiếp tục"* (primary, advances to the next step in the lesson).

**Partial / needs-practice path:**
- Neutral coaching copy (*"Em đã thử 2 lần. Hãy điều chỉnh nhiệt độ thấp hơn rồi chạy lại."*) sourced from server where possible.
- Primary CTA: *"Thử lại"*. Secondary CTA: *"Xem hướng dẫn"* (links back to the Lab content step).
- Attempt counter: *"Lần thử thứ 3"* — factual, not judgmental.

**Edge case — server error on verdict submission:** Show a recoverable error banner (Lucide `AlertCircle`, `state-error` surface) with *"Không thể lưu kết quả. Thử lại không?"* and a retry button. Do not discard student input.

---

### 6.6 Progress and attempt history

**Page structure:** Stat summary row → Completion table by subject/chapter → Attempt history list.

**Stat summary row:** Same 3-card pattern as Dashboard stat row. Selecting a card scrolls to the relevant section below, it does not navigate away.

**Completion table:**
- Show foundational progress by Môn/khối with evidence columns: Nội dung bài · Video · Bài tập cơ bản · Lab nền tảng (nếu applicable). Show assigned-work status separately, including teacher-assigned exercise/test/Lab and whether it is achieved. The subject summary may show “Đạt mức cơ bản” when foundational requirements are complete, but stays “Chưa đạt” while any assignment for the student linked to that subject is actionable and unsubmitted, in progress, or not yet accepted by its evaluator. Preserve closed/archived assignments in history; remove them from the unmet rollup only when no longer actionable. Do not hide completed foundational activity or merge assignment evidence into its denominator.
- Class decks/study quizzes are unscored practice in Class Space. Test and custom-Lab evidence appears in assignment/class-assessment views when explicitly assigned.
- Each cell: check (complete), progress ring (partial), dash (not started).
- Sortable by subject or chapter. Use `@tanstack/react-table` if the table has more than 20 rows.
- **Edge case — no lessons started:** Show a full-width empty state with copy *"Em chưa bắt đầu bài học nào."* and a CTA to Dashboard.

**Attempt history list:**
- Each row: subject chip · step label · verdict chip · timestamp · *"Xem chi tiết"* link.
- Groupable by date (today, this week, earlier).
- No score percentage in the list — only the verdict chip.
- **Edge case — no attempts:** Friendly copy *"Chưa có lần thử nào được ghi lại."*

**Drill-down (selecting a metric or attempt):**
- Opens an inline accordion or a side panel (desktop) / bottom sheet (mobile).
- Shows contributing items with timestamps. Selecting an item navigates to that lesson step.
- Animation: `Virtuoso` for lists > 20 items; sheet/panel: 220ms `translate` + `opacity`. reveals the contributing items and timestamps.
- An attempt record shows its lab/challenge, result and verdict; it does not infer competency from score alone.

## 7. States and interaction quality

Every async surface needs loading, populated, empty and recoverable-error states. Controls have default, hover, focus-visible, pressed, disabled and loading states. All tap targets are at least 44×44px and keyboard order follows visual order.

| Interaction | Feedback | Duration |
| --- | --- | --- |
| Button press | opacity and 0.98 scale; no layout movement | 120ms |
| Card hover/focus | border and surface contrast increase | 160ms |
| Route/content replacement | opacity/transform crossfade that preserves page structure | 180–240ms |
| Bottom sheet | translate/opacity from bottom; interruptible | 220ms |
| Challenge success | verdict enters, then one small badge scale | 220ms |
| Chart data update | opacity/transform only; text values remain immediately readable | 180ms |

Use `transform` and `opacity` only for motion. Animate at most one or two meaningful elements per view. Respect `prefers-reduced-motion` by removing transforms and retaining immediate readable state.

## 8. Anti-patterns

- No generic purple-pink gradients, glassmorphism, glow, fake browser chrome, stock people or abstract 3D blobs.
- No emoji as structural icons; no all-caps marketing labels; no fabricated learning data.
- No red language or visual treatment that shames a student. Red is reserved for system errors.
- No score, percentage or completion ring without a source drill-down.
- No camera/gesture-only interaction and no implied real-world laboratory safety claim.

## 9. P0 validation checklist

- [ ] The Dashboard shows open lesson content, video, and basic exercises, with optional foundational Labs; Class Space decks and quizzes are separate and never appear as public pathway steps.
- [ ] One primary learning action per screen.
- [ ] All metrics link to evidence.
- [ ] The layout works at 390px, 768px, 1024px and 1440px without horizontal overflow.
- [ ] All controls work with keyboard and touch; no critical action relies on hover or gesture.
- [ ] Text and state colors meet WCAG AA and are not the sole state indicator.
- [ ] Motion respects reduced-motion and does not cause layout shift.
- [ ] AI Tutor/Hint is absent from P0 Student routes and screens.

## 10. Review artifact

Review the static dashboard mockup at [student-dashboard-p0-mockup.html](student-dashboard-p0-mockup.html). It demonstrates the desktop/mobile hierarchy and visual direction; it is not production UI or an implementation specification for data fetching.

> **Note on the current mockup:** The layout shown in the mockup is an early reference and may not reflect the current open-curriculum flow. Any implementation must follow §2b and §6.3: released shared learning content is not gated by assignment, progress, quiz, or Lab completion; foundational Labs are optional where available.

---

## 11. Library–component mapping (from `pick-ui-library`)

Use this table when building P0 Student screens. Do not introduce libraries outside this list without discussing first.

| Need | Library | Notes |
| --- | --- | --- |
| Unstyled accessible dialogs, popovers, dropdowns, tooltips (filter menus, lock tooltips, drill-down panels) | [`base-ui`](https://base-ui.com) | Handles focus trap and dismissal; style with Tailwind tokens |
| Toast / notification (save errors, unlock events) | [`Sonner`](https://sonner.emilkowal.ski) | One call site; do not build a custom toast |
| OTP / short-code input (if quiz has pin-style answer) | [`input-otp`](https://input-otp.rodz.dev) | Only if product requires it in P0 |
| Animated digit transitions (stat counters, attempt count) | [`NumberFlow`](https://number-flow.barvian.me) | Replaces manual `useState` counter animations |
| Enter/exit + layout animations (lock→unlock card, verdict chip scale, bottom sheet) | [`motion`](https://motion.dev) (Framer Motion) | Only for animated transitions > 120ms that CSS alone cannot handle cleanly. Simple hover/fade → plain CSS |
| Weekly activity bar chart | [`recharts`](https://recharts.org) | Static / interactive dashboard chart; tint with `primary` token |
| Attempt history list > 20 rows | [`Virtuoso`](https://virtuoso.dev) | Prevents layout thrash on long attempt histories |
| Completion table > 20 rows (sortable) | [`@tanstack/react-table`](https://tanstack.com/table) | Already likely in project; check `package.json` before adding |
| Shared filter/lesson state across sidebar + main content | [`zustand`](https://zustand.docs.pmnd.rs) | One store slice per feature; avoid prop-drilling subject/chapter filter |
| Conditional Tailwind class composition (step states, verdict chips) | [`cva`](https://cva.style) + [`clsx`](https://github.com/lukeed/clsx) | `cva` for typed variants (complete/partial/locked/error); `clsx` for ad-hoc overrides |
| Dark mode / theme switching | [`next-themes`](https://github.com/pacocoursey/next-themes) | Only if dark mode is added in a future sprint; not P0 |

**Audit rule:** Before building any component above from scratch, run:
```bash
cat package.json | grep -E '"(base-ui|sonner|number-flow|motion|recharts|virtuoso|@tanstack|zustand|cva|clsx|next-themes)"'
```
If a library is already installed, use it. If a competitor exists (e.g., `react-window` instead of `Virtuoso`), flag it but do not swap without discussion.
