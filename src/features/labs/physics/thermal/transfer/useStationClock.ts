/**
 * Simulated clock of one station: whole seconds, play and pause, speed ×1/×10/×30, skip ahead, reset.
 * The models are pure functions of the elapsed seconds, so skipping and playing give the same bench.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type StationClock = {
  seconds: number;
  running: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  skip: (seconds: number) => void;
  reset: () => void;
};

export function useStationClock(maxSeconds: number, initialSpeed: number): StationClock {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const carry = useRef(0);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      carry.current += ((now - last) / 1000) * speed;
      last = now;
      const whole = Math.floor(carry.current);
      if (whole <= 0) return;
      carry.current -= whole;
      setSeconds((current) => Math.min(maxSeconds, current + whole));
    }, 100);
    return () => window.clearInterval(timer);
  }, [running, speed, maxSeconds]);

  useEffect(() => { if (seconds >= maxSeconds) setRunning(false); }, [seconds, maxSeconds]);

  const play = useCallback(() => { if (seconds < maxSeconds) setRunning(true); }, [seconds, maxSeconds]);
  const pause = useCallback(() => setRunning(false), []);
  const skip = useCallback((delta: number) => setSeconds((current) => Math.min(maxSeconds, current + delta)), [maxSeconds]);
  const reset = useCallback(() => { setRunning(false); setSeconds(0); carry.current = 0; }, []);
  return { seconds, running, speed, play, pause, setSpeed, skip, reset };
}
