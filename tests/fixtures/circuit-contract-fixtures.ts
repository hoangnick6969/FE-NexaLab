/**
 * Frozen Contract Fixtures for Epic A4 (Circuit Lab Challenge & Retry)
 * Sourced directly from _bmad-output/specs/spec-student-verified-lab-challenge-retry/SPEC.md
 */

export const mockCircuitChallenge = {
  challengeId: "circuit_001",
  labId: "circuit",
  title: "Lắp mạch điện thắp sáng đèn LED",
  instruction:
    "Sử dụng nguồn 9V, điện trở thích hợp (từ 220Ω đến 1000Ω), công tắc và đèn LED để tạo thành một mạch điện kín an toàn.",
  targetObjective: "Dòng điện qua LED từ 0.01A đến 0.03A để LED sáng an toàn.",
  defaultComponents: [
    { id: "b1", type: "battery", value: 9 },
    { id: "r1", type: "resistor", value: 330 },
    { id: "l1", type: "led" },
    { id: "s1", type: "switch", closed: true },
  ],
};

export const mockAttemptPassed = {
  attempt: {
    id: "att_circuit_passed_001",
    assignmentId: "pilot-a-lesson-assignment",
    lessonStepId: "step-lab-circuit",
    challengeId: "circuit_001",
    labState: {
      nodes: [
        { id: "b1", type: "battery", value: 9 },
        { id: "r1", type: "resistor", value: 330 },
        { id: "l1", type: "led" },
        { id: "s1", type: "switch", closed: true },
      ],
      edges: [
        { source: "b1", target: "r1" },
        { source: "r1", target: "l1" },
        { source: "l1", target: "s1" },
        { source: "s1", target: "b1" },
      ],
    },
    simulationResult: {
      closed: true,
      current_A: 0.021,
      ledLit: true,
      overcurrent: false,
      message: "Mạch kín. Đèn LED sáng an toàn với dòng điện 21.2mA.",
    },
    verdict: "passed" as const,
    durationMs: 15400,
    attemptNumber: 1,
    simulationModelVersion: "1.0.0",
    createdAt: new Date().toISOString(),
  },
  retryGuidance: null,
};

export const mockAttemptNeedsPractice = {
  attempt: {
    id: "att_circuit_np_002",
    assignmentId: "pilot-a-lesson-assignment",
    lessonStepId: "step-lab-circuit",
    challengeId: "circuit_001",
    labState: {
      nodes: [
        { id: "b1", type: "battery", value: 9 },
        { id: "r1", type: "resistor", value: 330 },
        { id: "l1", type: "led" },
        { id: "s1", type: "switch", closed: false },
      ],
      edges: [
        { source: "b1", target: "r1" },
        { source: "r1", target: "l1" },
      ],
    },
    simulationResult: {
      closed: false,
      current_A: 0,
      ledLit: false,
      overcurrent: false,
      message: "Mạch đang hở. Cần nối kín đường dẫn từ cực dương về cực âm.",
    },
    verdict: "needs_practice" as const,
    durationMs: 8200,
    attemptNumber: 1,
    simulationModelVersion: "1.0.0",
    createdAt: new Date().toISOString(),
  },
  retryGuidance:
    "Mạch điện chưa khép kín. Em hãy kiểm tra xem công tắc đã đóng chưa và các dây dẫn đã nối thành một vòng kín từ nguồn về nguồn hay chưa nhé.",
};

export const mockAttemptPartial = {
  attempt: {
    id: "att_circuit_partial_003",
    assignmentId: "pilot-a-lesson-assignment",
    lessonStepId: "step-lab-circuit",
    challengeId: "circuit_001",
    labState: {
      nodes: [
        { id: "b1", type: "battery", value: 9 },
        { id: "r1", type: "resistor", value: 10 },
        { id: "l1", type: "led" },
        { id: "s1", type: "switch", closed: true },
      ],
      edges: [
        { source: "b1", target: "r1" },
        { source: "r1", target: "l1" },
        { source: "l1", target: "s1" },
        { source: "s1", target: "b1" },
      ],
    },
    simulationResult: {
      closed: true,
      current_A: 0.7,
      ledLit: true,
      overcurrent: true,
      message: "Dòng điện quá lớn (700mA). Đèn LED có nguy cơ bị cháy đứt.",
    },
    verdict: "partial" as const,
    durationMs: 12000,
    attemptNumber: 2,
    simulationModelVersion: "1.0.0",
    createdAt: new Date().toISOString(),
  },
  retryGuidance:
    "Mạch đã kín nhưng điện trở 10Ω quá nhỏ làm dòng điện vượt mức an toàn của LED. Em hãy tăng điện trở (ví dụ 330Ω) để bảo vệ đèn nhé.",
};
