import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  Atom,
  BookOpen,
  FlaskConical,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";
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

export function PublicLanding() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: reduceMotion ? 0 : 0.65, ease: "easeOut" as const },
  };

  return (
    <div className="public-site">
      <header className="site-nav">
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
          <button type="button" className="site-language" lang={getLocale() === "vi" ? "en" : "vi"} onClick={() => chooseLocaleBeforeSignIn(getLocale() === "vi" ? "en" : "vi")}>{getLocale() === "vi" ? "EN" : "VI"}</button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <motion.div {...reveal}>
              <span className="landing-eyebrow"><span /> {t.eyebrow}</span>
              <h1>{t.heroLine}<br /><em>{t.heroEmphasis}</em></h1>
              <p>{t.heroBody}</p>
              <div className="landing-actions">
                <Link className="landing-primary" to="/login">{t.start} <ArrowRight size={18} /></Link>
                <a className="landing-secondary" href="#cach-hoc">{t.seeHow} <ArrowDown size={16} /></a>
              </div>
              <div className="landing-note"><span className="landing-note-mark"><BookOpen size={17} /></span><span><b>{t.stepByStep}</b><small>{t.stepByStepDetail}</small></span></div>
            </motion.div>
          </div>

          <div className="landing-visual" aria-label={t.visual}>
            <div className="visual-label visual-label-top"><span className="visual-live-dot" /> {t.running}</div>
            <div className="science-scene">
              <div className="scene-grid" />
              <div className="scene-glow" />
              <div className="atom-orbit orbit-one">
                <motion.div
                className="orbit-spinner"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                ><span className="electron electron-one" /></motion.div>
              </div>
              <div className="atom-orbit orbit-two">
                <motion.div
                className="orbit-spinner"
                animate={reduceMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
                ><span className="electron electron-two" /></motion.div>
              </div>
              <div className="atom-orbit orbit-three">
                <motion.div
                className="orbit-spinner"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 39, repeat: Infinity, ease: "linear" }}
                ><span className="electron electron-three" /></motion.div>
              </div>
              <motion.div
                className="atom-nucleus"
                animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              ><Atom size={48} strokeWidth={1.25} /></motion.div>
              <div className="scene-coordinate coordinate-a">e⁻ <span>−1.2</span></div>
              <div className="scene-coordinate coordinate-b">E <span>+2.4</span></div>
              <svg className="scene-trace" viewBox="0 0 420 90" aria-hidden="true">
                <path d="M8 66 H112 L148 30 H251 L289 66 H412" />
                <motion.circle
                  r="5"
                  fill="currentColor"
                  initial={false}
                  animate={reduceMotion ? undefined : { cx: [8, 112, 148, 251, 289, 412], cy: [66, 66, 30, 30, 66, 66] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
              </svg>
            </div>
            <motion.div
              className="visual-caption"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.55, duration: reduceMotion ? 0 : 0.5 }}
            ><span className="caption-icon"><FlaskConical size={18} /></span><span><b>{t.observeModel}</b><small>{t.observeDetail}</small></span><span className="caption-pulse" /></motion.div>
            <div className="visual-label visual-label-bottom">{t.try} <i /> {t.observe} <i /> {t.understand}</div>
          </div>
        </section>

        <section className="landing-learning" id="cach-hoc">
          <motion.div className="landing-section-heading" {...reveal}>
            <span className="landing-eyebrow">{t.journeyEyebrow}</span>
            <h2>{t.journey1}<br />{t.journey2} <em>{t.journeyEmphasis}</em></h2>
            <p>{t.journeyBody}</p>
          </motion.div>
          <div className="learning-steps">
            {steps.map(({ number, icon: Icon, title, copy }, index) => (
              <motion.article
                className="learning-step"
                key={number}
                initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : index * 0.13 }}
              >
                <div className="step-top"><span>{number}</span><Icon size={22} strokeWidth={1.8} /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <motion.section className="landing-simulation" id="mo-phong" {...reveal}>
          <div className="simulation-copy">
            <span className="landing-eyebrow">{t.labEyebrow}</span>
            <h2>{t.see1}<br />{t.see2}</h2>
            <p>{t.labBody}</p>
            <Link className="simulation-link" to="/login">{t.exploreNexaLab} <ArrowRight size={17} /></Link>
          </div>
          <div className="simulation-art" aria-hidden="true">
            <div className="simulation-ring ring-a" />
            <div className="simulation-ring ring-b" />
            <motion.div className="simulation-core" animate={reduceMotion ? undefined : { rotateY: [0, 14, 0, -14, 0], rotateX: [0, -7, 0, 7, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
              <Atom size={82} strokeWidth={1} />
            </motion.div>
            <motion.span className="simulation-particle particle-a" animate={reduceMotion ? undefined : { y: [0, -14, 0], x: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <motion.span className="simulation-particle particle-b" animate={reduceMotion ? undefined : { y: [0, 12, 0], x: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
            <div className="simulation-tag">{t.model3d} <span>● {t.live}</span></div>
          </div>
        </motion.section>

        <section className="landing-subjects" id="mon-hoc">
          <motion.div className="subject-heading" {...reveal}>
            <div><span className="landing-eyebrow">{t.doorsEyebrow}</span><h2>{t.curious}</h2></div>
            <p>{t.curiousBody}</p>
          </motion.div>
          <div className="subject-cards">
            {subjects.map((subject, index) => (
              <motion.div
                className={`subject-card ${subject.className}`}
                key={subject.name}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                whileHover={reduceMotion ? undefined : { y: -6, transition: { duration: 0.2 } }}
                transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : index * 0.1 }}
              >
                <span className="subject-symbol">{subject.className === "physics" ? <Atom /> : subject.className === "chemistry" ? <FlaskConical /> : <Lightbulb />}</span>
                <span className="subject-card-copy"><b>{subject.name}</b><small>{subject.detail}</small></span>
                <ArrowRight size={18} />
              </motion.div>
            ))}
          </div>
        </section>

        <motion.section className="landing-final-cta" {...reveal}>
          <div><span className="landing-eyebrow">{t.ctaEyebrow}</span><h2>{t.cta1}<br />{t.cta2}</h2></div>
          <Link className="landing-primary" to="/login">{t.enterSpace} <ArrowRight size={18} /></Link>
        </motion.section>
      </main>

      <footer className="site-footer"><Link className="site-brand" to="/"><span><Atom size={20} /></span>NexaLab<span className="site-brand-dot">.</span></Link><span>{t.footerMotto}</span><span>{t.footerScope}</span></footer>
    </div>
  );
}
