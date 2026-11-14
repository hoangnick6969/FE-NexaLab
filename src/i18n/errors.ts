import { getLocale } from ".";

/**
 * English copy for server error codes (D-ACC-04: the API keeps Vietnamese messages with stable codes).
 * A function receives the server message when it carries detail worth keeping (lists, names, limits).
 */
const detail = (summary: string) => (server: string) => {
  const rest = server.includes(":") ? server.slice(server.indexOf(":") + 1).trim() : "";
  return rest ? `${summary}: ${rest}` : summary;
};

const en: Record<string, string | ((server: string) => string)> = {
  // Generic fallbacks by status class
  VALIDATION_FAILED: "Some of the information is not valid",
  UNAUTHENTICATED: "Please sign in again",
  FORBIDDEN: "You do not have permission to do this",
  NOT_FOUND: "Not found",
  CONFLICT: "This already exists",
  PAYLOAD_TOO_LARGE: "The upload is too large",
  RATE_LIMITED: "Too many attempts; please try again shortly",
  DEPENDENCY_FAILURE: "The service is temporarily unavailable; please try again",
  INTERNAL_ERROR: "Something went wrong on the server",
  STEP_LOCKED: "This practice step is not available yet",
  // Accounts and auth
  INVALID_CREDENTIALS: "The username, email or password is incorrect",
  TEMPORARY_PASSWORD_EXPIRED: "The temporary password has expired. Ask your teacher for a new one.",
  CURRENT_PASSWORD_INCORRECT: "The current password is incorrect",
  USER_DISABLED: "This account is disabled",
  USER_EXISTS: "That email or username is already in use",
  USERNAME_TAKEN: "That username is already in use.",
  ADULT_NOT_FOUND: "No adult account found; students get a new password from their teacher",
  STUDENT_NOT_FOUND: "No student account has that username",
  PASSWORD_CHANGE_REQUIRED: "Change your temporary password before continuing",
  RESET_TOKEN_INVALID: "This password reset link is invalid, used or expired",
  DELIVERY_FAILED: "The email could not be sent; try again later",
  PROFILE_NAME_LOCKED: "Student names are managed by the teacher",
  AVATAR_KEY_INVALID: "The image file is not valid",
  AVATAR_NOT_UPLOADED: "The image has not finished uploading",
  AVATAR_TOO_LARGE: "Profile pictures can be at most 2 MB",
  AVATAR_TYPE_INVALID: "Only PNG, JPEG or WebP images are accepted",
  SELF_ACTION_FORBIDDEN: "You cannot disable the account you are signed in with",
  LAST_ACTIVE_ADMIN: "The last active administrator cannot be disabled or deleted",
  DELETE_INELIGIBLE: "This account still has history or owned items; disable it instead of deleting",
  OWNERSHIP_RESOLUTION_REQUIRED: "Choose what happens to every class, lesson and file this account owns",
  INVALID_NEW_OWNER: "The new owner must be an active teacher or administrator",
  PARENT_LINK_REQUIRED: "No parent link yet",
  LINK_CODE_INVALID: "This link code is not valid",
  IDEMPOTENCY_KEY_INVALID: "The request key is not valid",
  IDEMPOTENCY_KEY_REUSED: "This request key was already used for different content",
  INVALID_CURSOR: "The page cursor is not valid",
  CONFIRMATION_REQUIRED: "Please confirm this action",
  // Classes and enrollment
  CLASS_ACCESS_DENIED: "This is not your class, or the class does not exist",
  CLASS_ARCHIVED: "This class is archived",
  CLASS_NOT_FOUND: "Class not found",
  CLASS_NAME_TAKEN: "You already have an active class with this name",
  CLASS_RESOURCE_ACCESS_DENIED: "You cannot access this class resource",
  // Teacher AI (TAI-01)
  IDEMPOTENCY_KEY_REQUIRED: "This action needs a request key; please try again",
  AI_PROVIDER_NOT_CONFIGURED: "The AI service is not configured",
  AI_QUOTA_EXCEEDED: "You have reached the AI usage limit; try again later",
  AI_JOB_NOT_CANCELLABLE: "This AI request has already finished",
  AI_JOB_NOT_REVIEWABLE: "This AI request is not ready for review",
  AI_REVIEW_INCOMPLETE: "Decide every item and keep at least one before creating the draft",
  AI_JOB_ALREADY_MATERIALIZED: "A draft was already created from this AI request",
  AI_EDIT_INVALID: "The edited item is not valid",
  // TAI-06 AI lab challenges
  AI_NO_APPROVED_MODELS: "No practice lab has reviewed parameter ranges yet",
  LESSON_NOT_EDITABLE: "This lesson is no longer an editable private draft (it may be published, shared or already have results)",
  AI_PROPOSAL_NO_LONGER_VALID: "This suggestion is no longer valid because the parameter ranges or the model list changed; send a new request",
  AI_JOB_ALREADY_APPLIED: "A suggestion from this AI request was already applied",
  // TAI-05 AI credits
  AI_ESTIMATE_CHANGED: "The estimated AI credits changed; check the new amount and confirm again",
  AI_CREDITS_INSUFFICIENT: "There are not enough AI credits for this request",
  CREDIT_BALANCE_NEGATIVE: "This adjustment would make the available credits negative",
  PRICING_NOT_ACTIVE: "AI credits have no active price yet; ask an administrator",
  PRICING_NOT_DRAFT: "Only a draft price can be activated",
  PRICING_NOT_ACTIVE_VERSION: "Only the active price can be retired",
  // TAI-02 AI rubric suggestions
  AI_ASSESSMENT_DISABLED: "AI grading suggestions are turned off; grade by hand",
  SUGGESTION_MISMATCH: "The grade does not match the AI suggestion; save it as edited or grade by hand",
  JOIN_CODE_INVALID: "This class code is not valid or has expired",
  JOIN_CODE_COLLISION: "A new code could not be created; please try again",
  JOIN_RATE_LIMITED: "Too many wrong codes; please wait before trying again",
  ENROLLMENT_NOT_FOUND: "This student is not in the class",
  ENROLLMENT_REMOVED: "The student was removed from the class; enrol them again by username or let them use the class code",
  NO_RECIPIENTS: "The class has no approved students to receive work yet",
  INVALID_TARGETS: "The student list has duplicates",
  // Assignments and tests
  ASSIGNMENT_NOT_FOUND: "Assigned work not found",
  ASSIGNMENT_ACCESS_REVOKED: "This work is no longer assigned to you",
  ASSIGNMENT_ARCHIVED: "This work is archived; its due date cannot change",
  ASSIGNMENT_DUPLICATE: "This work (same content version) is already assigned to the same students with the same due date",
  ASSIGNMENT_PATHWAY_REQUIRED: "Official progress is only recorded inside an assigned pathway",
  ASSIGNMENT_QUIZ_REQUIRED: "The quiz is only available inside an assigned pathway",
  INVALID_ASSIGNMENT_CONTEXT: "The assignment reference is not valid",
  ACTIVE_ASSIGNMENTS_WARNING: "Some students have already started this work",
  DUE_DATE_REQUIRED: "Assigned tests need a due date",
  DUE_DATE_IN_PAST: "The due date must be in the future",
  DUE_DATE_NOT_LATER: "The new due date must be after the current one and after now",
  DEADLINE_REVISION_STALE: "The due date just changed; reload before changing it again",
  TEST_ASSIGNMENT_IMMUTABLE: "The students and due date of an assigned test cannot be edited directly",
  NOT_A_TEST_ASSIGNMENT: "This assigned work is not a test",
  TEST_ANSWERS_INVALID: "Answer each question exactly once with one of its options",
  TEST_ANSWER_INVALID: "The correct answer must point to an option with text",
  LATE_REASON_REQUIRED: "A late submission needs a reason",
  LATE_SUBMISSION_NOT_PENDING: "This submission is no longer waiting for a decision",
  LATE_SUBMISSION_SUPERSEDED: "The student submitted again; review the latest submission",
  SUBMISSION_NOT_FOUND: "Submission not found",
  // Learning
  LESSON_NOT_FOUND: "Lesson not found",
  LESSON_NOT_AVAILABLE: "The linked lesson is not available",
  LESSON_ACCESS_DENIED: "You can only edit your own lessons",
  LESSON_STRUCTURE_LOCKED: "This lesson is assigned or has results; make a copy to change its content, questions or lab",
  INVALID_LESSON_PATHWAY: "A published lesson needs a valid resource for every step",
  CURRICULUM_LESSON_NOT_FOUND: "Lesson not found",
  CURRICULUM_STEP_NOT_FOUND: "Lesson step not found",
  CURRICULUM_EXERCISE_NOT_FOUND: "Exercise not found",
  CHAPTER_UNAVAILABLE: "The chapter does not exist or is archived",
  STEP_ACTION_INVALID: "This action does not apply to the lesson step",
  EXERCISE_ANSWERS_INVALID: "The answers are not valid",
  QUIZ_ANSWERS_INVALID: "The answers do not match the quiz",
  HINT_CONTEXT_CHANGED: "The attempt changed; ask for a hint again",
  HINT_NOT_LATEST_ATTEMPT: "Ask for a hint on your latest attempt",
  HINT_NOT_NEEDED: "You have already completed this, so no hint is needed",
  HINT_RATE_LIMITED: "You asked for many hints in a few minutes; try again shortly",
  VIDEO_EVIDENCE_INVALID: "Video progress could not be confirmed",
  LAB_NOT_FOUND: "Lab not found",
  LAB_LOCKED: "Complete and pass the assigned test to open the lab",
  EBOOK_NOT_FOUND: "Textbook not found",
  EBOOK_ANNOTATION_NOT_FOUND: "Note not found",
  EVIDENCE_NOT_FOUND: "Record not found",
  OVERRIDE_IN_USE: "This cannot be revoked because later steps already have evidence",
  // Content and administration
  BASELINE_READ_ONLY: "Only administrators create lessons for the shared library",
  PRIVATE_CONTENT_READ_ONLY: "Administrators do not edit a teacher's private content; use an admin action with a reason",
  NOT_SHARED_LIBRARY: "A teacher's private lessons use the self-review checklist",
  CONTENT_ARCHIVED: "This content is archived",
  CONTENT_NOT_PUBLISHED: "This content is not published",
  CONTENT_QUARANTINED: "This lesson is quarantined; an administrator must release it first",
  INVALID_CONTENT_TRANSITION: "That status change is not allowed",
  PUBLISH_BLOCKED: detail("Cannot publish yet. Missing"),
  NO_MODEL_TO_REVIEW: "This lesson has no lab model to review",
  RANGE_APPROVAL_REQUIRED: "The model's parameter ranges are not approved yet",
  MODEL_ADMIN_ONLY: "Only administrators manage 3D assets",
  SUBJECT_EXISTS: "A subject with this code already exists",
  SUBJECT_IN_USE: "The subject still has lessons, labs or chapters and cannot be deleted",
  CHAPTER_EXISTS: "A chapter with this code already exists",
  TOPIC_EXISTS: "A topic with this code already exists",
  OUTCOME_EXISTS: "A learning outcome with this code already exists",
  OUTCOME_IN_USE: "This learning outcome is in use; archive it and create a new code instead of editing it",
  INVALID_OUTCOME: "An activity refers to a learning outcome that is not in the curriculum map",
  SOURCE_EXISTS: "A source with this key already exists",
  SOURCE_NOT_READY: detail("The source cannot be enabled yet"),
  PACK_NOT_DRAFT: "Only draft packs can be activated; used packs are immutable",
  VERSION_NOT_DRAFT: "Only draft versions can be activated; used versions are immutable",
  RELEASE_NOT_APPLIED: "The release has been withdrawn",
  SIM_PACK_INVALID: detail("The simulation pack is not valid"),
  INVALID_SIMULATION_CONFIG: detail("The simulation settings are not valid"),
  INVALID_CHALLENGE_PARAMS: detail("The challenge parameters are not valid"),
  GOLDEN_CASE_MISMATCH: "A reference case did not give the expected result on the server",
  INVALID_PART: "That part does not exist",
  PARTS_REQUIRED: "Some upload parts are missing",
  // Files and uploads
  ASSET_NOT_FOUND: "File not found",
  FILE_REQUIRED: "Choose a file to upload",
  ASSET_ACCESS_DENIED: "You do not manage this file",
  ASSET_KIND_MISMATCH: "A new version must be the same kind of file",
  ASSET_NOT_ACTIVE: "The file is quarantined or archived",
  ASSET_NOT_READY: "The file has no checked version ready yet",
  ASSET_QUARANTINED: "The lesson refers to a quarantined file",
  ASSET_REFERENCED: "A lesson or lab still uses this file; it cannot be deleted",
  ASSET_TOO_LARGE: "The file is too large",
  ASSET_TYPE_REJECTED: "Only PDF, PNG, JPEG, MP4, WebVTT or GLB files with the matching extension are accepted",
  ASSET_VALIDATION_FAILED: detail("The file is not valid"),
  ASSET_VERSION_NOT_FOUND: "File version not found",
  ASSET_VERSION_NOT_PENDING: "This file version is no longer waiting for upload",
  ALREADY_QUARANTINED: "The file is already quarantined",
  NOT_QUARANTINED: "The file is not quarantined",
  SHARED_ASSET_REQUIRES_ADMIN_RIGHTS: "Shared library files are uploaded by administrators with a licence and source",
  CC_BY_NC: "Non-commercial licensed material cannot be used here",
  SIGNATURE_INVALID: "The upload link is invalid or has expired",
  TOO_MANY_PENDING_UPLOADS: "Too many unfinished uploads; finish or cancel some first",
  UPLOAD_INCOMPLETE: "The file has not arrived yet; upload it before finishing",
  UPLOADS_NOT_CONFIGURED: "File uploads are not configured on this server",
  // Class resource CSV import
  IMPORT_CSV_INVALID: "The CSV has an unclosed quotation mark",
  IMPORT_FORMAT_UNSUPPORTED: "Only UTF-8 CSV files are supported",
  IMPORT_HEADERS_INVALID: detail("The CSV columns must be, in order"),
  IMPORT_ROW_LIMIT: "The CSV has too few or too many rows",
  IMPORT_TOO_LARGE: "The CSV must be at most 1 MB",
  IMPORT_VALIDATION_FAILED: "The file has errors; nothing was created",
  RESOURCE_NOT_DRAFT: "Only drafts can be published",
  RESOURCE_VERSION_IMMUTABLE: "A published version cannot be edited directly; create a new draft",
};

const byStatus: Record<number, string> = { 400: "VALIDATION_FAILED", 401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 429: "RATE_LIMITED", 503: "DEPENDENCY_FAILURE" };

/** Message shown for an API error in the current language. */
export function apiErrorMessage(status: number, code: string, serverMessage: string | undefined, details?: unknown) {
  const vi = getLocale() === "vi";
  if (code === "NETWORK_ERROR") return vi ? "Không thể kết nối. Kiểm tra mạng rồi thử lại." : "Cannot connect. Check your connection and try again.";
  if (status >= 500) return vi ? "Máy chủ đang gặp sự cố. Vui lòng thử lại sau." : "The server is temporarily unavailable. Please try again shortly.";
  if (status === 429) return vi ? "Bạn đã thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại." : "Too many attempts. Please wait a moment and try again.";
  if (code === "VALIDATION_FAILED") {
    const fields = Array.isArray(details) ? details.map((item) => item?.path) : [];
    if (fields.includes("username")) return usernameGuidance();
    if (fields.includes("password")) return vi ? "Mật khẩu tối đa 128 ký tự; mật khẩu mới cần ít nhất 12 ký tự." : "Passwords can contain at most 128 characters; a new password needs at least 12.";
    if (fields.includes("currentPassword")) return vi ? "Nhập mật khẩu hiện tại để tiếp tục." : "Enter your current password to continue.";
    if (fields.includes("email")) return vi ? "Nhập địa chỉ email hợp lệ." : "Enter a valid email address.";
    return vi ? "Kiểm tra lại thông tin đã nhập rồi thử lại." : "Check the information you entered and try again.";
  }
  if (getLocale() === "vi") return serverMessage ?? "Không thể kết nối máy chủ";
  // Unknown codes fall back to their status class; a body-less gateway error means the server was not reached.
  if (!serverMessage && code.startsWith("HTTP_") && status >= 500) return "Cannot reach the server";
  const entry = en[code] ?? en[byStatus[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_FAILED")];
  return typeof entry === "function" ? entry(serverMessage ?? "") : entry;
}

export function usernameGuidance() {
  return getLocale() === "vi"
    ? "Tên đăng nhập gồm 3–32 ký tự: chữ cái, số, dấu chấm, gạch ngang hoặc gạch dưới; bắt đầu và kết thúc bằng chữ cái hoặc số, không có khoảng trắng bên trong."
    : "Use 3–32 letters, numbers, dots, hyphens or underscores. Start and end with a letter or number, with no spaces inside.";
}
