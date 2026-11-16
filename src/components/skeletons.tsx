/**
 * Loading skeletons that keep the shape of what is loading.
 *
 * One rule for every screen: a skeleton is drawn inside the same container class the loaded content uses (a lesson row
 * is a `student-lesson-row`, a class is a `student-class-card`, ...) and fills it with grey bars the size of its text.
 * Border, radius, padding and grid then come from the real CSS, so the page does not jump when data arrives and the
 * skeleton can never drift from the card it stands in for.
 *
 * Each skeleton is one `role="status"` region with a label, so a screen reader hears one "loading" announcement
 * instead of a pile of empty blocks; the blocks themselves are `aria-hidden`.
 */
import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "./ui";
import "./skeletons.css";

const count = (n: number) => Array.from({ length: n }, (_, i) => i);

/** One grey bar. `w` is any CSS width, `h` a pixel height or any CSS length. */
export function Bar({ w = "100%", h = 14, round = false, className = "" }: { w?: string; h?: number | string; round?: boolean; className?: string }) {
  const style = { "--sk-w": w, "--sk-h": typeof h === "number" ? `${h}px` : h } as CSSProperties;
  return <Skeleton variant={round ? "circle" : "text"} className={`sk-bar ${className}`.trim()} style={style} />;
}

/** The one loading announcement for a skeleton. `className` is the layout the loaded content uses. */
export function SkeletonRegion({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return <div className={`sk-region ${className}`.trim()} role="status" aria-live="polite" aria-busy="true" aria-label={label}>{children}</div>;
}

/** Student lessons list: icon, subject and chapter, title, and the two actions of a `student-lesson-row`. */
export function LessonRowsSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return <SkeletonRegion label={label} className="sk-stack">
    <div className="sk-section-head" aria-hidden="true"><Bar w="min(220px, 50%)" h={22} /><Bar w="64px" h={14} /></div>
    {count(rows).map((i) => <article key={i} className="student-lesson-row sk-card" aria-hidden="true">
      <div className="lesson-row-main-link">
        <Bar w="32px" h={32} className="sk-tile" />
        <div className="lesson-row-body sk-grow">
          <Bar w="42%" h={12} />
          <Bar w={`${64 - (i % 3) * 9}%`} h={16} />
        </div>
      </div>
      <div className="lesson-row-actions"><Bar w="78px" h={32} className="sk-pill" /></div>
    </article>)}
  </SkeletonRegion>;
}

/** Student class cards: subject and grade chips, class name, two meta lines and the footer link. */
export function ClassCardsSkeleton({ label, cards = 3 }: { label: string; cards?: number }) {
  return <SkeletonRegion label={label} className="student-class-grid">
    {count(cards).map((i) => <div key={i} className="panel student-class-card sk-card" aria-hidden="true">
      <div className="student-class-card-header">
        <div className="student-class-pill-group"><Bar w="64px" h={22} className="sk-pill" /><Bar w="48px" h={22} className="sk-pill" /></div>
        <Bar w="60px" h={22} className="sk-pill" />
      </div>
      <Bar w={`${70 - (i % 3) * 8}%`} h={22} />
      <div className="student-class-card-meta"><Bar w="55%" h={14} /><Bar w="40%" h={14} /></div>
      <div className="student-class-card-footer"><Bar w="96px" h={14} /></div>
    </div>)}
  </SkeletonRegion>;
}

/** Ebook shelf: a book cover beside meta chips, title, one line of description and the open button. */
export function BookCardsSkeleton({ label, cards = 2 }: { label: string; cards?: number }) {
  return <SkeletonRegion label={label} className="ebook-library-grid">
    {count(cards).map((i) => <article key={i} className="ebook-library-card sk-card" aria-hidden="true">
      <Bar w="100%" h="172px" className="sk-cover" />
      <div className="ebook-library-card-body sk-body">
        <div className="sk-inline"><Bar w="64px" h={20} className="sk-pill" /><Bar w="48px" h={12} /></div>
        <Bar w="70%" h={24} />
        <Bar w="90%" h={14} />
        <Bar w="110px" h={36} className="sk-pill sk-push" />
      </div>
    </article>)}
  </SkeletonRegion>;
}

/** Saved simulation notes: lab badge, note, date and verdict, in a plain `panel`. */
export function NoteCardsSkeleton({ label, cards = 3 }: { label: string; cards?: number }) {
  return <SkeletonRegion label={label} className="lesson-grid">
    {count(cards).map((i) => <article key={i} className="panel sk-card" aria-hidden="true">
      <Bar w="72px" h={20} className="sk-pill" />
      <Bar w="80%" h={20} />
      <Bar w="38%" h={14} />
      <Bar w="64px" h={22} className="sk-pill" />
    </article>)}
  </SkeletonRegion>;
}
