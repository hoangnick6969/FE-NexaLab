/**
 * Skeletons for the student /progress page, one per section, drawn in the real section's own classes (see
 * components/skeletons.tsx for the rule) so the page keeps its height when each query lands.
 */
import { Bar, SkeletonRegion } from "../../components/skeletons";

const count = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Three figures: label, number, one line of note. */
export function SummarySkeleton({ label }: { label: string }) {
  return <SkeletonRegion label={label} className="pg-summary">
    <div className="pg-stats" aria-hidden="true">
      {count(3).map((i) => <div key={i} className="pg-stat sk-card">
        <Bar w="62%" h={14} />
        <Bar w="34%" h={36} />
        <Bar w="78%" h={13} />
      </div>)}
    </div>
  </SkeletonRegion>;
}

/** Course cards: cover beside the title, counts, bar and percentage. */
export function CoursesSkeleton({ label, cards = 3 }: { label: string; cards?: number }) {
  return <SkeletonRegion label={label} className="pg-courses">
    {count(cards).map((i) => <div key={i} className="pg-course sk-card" aria-hidden="true">
      <Bar w="76px" h="114px" className="sk-tile" />
      <div className="pg-course-body">
        <Bar w={`${58 + (i % 3) * 8}%`} h={20} />
        <Bar w="82%" h={13} />
        <Bar w="100%" h={6} className="sk-pill" />
        <div className="pg-course-foot"><Bar w="86px" h={24} /><Bar w="90px" h={13} /></div>
      </div>
    </div>)}
  </SkeletonRegion>;
}

/** Assignment cards: where it is from, title, due date, the meter and three step rows. */
export function AssignmentsSkeleton({ label, cards = 2 }: { label: string; cards?: number }) {
  return <SkeletonRegion label={label} className="pg-work">
    {count(cards).map((i) => <div key={i} className="pg-assignment sk-card" aria-hidden="true">
      <div className="pg-assignment-head">
        <div><Bar w="130px" h={13} /><Bar w="min(280px, 70%)" h={22} /><Bar w="170px" h={13} /></div>
        <Bar w="150px" h={38} className="sk-pill" />
      </div>
      <div className="pg-meter"><Bar w="210px" h={14} /><Bar w="100%" h={6} className="sk-pill" /></div>
      <div className="pg-sk-steps">
        {count(3).map((row) => <div key={row} className="pg-sk-step">
          <Bar w="24px" h={24} round />
          <Bar w="96px" h={15} />
          <Bar w="72px" h={13} className="pg-sk-hide-sm" />
          <Bar w="120px" h={13} className="pg-sk-hide-sm" />
          <Bar w="96px" h={14} />
        </div>)}
      </div>
    </div>)}
  </SkeletonRegion>;
}

/** History: a day heading and rows of kind, title and result, time, details. */
export function HistorySkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return <SkeletonRegion label={label} className="pg-history">
    <div className="activity-group" aria-hidden="true">
      <Bar w="72px" h={13} />
      <ul className="activity-list">
        {count(rows).map((i) => <li key={i} className="activity-row sk-card">
          <Bar w="84px" h={16} />
          <div className="activity-title"><Bar w={`${46 + (i % 3) * 10}%`} h={16} /><Bar w="28%" h={12} /></div>
          <Bar w="64px" h={16} />
          <Bar w="118px" h={13} />
          <Bar w="76px" h={14} />
        </li>)}
      </ul>
    </div>
  </SkeletonRegion>;
}
