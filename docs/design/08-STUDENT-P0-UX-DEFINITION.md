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

**Learning loop:** **Bài học (đọc → video → thẻ ghi nhớ) → Bài tập (kiểm tra nhỏ → thực hành/lab → thử thách) → Thử lại → Tiến độ**.

The lesson library may show an optional subject-level external ebook/reference link configured by an admin. Label it as an external publisher/source link; opening it does not imply NexaLab hosts or has reproduction rights to the material.

- No leaderboard, streak, badge economy, coins or gems in P0.
- No Student AI Tutor/Hint in P0. It is P1 and must not appear in Student P0 navigation, CTA copy or dashboard cards.
- No mascot implementation in P0. The referenced three-mascot idea remains an identity exploration, not a P0 requirement. Use a small line-art science illustration in the Continue card; it is decorative support, not a product character.
- Every percentage, score or count links to its underlying lesson, quiz or practical attempts. A number without a drill-down is not shown as an achievement metric.
- No real-world safety implication: simulations are educational models, not real experiments.

## 2b. Gated learning flow (critical ordering constraint)

> This section corrects a gap in the P0 layout: **simulation and challenge are not the entry point — they are unlocked after the student completes the foundational reading/video/quiz sequence.**

The canonical student experience separates learning materials from assigned practice. The server-owned order remains:

```
[BÀI HỌC: Nội dung đọc] → [Video] → [Thẻ ghi nhớ]
         ↓
[BÀI TẬP: Bài kiểm tra nhỏ]
         ↓ (only after quiz passed at 50% in Increment A)
[Thực hành / Lab / Mô phỏng 3D]
         ↓ (only after practical completed)
[Thử thách]
```

**Gating rules for UI:**
- A locked step shows a greyed-out card with a lock icon (Lucide `Lock`) and a tooltip explaining the prerequisite. It is **never hidden**, only disabled — so the student can see what is coming.
- The CTA on the Dashboard Continue card always points to the **next unlocked step**, not the simulation, unless simulation is the next step.
- The Bài học page owns reading, video, and study cards. The separate Bài tập area owns the quiz and assigned practical work; it shows a clear link back when required Bài học steps remain incomplete.
- Quiz remains the first Bài tập step and the server-calculated 50% pass gate for lab. Renaming the student-facing areas does not change Assignment, LessonStep, or progress ownership in the API/database.
- The Lab screen must not be reachable directly from the navigation rail unless the student has previously accessed it through a lesson that unlocked it.

**Implication for Dashboard:** the "large Continue card" CTA text must reflect current step — e.g., *"Xem video 6 phút"*, *"Làm bài kiểm tra nhỏ"*, *"Bắt đầu thực hành"* — not a generic label like "Tiếp tục học".

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
| Left navigation rail | Trang chủ, Bài học, Lab, Bài tập, Tiến độ, Tài khoản |
| Stat row | Tiến độ bài được giao, bài còn lại, lượt thử lab; neutral unless each metric belongs to a real subject |
| Main column | Large Continue card, current lesson pathway (content, video, study cards, quiz), then related practical work and weekly activity |
| Right column | Assignments and due dates, recent attempts |

### Tablet and mobile

On tablet, move the right column below the main content. On mobile, show one vertical column in this order: stats, Continue card, assignments, recent attempts, remaining content.

The bottom navigation has at most five destinations: **Trang chủ, Bài học, Lab, Bài tập, Tiến độ**. Tài khoản is available from the top-right profile menu; it is not a sixth tab. Reserve bottom padding so the tab bar never covers scrollable content.

## 6. Screen definitions

### 6.1 Dashboard

**Layout (Desktop):** Left nav rail → Stat row (3 cards) → [Continue card + Lesson pathway] || [Assignments + Recent attempts]

**Continue card:**
- Background: current subject's pastel token (`subject-*` surface).
- Content: subject chip, lesson title (max 2 lines, ellipsis), progress indicator (e.g., "Bước 2/4"), one primary CTA button using `action` token.
- CTA label reflects the exact next step per section 2b: *"Xem video 6 phút"*, *"Làm bài kiểm tra nhỏ"*, *"Bắt đầu thực hành"*.
- Decorative line-art science illustration (right side, desktop only). Not a mascot, not interactive.
- **Edge case — no active lesson:** Show a neutral card with CTA *"Chọn bài học để bắt đầu"* linking to Lesson list. No illustration placeholder needed.

**Lesson pathway strip (directly below Continue card):**
- Horizontal scroll on mobile; inline row on desktop.
- Each step = icon + label + completion badge (check or lock). Locked steps use `text-muted` and Lucide `Lock` icon at 1.75px stroke.
- Steps: Nội dung · Video · Thẻ ghi nhớ · Kiểm tra nhỏ · (Lab if unlocked) · (Thử thách if unlocked).
- Tapping a completed step navigates to it; tapping a locked step shows an inline tooltip explaining the prerequisite — it does not navigate.

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

### 6.2 Lesson list

**Filters:** Subject chip row (horizontal scroll) + Chapter dropdown + Topic dropdown. Chips use `action` token when selected, neutral when not. Selecting a chip does not navigate; it filters inline.

**Lesson card:**
- Title (max 2 lines) · Subject chip · Type badge (Đọc / Video / Lab) · Progress ring or bar · One next-action button.
- Progress ring: `state-success` when 100%, `state-progress` when partial, empty ring when 0%. Never show a numeric score inside the ring — that is the drill-down's job.
- **State: Locked lesson** — show lock icon, muted text. Card is still rendered but not clickable; tooltip on hover explains prerequisite.
- **State: No results from filter** — Empty state with Lucide `SearchX` icon, copy *"Không tìm thấy bài học phù hợp."* and a reset-filters button.
- **State: No lessons assigned at all** — Friendly empty state pointing to the teacher or back to Dashboard.

**Pagination / virtualization:** If lesson count exceeds 30, use `Virtuoso` for the list to avoid layout thrash.

---

### 6.3 Bài học and Bài tập detail

**Bài học page content order (fixed, top-to-bottom):**
1. Learning objective block (collapsible after first read)
2. Reading content / materials
3. Video player
4. Study cards

The page has distinct content and video views, and a clear transition to Bài tập. Reading/video/card completion is persisted by the server. Students can revisit completed content.

**Bài tập page content order (fixed, top-to-bottom, per section 2b):**
1. Quiz (visible while locked; available after required Bài học steps)
2. Lab / Practical (locked until quiz passed — see 2b)
3. Challenge (locked until lab completed — see 2b)

The Bài tập list shows due dates and assigned lessons. Opening an item shows its quiz/practical steps and their server-owned lock states. If the Bài học steps are incomplete, the page links directly back to that lesson and explains what remains.

**Video player:**
- Show: title, duration chip, playback-progress bar, transcript toggle.
- States: loading skeleton → playing → paused → completed (check mark on thumbnail) → unavailable (retry CTA + alternative text).
- Do not autoplay. Respect `prefers-reduced-motion` by pausing auto-advance.
- Official completion occurs at 90% watched or the media `ended` event. Seeking cannot reduce the recorded high-water mark. If video is unavailable, show the approved transcript/equivalent content and an explicit completion action; do not silently skip the step.

**Study cards:**
- One card at a time. Previous/Next buttons with keyboard support (arrow keys). Card count: "3 / 8".
- No streak counter, no coin reward, no progress bar that implies a score.
- **Edge case — only 1 card:** Hide Previous/Next, show a completion check instead.
- Flip animation on `transform: rotateY` only; respect `prefers-reduced-motion` by skipping flip.

**Quiz:**
- Increment A uses multiple choice only, rendered question-by-question. Short-answer/manual grading is deferred.
- Show question number and total: *"Câu 3 / 5"*.
- Submit button disabled until an answer is selected. No partial saves shown to the student.
- **Outcome state:** Score ≥50% → the server unlocks Lab (animate lock → unlock, 220ms opacity/transform after confirmation). Not passed → show coach copy and a *"Thử lại"* button. Never show a score percentage as an achievement or unlock from client state alone.

**Locked-step card (Lab or Challenge):**
- Greyed surface, lock icon, label *"Hoàn thành [previous step] để mở khoá."*
- When unlocked: animate card border from muted to `primary` (160ms), then present CTA.

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
- Columns: Bài học · Nội dung · Quiz · Lab · Thử thách.
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

- [ ] The Dashboard shows content, video, study cards and quiz before related practical work; lab is a differentiator within a complete learning platform.
- [ ] One primary learning action per screen.
- [ ] All metrics link to evidence.
- [ ] The layout works at 390px, 768px, 1024px and 1440px without horizontal overflow.
- [ ] All controls work with keyboard and touch; no critical action relies on hover or gesture.
- [ ] Text and state colors meet WCAG AA and are not the sole state indicator.
- [ ] Motion respects reduced-motion and does not cause layout shift.
- [ ] AI Tutor/Hint is absent from P0 Student routes and screens.

## 10. Review artifact

Review the static dashboard mockup at [student-dashboard-p0-mockup.html](student-dashboard-p0-mockup.html). It demonstrates the desktop/mobile hierarchy and visual direction; it is not production UI or an implementation specification for data fetching.

> **Note on the current mockup:** The layout shown in the mockup is an early reference. It does not yet reflect the gated learning flow defined in §2b — notably, the Lab/Simulation entry is shown at the same visual level as reading content, which is incorrect. Any new implementation must follow the ordered sequence in §2b and §6.3.

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
