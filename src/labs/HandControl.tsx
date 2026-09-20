import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { ErrorBox } from "../ui";
export function HandControl({
  onGesture,
}: {
  onGesture: (g: { rotation: number; explode: number; pinch: boolean }) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onGesture);
  callback.current = onGesture;
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  async function start() {
    setError("");
    setBusy(true);
    let cancelled = false;
    let stream: MediaStream | null = null;
    let tracker: any = null;
    let frame = 0;
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      tracker?.close();
      if (video.current) video.current.srcObject = null;
    };
    cleanup.current = stop;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      if (cancelled) {
        stop();
        return;
      }
      const { FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks("/vision/wasm");
      tracker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/vision/hand_landmarker.task" },
        runningMode: "VIDEO",
        numHands: 1,
      });
      if (cancelled) {
        stop();
        return;
      }
      const v = video.current!;
      v.srcObject = stream;
      await v.play();
      setActive(true);
      setStatus("Đưa một bàn tay vào khung hình");
      let last = 0;
      let lastTime = -1;
      let wasPinched = false;
      const loop = (time: number) => {
        if (cancelled) return;
        if (
          time - last > 100 &&
          v.readyState >= 2 &&
          v.currentTime !== lastTime
        ) {
          last = time;
          lastTime = v.currentTime;
          const h = tracker.detectForVideo(v, time).landmarks[0];
          if (h) {
            const pinch = Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y) < 0.06;
            callback.current({
              rotation: (h[0].x - 0.5) * 3,
              explode: Math.max(0, Math.min(2, (1 - h[0].y) * 2)),
              pinch: pinch && !wasPinched,
            });
            wasPinched = pinch;
            setStatus(
              pinch
                ? "Chụm ngón: chọn bộ phận tiếp theo"
                : "Di chuyển tay: xoay và tách mô hình",
            );
          }
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } catch (e: any) {
      stop();
      setActive(false);
      setError(
        e.name === "NotAllowedError"
          ? "Camera chưa được cho phép. Em vẫn có thể dùng đầy đủ bằng chuột và thanh trượt."
          : "Không mở được camera hoặc mô hình nhận dạng. Em có thể tiếp tục dùng chuột.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hand-control">
      <div className="button-row">
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            active
              ? (cleanup.current(), setActive(false), setStatus(""))
              : start()
          }
        >
          {active ? <CameraOff size={15} /> : <Camera size={15} />}{" "}
          {busy ? "Đang mở…" : active ? "Tắt camera" : "Bật điều khiển cử chỉ"}
        </button>
        <span className="tiny muted">
          Chỉ xử lý trên thiết bị. Không ghi, lưu hoặc gửi hình ảnh.
        </span>
      </div>
      <video
        ref={video}
        muted
        playsInline
        style={{
          display: active ? "block" : "none",
          width: 160,
          borderRadius: 8,
          transform: "scaleX(-1)",
          marginTop: 12,
        }}
      />
      <p className="tiny muted">{status}</p>
      <ErrorBox error={error} />
    </div>
  );
}
