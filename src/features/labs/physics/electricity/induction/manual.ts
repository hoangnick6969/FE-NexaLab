import { useEffect, useRef, type MutableRefObject } from "react";

// Direct manipulation: the student drags the magnet along its rail or turns the crank.
// The drag only decides *when* a checkpoint action happens; the current sign always
// comes from the pinned model through `EmManualSigns`.

export type EmDragKind = "magnet" | "crank";

/** Model current sign (+1 = D1, -1 = D2, 0 = none) for each way the student can move the apparatus. */
export type EmManualSigns = { toward: number; away: number; cw: number; ccw: number };

export type EmManualState = {
  /** Live drag; `value` is the magnet travel (0 OUTSIDE … 1 INSIDE) or the signed crank angle (radians, + = clockwise from above). */
  drag: { kind: EmDragKind; value: number } | null;
  /** True while a drag runs or the apparatus settles after one; the stage then draws these values. */
  active: boolean;
  travel: number;
  rotor: number;
  level: number;
};

export type EmManual = {
  state: MutableRefObject<EmManualState>;
  can: Record<EmDragKind, boolean>;
  start: (kind: EmDragKind) => boolean;
  update: (value: number) => void;
  end: () => void;
  /** The student pressed a part that cannot move right now; the activity explains why. */
  blocked: (kind: EmDragKind) => void;
};

// Speeds at which the illustration shows a full deflection: the automatic push and crank turn.
const FULL_TRAVEL_SPEED = 1.2; // travel units per second
const FULL_CRANK_SPEED = (Math.PI * 2) / 2.4; // radians per second
const TURN = Math.PI * 2;

const damp = (from: number, to: number, lambda: number, dt: number) => from + (to - from) * (1 - Math.exp(-lambda * dt));

/**
 * Drives `EmManualState` from drag input. `onCommit` fires once when the magnet reaches the far end
 * of its stroke ("push"/"pull") or the crank completes a turn ("cw"/"ccw").
 */
export function useManualDrive({ restTravel, signs, can, onCommit, onDragChange, onBlocked }: {
  restTravel: number;
  signs: EmManualSigns;
  can: Record<EmDragKind, boolean>;
  onCommit: (move: "push" | "pull" | "cw" | "ccw") => void;
  onDragChange: (dragging: boolean) => void;
  onBlocked: (kind: EmDragKind) => void;
}): EmManual {
  const state = useRef<EmManualState>({ drag: null, active: false, travel: restTravel, rotor: 0, level: 0 });
  const live = useRef({ restTravel, signs, can, onCommit, onDragChange, onBlocked });
  live.current = { restTravel, signs, can, onCommit, onDragChange, onBlocked };
  const frame = useRef(0);
  const committed = useRef(false);
  const startTravel = useRef(restTravel);

  if (!state.current.active) state.current.travel = restTravel;

  const loop = () => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(.05, Math.max(.001, (now - last) / 1000));
      last = now;
      const s = state.current;
      const { restTravel: rest, signs: model } = live.current;
      let target = 0;
      if (s.drag?.kind === "crank") {
        const previous = s.rotor;
        s.rotor = s.drag.value;
        const omega = (s.rotor - previous) / dt;
        const sign = omega >= 0 ? model.cw : model.ccw;
        target = sign * Math.sin(Math.abs(s.rotor)) * Math.min(1, Math.abs(omega) / FULL_CRANK_SPEED);
      } else {
        const previous = s.travel;
        s.travel = s.drag ? s.drag.value : damp(s.travel, rest, 7, dt);
        if (!s.drag && Math.abs(s.travel - rest) < .002) s.travel = rest;
        const velocity = (s.travel - previous) / dt;
        const sign = velocity >= 0 ? model.toward : model.away;
        target = Math.abs(velocity) < .02 ? 0 : sign * Math.min(1, Math.abs(velocity) / FULL_TRAVEL_SPEED);
      }
      s.level = damp(s.level, target, 14, dt);
      if (!s.drag && s.travel === rest && Math.abs(s.level) < .01) {
        s.level = 0;
        s.active = false;
        frame.current = 0;
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const stop = () => {
    if (!state.current.drag) return;
    state.current.drag = null;
    live.current.onDragChange(false);
  };

  return {
    state,
    can,
    start: (kind) => {
      if (!live.current.can[kind] || state.current.drag) return false;
      committed.current = false;
      startTravel.current = live.current.restTravel;
      const s = state.current;
      if (!s.active) { s.travel = live.current.restTravel; s.level = 0; }
      if (kind === "crank") s.rotor = 0;
      s.drag = { kind, value: kind === "magnet" ? s.travel : 0 };
      s.active = true;
      live.current.onDragChange(true);
      loop();
      return true;
    },
    update: (value) => {
      const drag = state.current.drag;
      if (!drag || committed.current) return;
      if (drag.kind === "magnet") {
        drag.value = Math.min(1, Math.max(0, value));
        const goal = startTravel.current < .5 ? 1 : 0;
        if (Math.abs(drag.value - goal) < .03) {
          committed.current = true;
          drag.value = goal;
          live.current.onCommit(goal === 1 ? "push" : "pull");
          stop();
        }
        return;
      }
      drag.value = value;
      if (Math.abs(value) >= TURN) {
        committed.current = true;
        drag.value = Math.sign(value) * TURN;
        live.current.onCommit(value > 0 ? "cw" : "ccw");
        stop();
      }
    },
    end: stop,
    blocked: (kind) => live.current.onBlocked(kind),
  };
}

/** Shortest signed difference between two angles. */
export function angleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= TURN;
  while (delta < -Math.PI) delta += TURN;
  return delta;
}
