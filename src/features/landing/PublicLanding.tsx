import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  Atom,
  BookOpen,
  CheckCircle2,
  Eye,
  FlaskConical,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { chooseLocaleBeforeSignIn, defineText, getLocale } from "../../i18n";
import { Hero3DStage } from "./Hero3DStage";

const text = defineText({
  vi: {
    home: "NexaLab, trang chủ",
    nav: "Điều hướng trang giới thiệu",
    how: "Cách học",
    sims: "Phòng lab",
    subjectsNav: "Môn học",
    signIn: "Đăng nhập",
    enter: "Vào phòng lab",
    heroLine: "Khoa học không nằm trên trang sách.",
    heroEmphasis: "Khoa học nằm ở lần em tự tay thử.",
    heroBody: "Phòng thí nghiệm ảo và mô hình 3D môn Khoa học tự nhiên THCS (Lớp 8–9). Nơi học sinh tự do đóng mạch điện, bóc tách mô hình mắt và thử nghiệm phản ứng hóa học mà không sợ làm sai.",
    start: "Bắt đầu khám phá",
    seeHow: "Xem các phòng lab",
    circuitDemoTitle: "Bàn thực hành trực tiếp",
    switchClose: "Đang đóng công tắc",
    switchOpen: "Đang mở công tắc",
    circuitOn: "Mạch kín: Đèn LED 20 mA sáng an toàn (9V · 350Ω)",
    circuitOff: "Mạch hở: Không có dòng điện chạy qua",
    circuitHint: "Chạm hoặc click vào công tắc để đóng mạch",
    labsTitle: "Ba câu hỏi khơi gợi tò mò",
    labsSubtitle: "Mỗi phòng lab bắt đầu bằng một hiện tượng thực tế mà sách giáo khoa khó diễn tả hết.",
    labs: [
      {
        subject: "Vật lý",
        question: "Làm sao để thắp sáng một bóng đèn an toàn?",
        desc: "Tự tay nối nguồn pin 9V, chọn điện trở 350Ω, đo dòng 20 mA và kiểm chứng định luật Ôm.",
        tag: "Mạch điện 2D",
        action: "Khám phá phòng Vật lý",
      },
      {
        subject: "Sinh học",
        question: "Ánh sáng đi vào mắt em như thế nào?",
        desc: "Mô hình giải phẫu 3D xoay 360°, bóc tách củng mạc, giác mạc và quan sát đường đi của ánh sáng.",
        tag: "Mô hình mắt 3D",
        action: "Khám phá phòng Sinh học",
      },
      {
        subject: "Hóa học",
        question: "Tại sao hai chất trong suốt lại đổi màu xanh?",
        desc: "Thay đổi số mol, quan sát biến đổi màu sắc và kết tủa tức thì trong môi trường phản ứng an toàn.",
        tag: "Phản ứng hóa học",
        action: "Khám phá phòng Hóa học",
      },
    ],
    howTitle: "Học qua từng lần thử",
    howSubtitle: "Học sinh hiểu sâu bản chất khi được tự tay quan sát, làm thử và rút kinh nghiệm.",
    steps: [
      {
        num: "01",
        title: "Quan sát hiện tượng",
        desc: "Nắm vững lý thuyết cốt lõi qua bài đọc ngắn, video và hình ảnh trực quan trước khi bắt đầu.",
      },
      {
        num: "02",
        title: "Tự tay thử & sửa",
        desc: "Kéo thả linh kiện, điều chỉnh thông số và quan sát kết quả tức thì. Sai sót là một phần của khám phá.",
      },
      {
        num: "03",
        title: "Thấu hiểu thực chất",
        desc: "Server tính toán kết quả khoa học chính thức, gợi ý từng mức để em tự tìm ra câu trả lời.",
      },
    ],
    ctaTitle: "Sẵn sàng cho thí nghiệm đầu tiên?",
    ctaBody: "Miễn phí cho mọi học sinh THCS. Không cần cài đặt, không lo rủi ro hóa chất, chạy mượt mà ngay trên trình duyệt.",
    ctaAction: "Bắt đầu học ngay",
    footerMotto: "Chạm vào khoa học. Học qua từng lần thử.",
    footerScope: "Khoa học tự nhiên THCS · Lớp 8–9",
  },
  en: {
    home: "NexaLab, home",
    nav: "Welcome page navigation",
    how: "How it works",
    sims: "Virtual Labs",
    subjectsNav: "Subjects",
    signIn: "Sign in",
    enter: "Enter Lab",
    heroLine: "Science is not just on the page.",
    heroEmphasis: "It starts the moment you try.",
    heroBody: "Interactive virtual labs and 3D models for Lower Secondary Natural Sciences (Grades 8–9). Where students build circuits, explore eye anatomy, and run chemical reactions safely.",
    start: "Start exploring",
    seeHow: "Explore labs",
    circuitDemoTitle: "Live Workbench Demo",
    switchClose: "Switch is closed",
    switchOpen: "Switch is open",
    circuitOn: "Closed circuit: 20 mA LED lights safely (9V · 350Ω)",
    circuitOff: "Open circuit: No current flowing",
    circuitHint: "Click or tap the switch to close the circuit",
    labsTitle: "Three Questions Sparking Curiosity",
    labsSubtitle: "Every lab starts with a real-world phenomenon that textbooks struggle to capture.",
    labs: [
      {
        subject: "Physics",
        question: "How do you light a bulb without burning it?",
        desc: "Connect a 9V battery, select a 350Ω resistor, measure 20 mA, and discover Ohm's law.",
        tag: "2D Circuit Lab",
        action: "Enter Physics Lab",
      },
      {
        subject: "Biology",
        question: "How does light enter the human eye?",
        desc: "Rotate a 360° 3D anatomy model, dissect the sclera and cornea, and trace light rays to the retina.",
        tag: "3D Eye Model",
        action: "Enter Biology Lab",
      },
      {
        subject: "Chemistry",
        question: "Why do two clear liquids turn deep blue?",
        desc: "Adjust molar quantities, observe color transitions and precipitates in a safe reaction engine.",
        tag: "Reaction Engine",
        action: "Enter Chemistry Lab",
      },
    ],
    howTitle: "Learn Through Every Attempt",
    howSubtitle: "Students truly understand when they observe, experiment, and adjust on their own.",
    steps: [
      {
        num: "01",
        title: "Observe the Phenomenon",
        desc: "Grasp core principles through concise reading, video, and visual guides before experimenting.",
      },
      {
        num: "02",
        title: "Experiment & Adjust",
        desc: "Drag components, tune parameters, and see instant reactions. Making mistakes is how you learn.",
      },
      {
        num: "03",
        title: "Deep Understanding",
        desc: "The server computes authentic scientific outcomes with progressive hints to guide discovery.",
      },
    ],
    ctaTitle: "Ready for your first experiment?",
    ctaBody: "Free for lower secondary students. Zero setup, zero chemical risks, runs smoothly in your browser.",
    ctaAction: "Start Learning Now",
    footerMotto: "Touch science. Learn through every attempt.",
    footerScope: "Natural science · Lower secondary",
  },
});
const t = text();

/* ---------- motion helpers ---------- */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stagger = (delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: delay } },
});
const wordVariant = {
  hidden: { y: "112%" },
  show: { y: 0, transition: { duration: 0.95, ease: EASE } },
};

/** Word-by-word masked reveal. Splits on spaces only, so Vietnamese diacritics are never broken. */
function Words({ text: value }: { text: string }) {
  const words = value.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span className="word-mask">
            <m.span className="word" variants={wordVariant}>{word}</m.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function useFinePointer() {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);
  return ref;
}

function Magnetic({ children, disabled }: { children: ReactNode; disabled?: boolean | null }) {
  const fine = useFinePointer();
  const x = useSpring(0, { stiffness: 220, damping: 16, mass: 0.35 });
  const y = useSpring(0, { stiffness: 220, damping: 16, mass: 0.35 });
  const onMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (disabled || !fine.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <m.span className="magnetic" style={{ x, y }} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </m.span>
  );
}

/* ---------- page ---------- */

export function PublicLanding() {
  const reduce = useReducedMotion();
  const locale = getLocale();
  const otherLocale = locale === "vi" ? "en" : "vi";

  const heroRef = useRef<HTMLElement>(null);

  /* header: glass + progress */
  const { scrollY, scrollYProgress: pageProgress } = useScroll();
  const navBg = useTransform(scrollY, [0, 72], [0, 1]);
  const progressX = useSpring(pageProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  /* hero: scroll exit */
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroCopyY = useTransform(heroP, [0, 1], [0, reduce ? 0 : -36]);
  const heroCopyOpacity = useTransform(heroP, [0, 0.75], [1, reduce ? 1 : 0.2]);

  const rise = (delay = 0) =>
    reduce ? {} : {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.85, ease: EASE, delay },
    };
  const reveal = reduce ? {} : {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.8, ease: EASE },
  };
  const headingProps = (delay = 0) => ({
    variants: stagger(delay),
    initial: reduce ? (false as const) : ("hidden" as const),
    whileInView: "show" as const,
    viewport: { once: true, amount: 0.6 },
  });

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="public-site">
        <header className="site-header">
          <m.i className="site-header-bg" aria-hidden="true" style={{ opacity: navBg }} />
          <div className="site-nav">
            <Link className="site-brand" to="/" aria-label={t.home}>
              <span><Atom size={22} /></span>
              NexaLab<span className="site-brand-dot">.</span>
            </Link>
            <nav aria-label={t.nav}>
              <a href="#phong-lab">{t.sims}</a>
              <a href="#cach-hoc">{t.how}</a>
            </nav>
            <div className="site-nav-actions">
              <Link className="site-login" to="/login">{t.signIn}</Link>
              <Link className="site-nav-cta" to="/login">{t.enter} <ArrowRight size={15} /></Link>
              <button type="button" className="site-language" lang={otherLocale} onClick={() => chooseLocaleBeforeSignIn(otherLocale)}>
                {locale === "vi" ? "EN" : "VI"}
              </button>
            </div>
          </div>
          <m.i className="site-progress" aria-hidden="true" style={{ scaleX: progressX }} />
        </header>

        <main>
          {/* ---------------- HERO ---------------- */}
          <section className="landing-hero" ref={heroRef}>
            <div className="landing-hero-copy">
              <m.div style={{ y: heroCopyY, opacity: heroCopyOpacity }}>
                <m.h1 variants={stagger(0.12)} initial={reduce ? false : "hidden"} animate="show">
                  <Words text={t.heroLine} /><br />
                  <em><Words text={t.heroEmphasis} /></em>
                </m.h1>
                <m.p {...rise(0.4)}>{t.heroBody}</m.p>
                <m.div className="landing-actions" {...rise(0.55)}>
                  <Magnetic disabled={reduce}>
                    <Link className="landing-primary" to="/login">{t.start} <ArrowRight size={18} /></Link>
                  </Magnetic>
                  <a className="landing-secondary" href="#phong-lab">{t.seeHow} <ArrowDown size={16} /></a>
                </m.div>
              </m.div>
            </div>

            {/* Interactive 3D Lab Stage (Physics, Biology, Chemistry + Floating Relics) */}
            <Hero3DStage />
          </section>

          {/* ---------------- 3 LABS: CURIOSITY SHOWCASE ---------------- */}
          <section className="landing-apple-labs" id="phong-lab">
            <div className="apple-section-header">
              <m.h2 {...headingProps(0.05)}>
                <Words text={t.labsTitle} />
              </m.h2>
              <m.p {...reveal}>{t.labsSubtitle}</m.p>
            </div>

            <div className="apple-labs-grid">
              {t.labs.map((lab: any, idx: number) => {
                const LabIcon = idx === 0 ? Zap : idx === 1 ? Eye : FlaskConical;
                const labClass = idx === 0 ? "theme-physics" : idx === 1 ? "theme-biology" : "theme-chemistry";
                return (
                  <m.div key={lab.subject} className={`apple-lab-card ${labClass}`} {...reveal}>
                    <div className="apple-card-top">
                      <span className="lab-discipline-pill">{lab.tag}</span>
                      <span className="lab-icon-circle"><LabIcon size={20} /></span>
                    </div>
                    <div className="apple-card-main">
                      <span className="apple-lab-subject">{lab.subject}</span>
                      <h3 className="apple-lab-question">{lab.question}</h3>
                      <p className="apple-lab-desc">{lab.desc}</p>
                    </div>
                    <div className="apple-card-bottom">
                      <Link to="/login" className="apple-lab-cta">
                        <span>{lab.action}</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </m.div>
                );
              })}
            </div>
          </section>

          {/* ---------------- HOW IT WORKS ---------------- */}
          <section className="landing-how-apple" id="cach-hoc">
            <div className="apple-section-header">
              <m.h2 {...headingProps(0.05)}>
                <Words text={t.howTitle} />
              </m.h2>
              <m.p {...reveal}>{t.howSubtitle}</m.p>
            </div>

            <div className="how-cards-row">
              {t.steps.map((step: any, i: number) => {
                const StepIcon = i === 0 ? BookOpen : i === 1 ? Sparkles : CheckCircle2;
                return (
                  <m.div key={step.num} className="how-apple-card" {...reveal}>
                    <div className="how-step-header">
                      <span className="how-index">{step.num}</span>
                      <span className="how-icon-wrapper"><StepIcon size={20} /></span>
                    </div>
                    <h3 className="how-step-title">{step.title}</h3>
                    <p className="how-step-desc">{step.desc}</p>
                  </m.div>
                );
              })}
            </div>
          </section>

          {/* ---------------- FINAL CTA ---------------- */}
          <m.section className="landing-apple-final" {...reveal}>
            <div className="apple-final-box">
              <m.h2 {...headingProps(0.05)}><Words text={t.ctaTitle} /></m.h2>
              <p>{t.ctaBody}</p>
              <Magnetic disabled={reduce}>
                <Link className="landing-apple-btn" to="/login">
                  {t.ctaAction} <ArrowRight size={18} />
                </Link>
              </Magnetic>
            </div>
          </m.section>
        </main>

        <footer className="site-footer">
          <Link className="site-brand" to="/"><span><Atom size={20} /></span>NexaLab<span className="site-brand-dot">.</span></Link>
          <span>{t.footerMotto}</span>
          <span>{t.footerScope}</span>
        </footer>
      </div>
    </LazyMotion>
  );
}

