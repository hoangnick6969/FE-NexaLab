# Teacher UX Definition — Increment B

**Status:** Role experience contract for Increment B. Business rules are aligned with the backend plan; visual details marked `[ASSUMPTION]` remain open to review.
**Product source:** [Backend PRD](../../../nexalab-be/docs/product/prd.md), FR-16–18 and QR-03/08/09; [Increment B/C plan](../../../nexalab-be/_bmad-output/planning-artifacts/increment-b-c-plan.md), decisions D1–D7, D11, D14–D21; [SRS summary](../../../nexalab-be/docs/reference/srs-summary.md), UC-CLS-01–04 and UC-CNT-01–07.
**Visual source:** Reuse the shared visual tokens and accessibility floor in [Student P0 UX Definition](08-STUDENT-P0-UX-DEFINITION.md), Section 4. This file defines Teacher-specific information and behavior.

## 1. Role and scope

Teacher is the classroom facilitator. The Teacher experience supports owned-class operations, membership, content preparation, assignments, and evidence review. Every class and student surface is scoped to classes owned by the signed-in teacher.

Included:

- Create, edit, archive, and manage owned classes; rotate or disable join codes.
- Review pending membership requests; approve, reject, or remove students.
- Browse released shared/baseline learning units and the teacher's own private content.
- Create private class content, clone locked/published content into a draft, and customize allowed quiz, test, activity, or simulation settings.
- Assign a lesson or independent lab to an owned class or approved student subset.
- Review source-linked learning evidence and deterministic “needs support” flags.
- In Increment C's parent-link flow, verify a guardian against school-held records and issue a one-time parent-link code.
- In Increment B2 only, apply or revoke a quiz-gate override for one student, assignment, and step with a reason.

Out of scope: editing another teacher's private content, changing a scientific model or verdict, editing a student's score/evidence, publishing private content into the shared library without its review gates, AI-generated content, and ranking students.

## 2. Experience principles

1. **Class context stays visible.** Show the active class in page headers and preserve it when moving between roster, assignments, and evidence.
2. **A number opens its evidence.** Counts, scores, attempts, due states, and support flags drill into the records and definitions that produced them.
3. **A teacher can act without guessing.** Show who will receive an assignment, what content version is used, and what a publish/archive action changes before confirmation.
4. **Use neutral, actionable language.** Support flags describe evidence and a next review action; they do not label a child as weak or rank students.
5. **Keep content governance visible.** Distinguish shared/baseline content from teacher-private drafts and show publication blockers before submission.

## 3. Information architecture

| Surface | Purpose | Main entry points |
| --- | --- | --- |
| Teacher home | Class activity, pending requests, upcoming work, and students needing review | Sign-in / primary navigation |
| Classes | Owned class list, lifecycle, join settings, roster | Main navigation |
| Class detail | Approved/pending/removed membership, assignments, class evidence | Class card or search |
| Content library | Browse released baseline/shared content and own private content | Main navigation / assignment flow |
| Content editor | Create private draft, clone a locked item, preview, publish to owned classes | Content library |
| Assignments | Create, review, update, and archive lesson or lab assignments | Main navigation / class detail |
| Learning evidence | Assignment-scoped class board and student evidence detail | Class detail / support flag |
| Parent links | Guardian verification, one-time code issuance, link status and unlink | Student row/detail; C1 delivery |
| Account | Profile and session actions | Profile menu |

**[ASSUMPTION] Responsive use:** desktop/tablet is the primary environment for roster and evidence review; mobile supports quick class checks, approvals, and assignment status. Use the existing responsive navigation pattern rather than introducing a second visual system.

## 4. Screen definitions

### 4.1 Teacher home

- Show owned classes, pending join requests, assignments due soon/overdue, and students with one or more support flags.
- Every count opens its filtered source list. Do not show a total “class performance” score or comparative ranking.
- Empty state explains how to create a class or assign the first lesson. Loading/error states retain the page structure and provide retry.
- Support flags are derived from D5: overdue incomplete required work; at least two failed quizzes without a pass; at least three practical attempts without a pass; or an open assignment with no qualifying activity for seven days. Each flag links to the underlying assignment/evidence and shows the rule that triggered it. No AI interpretation.

### 4.2 Classes and roster — SC-18 / class lifecycle

- Class list shows name, grade, active/archived state, approved/pending counts, join-code enabled state, and a direct action to open the roster.
- Class detail keeps tabs or filters for **Đã duyệt**, **Chờ duyệt**, and **Đã rời lớp**. Pending requests expose approve and reject actions; approved students can be removed with confirmation. Removed records preserve evidence but do not grant the teacher access to that student's old evidence.
- Class settings allow changing name/grade, join-code enabled state, approval requirement, and archiving. Archived classes remain available as read-only history, accept no new students or assignments, and close student access to their assignments. Do not show a restore/reactivation action unless a later SPEC defines that lifecycle. Rotating a code makes the previous code unusable and confirms the effect before completion.
- Archive confirmation states that student access to assignments closes immediately, no new students or assignments can be added, and enrollment/evidence history is retained. The UI never implies archive is a soft pause that students can ignore.
- Show the join code to teachers as one composite code they can share with students; do not expose internal locator/secret terminology or class IDs. Never place the code in URLs, analytics, or logs. Student-facing join failures remain generic.

### 4.3 Content library and editor — SC-22 / SC-23

- Filters follow curriculum structure: subject/domain, grade, chapter, topic, outcome, and release/private status. Show the outcome and prerequisites on each content card.
- Clearly label **Thư viện dùng chung** versus **Nội dung riêng của tôi**. Teachers can use released shared/baseline content and their own private content; they cannot mutate shared baseline content.
- A private draft captures author, outcome mapping, source/rights declaration, answer review, safety checklist, and media accessibility fields. The self-review checklist does not satisfy shared-content scientific/rights approval.
- Editing a published/locked item with assignments or evidence starts a clone flow. Explain that the clone receives new lesson/step/quiz IDs, reuses permitted asset references, keeps `clonedFromId`, starts as a draft, and does not inherit assignments or evidence.
- Preview shows the complete learning sequence and non-3D/equivalent-text fallback. A scored lab can only use an approved scientific model and golden cases; teacher controls stay within reviewed ranges.
- Publish is disabled until applicable checks pass. Show a checklist of missing items, not a generic “invalid content” error. Publishing a teacher-private item limits visibility to the teacher's owned classes.

### 4.4 Assignment flow — SC-24

1. Choose a released lesson, teacher-private lesson, or supported independent lab.
2. Choose an owned active class, then the whole approved roster or a selected approved subset.
3. Optionally set a due date; reject dates in the past. Preview recipients, content/version, and due date.
4. Confirm once. Show the number of students who received the assignment and a link to its class board.

The UI prevents assignment of drafts, pending/removed students, archived classes, and inaccessible content. Retry-safe creation must not make duplicate assignments. Updating targets or archiving an assignment must state that evidence is preserved. Overdue work remains actionable. If content is archived, students who already started may continue; those who have not started see the defined unavailable message.

### 4.5 Class board and student evidence — SC-25 / SC-26

- The default board is scoped to one assignment and its applicable class members. Lesson rows show ordered step states; lab rows show the server-derived verdict and attempt count.
- Every score/count/status opens the corresponding source evidence. The teacher may inspect answers and hint content only within the authorized owned-class evidence contract.
- A removed student is excluded from teacher evidence access, even when the student previously belonged to the class. An inaccessible or nonexistent evidence ID has the same not-found treatment.
- Support flags name the condition, threshold, and source evidence. The teacher may open the evidence, assign follow-up work, or take the explicitly supported action; flags never create an automated intervention.
- **B2 override surface:** show the quiz gate, target student/assignment/step, required reason, actor, timestamp, active/revoked state, and audit history. The action changes access only; it does not edit a score, attempt, verdict, or progress record. Confirmation explains the effect on that one pathway.

### 4.6 Guardian verification and parent-link code — C1 handoff

- From an eligible student record, the responsible teacher records that the guardian relationship was checked against school-held guardian records before issuing a code. Store the minimum verification actor/time metadata; do not upload or expose sensitive family documents in this screen.
- Issue a single-use code valid for seven days. The code is shown once to the authorized teacher for delivery through the guardian contact channel already held by the school; do not route it through the student's account. The screen explains expiry and that a new code is required after expiry, use, or revocation.
- Show relationship-link status as `pending` or `approved`; distinguish link state from unused/expired/revoked code state. Redemption creates pending and verified email plus current versioned consent promotes it atomically to approved, as defined by C1.
- Teacher may revoke the link. Confirm that the parent loses access on the next read; preserve the audit record. Do not offer a way to view the parent's password, email-verification secret, or the child's protected evidence from the link-management dialog.

## 5. State and interaction patterns

| State | Expected behavior |
| --- | --- |
| Loading | Skeletons preserve table/card geometry; never flash a false zero or empty state. |
| Empty class/content/evidence | Explain what is absent and offer one role-appropriate next action. |
| Pending membership/link | Label as waiting for the next required action; do not grant approved student or parent access early. |
| Save/publish/assignment failure | Retain entered values, identify the affected operation, and allow a safe retry; show success only after server confirmation. |
| Permission denied | Do not expose another teacher's class/content existence; return to an authorized surface with a neutral message. |
| Archive/remove/revoke | Confirmation names the access change and evidence-retention behavior. Destructive changes are auditable. |
| Stale data | Show refresh affordance and timestamp; do not silently apply a change to a stale roster or board. |

Use one confirmation dialog at a time. Mutations that can be retried use the documented idempotency behavior. Focus returns to the initiating control after dialogs close.

## 6. Voice and tone

Teacher copy is concise, respectful, and operational. Prefer “2 học sinh đang chờ duyệt” and “Quiz chưa đạt sau 2 lần thử” over evaluative labels such as “học sinh yếu.” State the next action and the evidence behind it. Confirm saved state only after server acknowledgement.

## 7. Accessibility and responsive floor

- Reuse Student P0 typography, color contrast, focus, touch-target, and reduced-motion requirements.
- All roster/table functions work by keyboard; provide a card/list equivalent on narrow screens without hiding actions behind hover.
- Status uses text and icon/shape, not color alone. Subject colors communicate subject only, never approval, urgency, score, or verdict.
- Charts and support flags have text summaries and accessible evidence links. Do not rely on hover-only explanations.
- At 390px, 768px, 1024px, and 1440px, the primary action and class context remain visible without horizontal page overflow. Large tables may scroll within a labelled region or transform into cards.

## 8. Acceptance checklist

- [ ] Teacher sees and mutates only owned classes and permitted content.
- [ ] Pending/approved/removed membership, class archive, assignment archive, and evidence retention are visually distinct.
- [ ] Teacher-private and shared/baseline content have different gates and destinations.
- [ ] Published/evidenced content is cloned before structural edits; historical IDs/evidence are not presented as inherited.
- [ ] Assignment preview names the recipients and immutable content version before confirmation.
- [ ] Every progress number and support flag drills into source evidence and its rule.
- [ ] Quiz-gate override appears only in B2 and is scoped, reasoned, auditable, and reversible.
- [ ] Parent-link issuance visibly requires teacher relationship verification and uses a one-time, seven-day code.
- [ ] Empty, loading, denied, stale, and recoverable-error states are specified.
- [ ] Keyboard, touch, contrast, reduced-motion, and responsive requirements match Student P0.

## 9. Open decisions carried forward

- Q-DATA-01/Q-DATA-02: final media budget and first flagship topic selection.
- Q-DATA-03/Q-DATA-04: content production capacity and measurable baseline coverage acceptance.
- Q-DATA-01/Q-C2-03/Q-C2-04: production media budgets and per-template scientific ranges remain release gates.
- C1 defines the parent-link transition and read aggregation. The teacher screen must display the issued show-once code, verification metadata, pending/approved state, and revocation behavior from that SPEC.

These open items do not authorize the UX to change the underlying business rules; final SPECs remain authoritative for API behavior and acceptance evidence.
