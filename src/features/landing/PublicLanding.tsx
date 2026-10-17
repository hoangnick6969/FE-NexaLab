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

const steps = [
  {
    number: "01",
    icon: BookOpen,
    title: "Bắt đầu từ điều em muốn biết",
    copy: "Đọc nội dung ngắn, xem hình ảnh và video để hiểu hiện tượng trước khi bắt tay vào thử.",
  },
  {
    number: "02",
    icon: Lightbulb,
    title: "Kiểm tra cách em hiểu",
    copy: "Thẻ ghi nhớ và câu hỏi nhỏ giúp em ôn lại kiến thức theo nhịp học của mình.",
  },
  {
    number: "03",
    icon: FlaskConical,
    title: "Thử trong mô phỏng 3D",
    copy: "Điều chỉnh thông số, quan sát kết quả rồi thử lại để tìm ra điều làm nên khác biệt.",
  },
];

const subjects = [
  { name: "Vật lý", className: "physics", detail: "Mạch điện và ánh sáng" },
  { name: "Hóa học", className: "chemistry", detail: "Chất và phản ứng" },
  { name: "Sinh học", className: "biology", detail: "Cơ thể và sự sống" },
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
        <Link className="site-brand" to="/" aria-label="NexaLab, trang chủ">
          <span><Atom size={23} /></span>
          NexaLab<span className="site-brand-dot">.</span>
        </Link>
        <nav aria-label="Điều hướng trang giới thiệu">
          <a href="#cach-hoc">Cách học</a>
          <a href="#mo-phong">Mô phỏng 3D</a>
          <a href="#mon-hoc">Môn học</a>
        </nav>
        <div className="site-nav-actions">
          <Link className="site-login" to="/login">Đăng nhập</Link>
          <Link className="site-nav-cta" to="/login">Vào học <ArrowRight size={16} /></Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <motion.div {...reveal}>
              <span className="landing-eyebrow"><span /> KHOA HỌC TỰ NHIÊN · LỚP 8–9</span>
              <h1>Đừng chỉ học về khoa học.<br /><em>Hãy tự mình khám phá.</em></h1>
              <p>Đọc, quan sát, đặt câu hỏi rồi bước vào mô phỏng 3D. Mỗi lần thử giúp em hiểu thêm một điều về thế giới quanh mình.</p>
              <div className="landing-actions">
                <Link className="landing-primary" to="/login">Bắt đầu khám phá <ArrowRight size={18} /></Link>
                <a className="landing-secondary" href="#cach-hoc">Xem cách học <ArrowDown size={16} /></a>
              </div>
              <div className="landing-note"><span className="landing-note-mark"><BookOpen size={17} /></span><span><b>Học theo từng bước</b><small>Nội dung · Quiz · Mô phỏng · Thử lại</small></span></div>
            </motion.div>
          </div>

          <div className="landing-visual" aria-label="Minh họa mô phỏng khoa học ba chiều">
            <div className="visual-label visual-label-top"><span className="visual-live-dot" /> MÔ PHỎNG ĐANG CHẠY</div>
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
            ><span className="caption-icon"><FlaskConical size={18} /></span><span><b>Quan sát mô hình</b><small>Thử thay đổi · Xem điều xảy ra</small></span><span className="caption-pulse" /></motion.div>
            <div className="visual-label visual-label-bottom">THỬ <i /> QUAN SÁT <i /> HIỂU</div>
          </div>
        </section>

        <section className="landing-learning" id="cach-hoc">
          <motion.div className="landing-section-heading" {...reveal}>
            <span className="landing-eyebrow">MỘT HÀNH TRÌNH RÕ RÀNG</span>
            <h2>Từ câu hỏi đầu tiên<br />đến lúc <em>tự tìm ra câu trả lời.</em></h2>
            <p>Em luôn có nền tảng kiến thức trước khi bước vào mô phỏng và thử thách.</p>
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
            <span className="landing-eyebrow">PHÒNG THÍ NGHIỆM CỦA EM</span>
            <h2>Thấy điều sách vở<br />khó diễn tả.</h2>
            <p>Quan sát mạch điện hoạt động, khám phá cách mắt tiếp nhận ánh sáng, hay thử thay đổi điều kiện của một phản ứng. Mô phỏng giúp em học bằng cách nhìn thấy và tự tay điều chỉnh.</p>
            <Link className="simulation-link" to="/login">Khám phá NexaLab <ArrowRight size={17} /></Link>
          </div>
          <div className="simulation-art" aria-hidden="true">
            <div className="simulation-ring ring-a" />
            <div className="simulation-ring ring-b" />
            <motion.div className="simulation-core" animate={reduceMotion ? undefined : { rotateY: [0, 14, 0, -14, 0], rotateX: [0, -7, 0, 7, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
              <Atom size={82} strokeWidth={1} />
            </motion.div>
            <motion.span className="simulation-particle particle-a" animate={reduceMotion ? undefined : { y: [0, -14, 0], x: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <motion.span className="simulation-particle particle-b" animate={reduceMotion ? undefined : { y: [0, 12, 0], x: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
            <div className="simulation-tag">MÔ HÌNH 3D <span>● ĐANG HOẠT ĐỘNG</span></div>
          </div>
        </motion.section>

        <section className="landing-subjects" id="mon-hoc">
          <motion.div className="subject-heading" {...reveal}>
            <div><span className="landing-eyebrow">BA CÁNH CỬA KHOA HỌC</span><h2>Điều gì làm em tò mò?</h2></div>
            <p>Bắt đầu từ một câu hỏi, rồi theo đuổi nó đến khi em hiểu.</p>
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
          <div><span className="landing-eyebrow">SẴN SÀNG CHO CÂU HỎI ĐẦU TIÊN?</span><h2>Khám phá khoa học<br />theo cách của em.</h2></div>
          <Link className="landing-primary" to="/login">Vào không gian học tập <ArrowRight size={18} /></Link>
        </motion.section>
      </main>

      <footer className="site-footer"><Link className="site-brand" to="/"><span><Atom size={20} /></span>NexaLab<span className="site-brand-dot">.</span></Link><span>Quan sát. Thử nghiệm. Thấu hiểu.</span><span>Khoa học tự nhiên · THCS</span></footer>
    </div>
  );
}
