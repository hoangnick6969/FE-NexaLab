# Parent UX Definition — Increment C1

**Status:** Role experience contract for the read-only Parent experience. Business rules and exact progress aggregation are finalized in the C1 SPEC; approved Vietnamese consent copy remains a pilot release gate.
**Product source:** [Backend PRD](../../../nexalab-be/docs/product/prd.md), FR-19, QR-03/08/09; [Increment B/C plan](../../../nexalab-be/_bmad-output/planning-artifacts/increment-b-c-plan.md), decisions D8, D11, D14 and Q-C1-01–02/Q-C2-02; [SRS summary](../../../nexalab-be/docs/reference/srs-summary.md), UC-AUTH-06 and UC-PAR-01.
**Visual source:** Reuse the shared visual tokens and accessibility floor in [Student P0 UX Definition](08-STUDENT-P0-UX-DEFINITION.md), Section 4. This file defines Parent-specific information and behavior.

## 1. Role and scope

Parent is a read-only observer for children explicitly linked to that account. The product does not infer or establish a family relationship from an email address: the responsible teacher first verifies the guardian against school-held records, then issues a one-time code. Parent email verification proves control of the mailbox only.

Included:

- Parent self-registration, email verification, and required consent before an active link is available.
- Redeem a one-time link code that expires after seven days.
- View a list of linked children and the current status of each link (`pending` or `approved`). One parent may have multiple children; a child may have multiple linked parents.
- Read the approved child progress fields: completed work, remaining steps, latest/best quiz score, practical attempt count/verdict, and activity time.
- Open a limited evidence detail for an assignment/attempt, without answer keys or private practical state.
- Unlink a child; after unlinking, the parent loses access on the next read. Teacher and admin may also revoke a link under the plan.

Out of scope: editing assignments or learning records, viewing another child's existence, parent-teacher messaging, weekly/monthly reports, seeing answers, lab state, hint contents, or using email verification as proof of parentage.

## 2. Experience principles

1. **Make the relationship status clear.** Explain who verified the relationship, what the parent must do next, and whether progress access is active.
2. **Show learning facts without grading the child as a person.** Progress is descriptive and tied to assignments and evidence; no comparison, ranking, streak, or predictive label.
3. **Protect the child's work.** Show only the approved progress summary and permitted evidence. Never expose answer keys, hint content, or raw lab state.
4. **Keep each action simple.** The primary parent tasks are link a child, understand current progress, and unlink if needed.
5. **No hidden access assumptions.** Only an `approved` link opens child progress; pending or revoked links do not reveal progress data.

## 3. Information architecture

| Surface | Purpose | Main entry points |
| --- | --- | --- |
| Registration/sign-in | Create or access an adult Parent account | Public auth routes |
| Email verification and consent | Complete account prerequisites for a link | Registration / link flow |
| Link a child | Redeem a teacher-issued one-time code | Children list / empty state |
| Children | View approved links and pending link setup | Parent home |
| Child progress | Read assignment progress and latest permitted activity | Child card |
| Activity/evidence detail | Understand a count, score, attempt, or verdict | Progress row / metric |
| Link settings | Unlink a child and see status | Child header / account settings |

**[ASSUMPTION] Mobile-first:** parents are likely to check progress on a phone, so the default is a single-column responsive web flow. Tablet and desktop may widen the children list but do not add extra analytics panels.

## 4. Screen definitions

### 4.1 Registration and account verification

- Parent registration is self-service only for the `PARENT` role. Email verification is required before an active child link can be used; consent text and version must be recorded according to Q-C2-02.
- The registration form states that creating an account does not itself link a child or verify the relationship.
- Use neutral recovery copy so failed sign-in or reset does not reveal whether an email exists. Session expiry routes to sign-in without losing a code the parent has not submitted, where safe.

### 4.2 Redeem a child-link code — SC-28

- A single short form accepts the teacher-issued code. Explain that the code is one-time, expires after seven days, and must be received directly from the responsible teacher through the guardian contact channel held by the school.
- The code is never requested from the student account. Do not ask the parent to upload relationship documents or disclose extra personal data in this MVP flow.
- Errors for invalid, expired, already-used, or revoked codes use a consistent, non-enumerating message and do not reveal whether a student account exists.
- Once accepted, create **Đang chờ** (`pending`); promote atomically to **Đã liên kết** (`approved`) when verified email and the current versioned consent exist. A code that was validly redeemed may complete activation after its original code expiry.
- A safe retry must not consume the code twice or create duplicate links. If the result is uncertain after a network failure, provide a status refresh rather than asking the parent to repeatedly submit the code.

### 4.3 Children list — SC-27

- Show only children whose link is approved, plus the parent's own pending link setup with no child progress data.
- Each child card identifies the child using the minimum approved display fields, shows link status, last activity if available, and one action: **Xem tiến độ** for approved links or the next required setup step for pending links.
- Multiple children are separate cards with clear names and no blended aggregate score across siblings.
- Empty state explains that the parent needs a code from the child's responsible teacher; it does not invite the student to create or send a code.
- If a teacher/admin revokes a link, remove progress access on the next read and display a neutral “Liên kết không còn hoạt động” state if the product retains a non-sensitive link history.

### 4.4 Child progress — SC-29

- Start with the child's name and the selected linked relationship, then show assignment-scoped progress, not a school-wide dashboard.
- Display only fields authorized by D8: completed work, remaining steps, latest/best quiz score, practical attempt count and verdict, and activity time.
- Every count or score opens the permitted supporting record and explains the metric. Use the C1 SPEC rules: latest quiz by `(createdAt,id)`, best score with newest tie-break, assignment practical count/latest verdict/any-pass, and last activity from persisted step progress or quiz/practical evidence only. Do not combine records across assignments.
- Do not display question text/answer key, student's selected answers, hint text/conversation, raw `labState`, or private teacher notes. A practical detail may show the attempt number, recorded time, and server verdict only where that is part of the approved read contract.
- No weekly or monthly report, performance prediction, class comparison, peer ranking, streak, or automated “needs help” conclusion.

### 4.5 Unlink and access changes

- Parent can unlink a child from the child's link settings. Confirmation states that access ends immediately on the next read and does not delete the child's learning records.
- A teacher or admin revocation is reflected the next time data is fetched. Do not leave stale child progress visible after a 403 or link revocation; clear protected data from the view and return to the children list.
- Re-linking uses a new teacher-issued code. Do not reactivate a revoked code or silently reuse an old link.
- For any unlinked or nonexistent child ID, show the same generic access-denied outcome. Do not reveal account existence.

## 5. State and interaction patterns

| State | Expected behavior |
| --- | --- |
| Loading | Preserve the page skeleton and label which child is loading; do not briefly show a prior child's data. |
| No linked children | Explain the teacher-issued code path and provide one action to enter a code. |
| Pending link | Show next requirement (email verification or consent) and no child learning data. |
| Approved link | Show current permitted progress and the link-management action. |
| Code invalid/expired/used | Use consistent copy and offer a safe route to request a new code from the responsible teacher. |
| Offline/network error | Preserve the unsubmitted code when safe; mark displayed progress stale and offer refresh. Never imply a mutation succeeded without server confirmation. |
| Link revoked/access denied | Clear protected child data, show a generic message, and return to the children list. |
| Empty progress | Distinguish “no assignment yet” from a load failure; avoid fabricated zero scores or completion percentages. |

Only one confirmation dialog is open at a time. Touch and keyboard users can complete code entry, navigation, evidence details, and unlink without hover-only actions.

## 6. Voice and tone

Use calm, factual Vietnamese. State the child-specific evidence and the date/time basis plainly. Avoid pressure, blame, or predictions. Example: “Bài Khoa học tự nhiên: còn 2 bước. Quiz gần nhất: 3/5 câu đúng.” Avoid “Con đang tụt lại” or “Con cần cố gắng hơn.”

## 7. Accessibility and responsive floor

- Reuse Student P0 typography, focus, touch-target, contrast, and reduced-motion requirements.
- Single-column reading order on mobile; child name and link status stay visible when viewing progress. Avoid dense tables and horizontal scrolling.
- Status includes text and a non-color visual cue. Subject color communicates subject only, never risk, link status, or score.
- Screen readers announce link status, child heading, score/count label, and stale/error state. Do not announce private child data from a prior selection after navigation.
- At 390px, 768px, 1024px, and 1440px, there is no horizontal page overflow; code entry and all primary actions remain usable with keyboard and touch.

## 8. Acceptance checklist

- [ ] Parent registration, email verification, consent, code redemption, and link activation are visually separate steps.
- [ ] A pending link never reveals progress; only an approved link does.
- [ ] Code expiry/use/revocation errors do not reveal student existence and safe retries do not create duplicate links.
- [ ] Multiple linked children remain separate; no sibling aggregate score is shown.
- [ ] Parent can view only the approved progress fields and permitted evidence detail.
- [ ] Answers, hint contents, raw practical state, and weekly/monthly reports are absent.
- [ ] Unlink/revocation clears protected data on the next read; relinking requires a new code.
- [ ] Loading, empty, pending, denied, stale, and recoverable-error states are specified.
- [ ] Keyboard, touch, contrast, reduced-motion, and responsive requirements match Student P0.

## 9. Open decisions carried forward

- Exact Vietnamese consent wording and approved version/content hash before pilot activation.
- Production email delivery configuration and operational ownership for failed verification mail.

These are release inputs. The C1 data model and UI may be implemented first with a clearly marked development consent version and dev mailbox.
