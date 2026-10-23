import { ArrowRight, Atom } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, useAuth } from "../../lib/api";
import { queryClient } from "../../app/query-client";
import { Badge, ErrorBox } from "../../components/ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    badge: "Xác minh email",
    working: "Đang xác minh email…",
    done: "Email của bạn đã được xác minh.",
    linkedHint: "Liên kết với con được kích hoạt khi bạn cũng đã chấp thuận theo dõi tiến độ.",
    failed: "Không xác minh được email. Hãy gửi lại email xác minh từ trang Tiến độ.",
    continue: "Tiếp tục",
  },
  en: {
    badge: "Email verification",
    working: "Verifying your email…",
    done: "Your email is verified.",
    linkedHint: "Links to your child activate once you have also consented to progress tracking.",
    failed: "The email could not be verified. Send a new verification email from the Progress page.",
    continue: "Continue",
  },
});

/** Opens the one-time link mailed to a parent (`/?verifyEmail=<token>`); works signed in or out. */
export function EmailVerification({ token }: { token: string }) {
  const t = text();
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [error, setError] = useState<unknown>(null);
  // The token is single-use, so the request must not repeat when React re-runs effects.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    api("/auth/email/verify", "POST", { token })
      .then(() => {
        setState("done");
        void queryClient.invalidateQueries();
      })
      .catch((e) => {
        setError(e);
        setState("failed");
      });
  }, [token]);
  // A full navigation drops the token from the address bar and history.
  const leave = () => window.location.replace(useAuth.getState().user ? "/progress" : "/login");
  return (
    <div className="login">
      <section className="login-form">
        <div>
          <div className="brand">
            <Atom /> NexaLab.
          </div>
          <Badge>{t.badge}</Badge>
          <p role="status">{state === "working" ? t.working : state === "done" ? t.done : t.failed}</p>
          {state === "done" && <p className="tiny muted">{t.linkedHint}</p>}
          {state === "failed" && <ErrorBox error={error} />}
          {state !== "working" && (
            <button className="primary wide" onClick={leave}>
              {t.continue} <ArrowRight size={17} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
