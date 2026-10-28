import {
  LazyMotion,
  domAnimation,
  m,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowDown, ArrowRight, Atom, BookOpen, FlaskConical, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { chooseLocaleBeforeSignIn, defineText, getLocale } from "../../i18n";

const text = defineText({
  vi: {
    steps: [{ title: "Bắt đầu từ điều em muốn biết", copy: "Đọc nội dung ngắn, xem hình ảnh và video để hiểu hiện tượng trước khi bắt tay vào thử." }, { title: "Kiểm tra cách em hiểu", copy: "Thẻ ghi nhớ và câu hỏi nhỏ giúp em ôn lại kiến thức theo nhịp học của mình." }, { title: "Thử trong mô phỏng 3D", copy: "Điều chỉnh thông số, quan sát kết quả rồi thử lại để tìm ra điều làm nên khác biệt." }],
    subjects: [{ name: "Vật lý", detail: "Mạch điện và ánh sáng" }, { name: "Hóa học", detail: "Chất và phản ứng" }, { name: "Sinh học", detail: "Cơ thể và sự sống" }],
    home: "NexaLab, trang chủ",
    nav: "Điều hướng trang giới thiệu",
    how: "Cách học",
    sims: "Mô phỏng 3D",
    subjectsNav: "Môn học",
    signIn: "Đăng nhập",
    enter: "Vào học",
    eyebrow: "KHOA HỌC TỰ NHIÊN · LỚP 8–9",
    heroLine: "Đừng chỉ học về khoa học.",
    heroEmphasis: "Hãy tự mình khám phá.",
    heroBody: "Đọc, quan sát, đặt câu hỏi rồi bước vào mô phỏng 3D. Mỗi lần thử giúp em hiểu thêm một điều về thế giới quanh mình.",
    start: "Bắt đầu khám phá",
    seeHow: "Xem cách học",
    stepByStep: "Học theo từng bước",
    stepByStepDetail: "Nội dung · Quiz · Mô phỏng · Thử lại",
    visual: "Minh họa mô phỏng khoa học ba chiều",
    running: "MÔ PHỎNG ĐANG CHẠY",
    observeModel: "Quan sát mô hình",
    observeDetail: "Thử thay đổi · Xem điều xảy ra",
    try: "THỬ",
    observe: "QUAN SÁT",
    understand: "HIỂU",
    journeyEyebrow: "MỘT HÀNH TRÌNH RÕ RÀNG",
    journey1: "Từ câu hỏi đầu tiên",
    journey2: "đến lúc",
    journeyEmphasis: "tự tìm ra câu trả lời.",
    journeyBody: "Em luôn có nền tảng kiến thức trước khi bước vào mô phỏng và thử thách.",
    labEyebrow: "PHÒNG THÍ NGHIỆM CỦA EM",
    see1: "Thấy điều sách vở",
    see2: "khó diễn tả.",
    labBody: "Quan sát mạch điện hoạt động, khám phá cách mắt tiếp nhận ánh sáng, hay thử thay đổi điều kiện của một phản ứng. Mô phỏng giúp em học bằng cách nhìn thấy và tự tay điều chỉnh.",
    exploreNexaLab: "Khám phá NexaLab",
    model3d: "MÔ HÌNH 3D",
    live: "ĐANG HOẠT ĐỘNG",
    doorsEyebrow: "BA CÁNH CỬA KHOA HỌC",
    curious: "Điều gì làm em tò mò?",
    curiousBody: "Bắt đầu từ một câu hỏi, rồi theo đuổi nó đến khi em hiểu.",
    ctaEyebrow: "SẴN SÀNG CHO CÂU HỎI ĐẦU TIÊN?",
    cta1: "Khám phá khoa học",
    cta2: "theo cách của em.",
    enterSpace: "Vào không gian học tập",
    footerMotto: "Quan sát. Thử nghiệm. Thấu hiểu.",
    footerScope: "Khoa học tự nhiên · THCS",
  },
  en: {
    steps: [{ title: "Start from what you want to know", copy: "Read short content and look at images and video to understand a phenomenon before you try it." }, { title: "Check what you understand", copy: "Study cards and short questions help you review at your own pace." }, { title: "Try it in a 3D simulation", copy: "Adjust settings, watch what happens, then try again to find what makes the difference." }],
    subjects: [{ name: "Physics", detail: "Circuits and light" }, { name: "Chemistry", detail: "Substances and reactions" }, { name: "Biology", detail: "The body and life" }],
    home: "NexaLab, home",
    nav: "Welcome page navigation",
    how: "How it works",
    sims: "3D simulations",
    subjectsNav: "Subjects",
    signIn: "Sign in",
    enter: "Start learning",
    eyebrow: "NATURAL SCIENCE · GRADES 8–9",
    heroLine: "Don't just learn about science.",
    heroEmphasis: "Discover it yourself.",
    heroBody: "Read, observe, ask questions, then step into a 3D simulation. Every attempt teaches you something new about the world around you.",
    start: "Start exploring",
    seeHow: "See how it works",
    stepByStep: "Learn step by step",
    stepByStepDetail: "Content · Quiz · Simulation · Try again",
    visual: "Illustration of a 3D science simulation",
    running: "SIMULATION RUNNING",
    observeModel: "Observe the model",
    observeDetail: "Change something · See what happens",
    try: "TRY",
    observe: "OBSERVE",
    understand: "UNDERSTAND",
    journeyEyebrow: "A CLEAR JOURNEY",
    journey1: "From the first question",
    journey2: "to the moment you",
    journeyEmphasis: "find the answer yourself.",
    journeyBody: "You always have the basics before you step into simulations and challenges.",
    labEyebrow: "YOUR LAB",
    see1: "See what books",
    see2: "struggle to show.",
    labBody: "Watch a circuit work, explore how the eye takes in light, or change the conditions of a reaction. Simulations help you learn by seeing and adjusting things yourself.",
    exploreNexaLab: "Explore NexaLab",
    model3d: "3D MODEL",
    live: "LIVE",
    doorsEyebrow: "THREE DOORS TO SCIENCE",
    curious: "What makes you curious?",
    curiousBody: "Start with a question and follow it until you understand.",
    ctaEyebrow: "READY FOR YOUR FIRST QUESTION?",
    cta1: "Explore science",
    cta2: "your way.",
    enterSpace: "Enter the learning space",
    footerMotto: "Observe. Experiment. Understand.",
    footerScope: "Natural science · Lower secondary",
  },
});
const t = text();

const steps = [
  {
    number: "01",
    icon: BookOpen,
    ...t.steps[0],
  },
  {
    number: "02",
    icon: Lightbulb,
    ...t.steps[1],
  },
  {
    number: "03",
    icon: FlaskConical,
    ...t.steps[2],
  },
];

const subjects = [
  { ...t.subjects[0], className: "physics" },
  { ...t.subjects[1], className: "chemistry" },
  { ...t.subjects[2], className: "biology" },
];

const ticker = [t.try, t.observe, t.understand, ...t.subjects.map((s: { name: string }) => s.name)];

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

function StepCard({
  progress, index, reduce, children,
}: { progress: MotionValue<number>; index: number; reduce: boolean | null; children: ReactNode }) {
  const a = 0.18 + index * 0.2;
  const opacity = useTransform(progress, [a, a + 0.2], [0.25, 1]);
  const y = useTransform(progress, [a, a + 0.2], [36, 0]);
  return (
    <m.li className="journey-step" style={reduce ? undefined : { opacity, y }}>
      {children}
    </m.li>
  );
}

/* ---------- page ---------- */

export function PublicLanding() {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const locale = getLocale();
  const otherLocale = locale === "vi" ? "en" : "vi";

  const heroRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const simRef = useRef<HTMLElement>(null);
  const sceneVisible = useInView(sceneRef, { margin: "160px" });

  /* header: glass + progress */
  const { scrollY, scrollYProgress: pageProgress } = useScroll();
  const navBg = useTransform(scrollY, [0, 72], [0, 1]);
  const progressX = useSpring(pageProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  /* hero: scroll exit + pointer tilt */
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroCopyY = useTransform(heroP, [0, 1], [0, reduce ? 0 : -48]);
  const heroCopyOpacity = useTransform(heroP, [0, 0.7], [1, reduce ? 1 : 0.2]);
  const heroVisualY = useTransform(heroP, [0, 1], [0, reduce ? 0 : 64]);

  const mx = useSpring(0, { stiffness: 90, damping: 16, mass: 0.5 });
  const my = useSpring(0, { stiffness: 90, damping: 16, mass: 0.5 });
  const rotY = useTransform(mx, [-0.5, 0.5], [-7, 7]);
  const rotX = useTransform(my, [-0.5, 0.5], [6, -6]);
  const midX = useTransform(mx, [-0.5, 0.5], [-14, 14]);
  const midY = useTransform(my, [-0.5, 0.5], [-10, 10]);
  const chipX = useTransform(mx, [-0.5, 0.5], [22, -22]);
  const chipY = useTransform(my, [-0.5, 0.5], [16, -16]);
  const capX = useTransform(mx, [-0.5, 0.5], [10, -10]);

  const onVisualMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || !fine.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onVisualLeave = () => { mx.set(0); my.set(0); };

  /* journey: progress rail + cards */
  const { scrollYProgress: journeyP } = useScroll({ target: journeyRef, offset: ["start 0.75", "end 0.7"] });
  const railScale = useSpring(journeyP, { stiffness: 120, damping: 26, restDelta: 0.001 });

  /* simulation: expanding card + scroll-linked 3D */
  const { scrollYProgress: simP } = useScroll({ target: simRef, offset: ["start end", "end start"] });
  const simScale = useTransform(simP, [0, 0.3], [reduce ? 1 : 0.9, 1]);
  const coreRotY = useTransform(simP, [0, 1], [reduce ? 0 : -40, reduce ? 0 : 40]);
  const coreRotX = useTransform(simP, [0, 1], [reduce ? 0 : 14, reduce ? 0 : -14]);
  const ringSpin = useTransform(simP, [0, 1], [0, reduce ? 0 : 80]);
  const partA = useTransform(simP, [0, 1], [reduce ? 0 : 40, reduce ? 0 : -40]);
  const partB = useTransform(simP, [0, 1], [reduce ? 0 : -34, reduce ? 0 : 34]);

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

  const onCardMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="public-site">
        <header className="site-header">
          <m.i className="site-header-bg" aria-hidden="true" style={{ opacity: navBg }} />
          <div className="site-nav">
            <Link className="site-brand" to="/" aria-label={t.home}>
              <span><Atom size={23} /></span>
              NexaLab<span className="site-brand-dot">.</span>
            </Link>
            <nav aria-label={t.nav}>
              <a href="#cach-hoc">{t.how}</a>
              <a href="#mo-phong">{t.sims}</a>
              <a href="#mon-hoc">{t.subjectsNav}</a>
            </nav>
            <div className="site-nav-actions">
              <Link className="site-login" to="/login">{t.signIn}</Link>
              <Link className="site-nav-cta" to="/login">{t.enter} <ArrowRight size={16} /></Link>
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
                <m.span className="landing-eyebrow" {...rise(0.05)}><span /> {t.eyebrow}</m.span>
                <m.h1 variants={stagger(0.15)} initial={reduce ? false : "hidden"} animate="show">
                  <Words text={t.heroLine} /><br />
                  <em><Words text={t.heroEmphasis} /></em>
                </m.h1>
                <m.p {...rise(0.5)}>{t.heroBody}</m.p>
                <m.div className="landing-actions" {...rise(0.62)}>
                  <Magnetic disabled={reduce}>
                    <Link className="landing-primary" to="/login">{t.start} <ArrowRight size={18} /></Link>
                  </Magnetic>
                  <a className="landing-secondary" href="#cach-hoc">{t.seeHow} <ArrowDown size={16} /></a>
                </m.div>
                <m.div className="landing-note" {...rise(0.78)}>
                  <span className="landing-note-mark"><BookOpen size={17} /></span>
                  <span><b>{t.stepByStep}</b><small>{t.stepByStepDetail}</small></span>
                </m.div>
              </m.div>
            </div>

            <div className="landing-visual" aria-label={t.visual} onPointerMove={onVisualMove} onPointerLeave={onVisualLeave}>
              <div className="visual-label visual-label-top"><span className="visual-live-dot" /> {t.running}</div>

              <m.div className="scene-tilt" style={{ rotateX: rotX, rotateY: rotY, y: heroVisualY }}
                initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}>
                <div ref={sceneRef} className={`science-scene${sceneVisible ? "" : " is-idle"}`}>
                  <div className="scene-grid" />
                  <m.div className="scene-layer" style={{ x: midX, y: midY }}>
                    <div className="scene-glow" />
                    <div className="atom-orbit orbit-one"><div className="orbit-spinner spin-a"><span className="electron electron-one" /></div></div>
                    <div className="atom-orbit orbit-two"><div className="orbit-spinner spin-b"><span className="electron electron-two" /></div></div>
                    <div className="atom-orbit orbit-three"><div className="orbit-spinner spin-c"><span className="electron electron-three" /></div></div>
                    <div className="atom-nucleus"><Atom size={48} strokeWidth={1.25} /></div>
                  </m.div>
                  <m.div className="scene-coordinate coordinate-a" style={{ x: chipX, y: chipY }}>e⁻ <span>−1.2</span></m.div>
                  <m.div className="scene-coordinate coordinate-b" style={{ x: chipX, y: chipY }}>E <span>+2.4</span></m.div>
                  <svg className="scene-trace" viewBox="0 0 420 90" aria-hidden="true">
                    <path d="M8 66 H112 L148 30 H251 L289 66 H412" />
                    <circle r="5" fill="currentColor" cx={reduce ? 289 : 0} cy={reduce ? 66 : 0}>
                      {!reduce && <animateMotion dur="5s" repeatCount="indefinite" path="M8 66 H112 L148 30 H251 L289 66 H412" />}
                    </circle>
                  </svg>
                </div>
              </m.div>

              <m.div className="visual-caption" style={{ x: capX }}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.9, duration: 0.8, ease: EASE }}>
                <span className="caption-icon"><FlaskConical size={18} /></span>
                <span><b>{t.observeModel}</b><small>{t.observeDetail}</small></span>
                <span className="caption-pulse" />
              </m.div>
              <div className="visual-label visual-label-bottom">{t.try} <i /> {t.observe} <i /> {t.understand}</div>
            </div>
          </section>

          {/* ---------------- MARQUEE ---------------- */}
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track">
              {[0, 1].map((k) => (
                <ul key={k}>
                  {ticker.map((word, i) => (
                    <li key={i}>{word}<Atom size={16} strokeWidth={1.5} /></li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          {/* ---------------- JOURNEY ---------------- */}
          <section className="landing-learning" id="cach-hoc" ref={journeyRef}>
            <div className="journey-layout">
              <div className="journey-sticky">
                <m.span className="landing-eyebrow" {...reveal}>{t.journeyEyebrow}</m.span>
                <m.h2 {...headingProps(0.05)}>
                  <Words text={t.journey1} /><br />
                  <Words text={t.journey2} />{" "}
                  <em><Words text={t.journeyEmphasis} /></em>
                </m.h2>
                <m.p {...reveal}>{t.journeyBody}</m.p>
              </div>
              <div className="journey-track">
                <span className="journey-line" aria-hidden="true">
                  <m.i style={reduce ? { scaleY: 1 } : { scaleY: railScale }} />
                </span>
                <ol className="journey-steps">
                  {steps.map(({ number, icon: Icon, title, copy }, index) => (
                    <StepCard key={number} progress={journeyP} index={index} reduce={reduce}>
                      <span className="journey-num" aria-hidden="true">{number}</span>
                      <div className="journey-body">
                        <span className="journey-icon"><Icon size={22} strokeWidth={1.8} /></span>
                        <h3>{title}</h3>
                        <p>{copy}</p>
                      </div>
                    </StepCard>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* ---------------- SIMULATION ---------------- */}
          <m.section className="landing-simulation" id="mo-phong" ref={simRef} style={{ scale: simScale }}>
            <div className="simulation-copy">
              <m.span className="landing-eyebrow" {...reveal}>{t.labEyebrow}</m.span>
              <m.h2 {...headingProps(0.05)}>
                <Words text={t.see1} /><br /><Words text={t.see2} />
              </m.h2>
              <m.p {...reveal}>{t.labBody}</m.p>
              <Link className="simulation-link" to="/login">{t.exploreNexaLab} <ArrowRight size={17} /></Link>
            </div>
            <div className="simulation-art" aria-hidden="true">
              <m.div className="sim-orbits" style={{ rotateZ: ringSpin }}>
                <div className="simulation-ring ring-a" />
                <div className="simulation-ring ring-b" />
              </m.div>
              <m.div className="simulation-core" style={{ rotateY: coreRotY, rotateX: coreRotX }}>
                <Atom size={82} strokeWidth={1} />
              </m.div>
              <m.span className="simulation-particle particle-a" style={{ y: partA }} />
              <m.span className="simulation-particle particle-b" style={{ y: partB }} />
              <div className="simulation-tag">{t.model3d} <span>● {t.live}</span></div>
            </div>
          </m.section>

          {/* ---------------- SUBJECTS ---------------- */}
          <section className="landing-subjects" id="mon-hoc">
            <div className="subject-heading">
              <div>
                <m.span className="landing-eyebrow" {...reveal}>{t.doorsEyebrow}</m.span>
                <m.h2 {...headingProps(0.05)}><Words text={t.curious} /></m.h2>
              </div>
              <m.p {...reveal}>{t.curiousBody}</m.p>
            </div>
            <div className="subject-cards">
              {subjects.map((subject, index) => {
                const Icon = subject.className === "physics" ? Atom : subject.className === "chemistry" ? FlaskConical : Lightbulb;
                return (
                  <m.div
                    className="subject-cell"
                    key={subject.name}
                    initial={reduce ? false : { opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.75, ease: EASE, delay: reduce ? 0 : index * 0.1 }}
                  >
                    <div className={`subject-card ${subject.className}`} onPointerMove={onCardMove}>
                      <Icon className="subject-ghost" aria-hidden="true" strokeWidth={0.8} />
                      <div className="subject-card-top">
                        <span className="subject-symbol"><Icon /></span>
                        <span className="subject-index" aria-hidden="true">0{index + 1}</span>
                      </div>
                      <div className="subject-card-bottom">
                        <span className="subject-card-copy"><b>{subject.name}</b><small>{subject.detail}</small></span>
                        <span className="subject-arrow"><ArrowRight size={18} /></span>
                      </div>
                    </div>
                  </m.div>
                );
              })}
            </div>
          </section>

          {/* ---------------- FINAL CTA ---------------- */}
          <m.section className="landing-final-cta" {...reveal}>
            <div className="cta-orbits" aria-hidden="true"><i /><i /><i /></div>
            <span className="landing-eyebrow"><span /> {t.ctaEyebrow}</span>
            <m.h2 {...headingProps(0.05)}><Words text={t.cta1} /><br /><Words text={t.cta2} /></m.h2>
            <Magnetic disabled={reduce}>
              <Link className="landing-primary" to="/login">{t.enterSpace} <ArrowRight size={18} /></Link>
            </Magnetic>
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
