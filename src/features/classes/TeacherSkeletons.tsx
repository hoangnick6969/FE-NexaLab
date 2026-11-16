/** Teacher overview and Class Lab skeletons, drawn in the real cards' own classes (see components/skeletons.tsx). */
import { Bar, SkeletonRegion } from "../../components/skeletons";

const count = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Sentence, three task tiles and three class cards. */
export function TeacherOverviewSkeleton({ label }: { label: string }) {
  return <SkeletonRegion label={label} className="tov-skeleton">
    <div className="tov-section" aria-hidden="true">
      <Bar w="min(420px, 80%)" h={20} />
      <Bar w="120px" h={24} />
      <div className="tov-tasks">
        {count(3).map((i) => <div key={i} className="tov-task sk-card">
          <Bar w="70%" h={16} />
          <Bar w="64px" h={40} />
          <Bar w="50%" h={13} />
        </div>)}
      </div>
      <Bar w="160px" h={24} />
      <div className="tov-classes">
        {count(3).map((i) => <div key={i} className="tov-class sk-card">
          <div className="tov-class-head"><div className="tov-skeleton-name"><Bar w="140px" h={22} /><Bar w="60px" h={13} /></div></div>
          <div className="tov-stats">{count(3).map((c) => <div key={c}><Bar w="60%" h={12} /><Bar w="34px" h={22} /></div>)}</div>
          <div className="tov-class-actions"><Bar w="92px" h={38} className="sk-pill" /><Bar w="92px" h={38} className="sk-pill" /></div>
        </div>)}
      </div>
    </div>
  </SkeletonRegion>;
}

/** One lab row: picture, title and meta, due date, and the action strip. */
export function LabRowSkeleton({ rows = 1 }: { rows?: number }) {
  return <>{count(rows).map((i) => <article key={i} className="teacher-class-lab-row sk-card" aria-hidden="true">
    <Bar w="72px" h="54px" className="sk-tile tcl-thumb" />
    <div className="tcl-main"><Bar w="56%" h={18} /><Bar w="34%" h={13} /></div>
    <div className="tcl-due"><Bar w="76px" h={16} /><Bar w="96px" h={12} /></div>
    <div className="tcl-actions"><Bar w="110px" h={36} className="sk-pill" /><Bar w="64px" h={36} className="sk-pill" /></div>
  </article>)}</>;
}

/** Class Lab first load: two class groups of two labs. */
export function ClassLabsSkeleton({ label }: { label: string }) {
  return <SkeletonRegion label={label} className="sk-stack">
    {count(2).map((g) => <div key={g} className="tcl-group" aria-hidden="true">
      <div className="tcl-head"><div className="tcl-skeleton-name"><Bar w="140px" h={22} /><Bar w="220px" h={14} /></div><Bar w="104px" h={38} className="sk-pill" /></div>
      <div className="tcl-list"><LabRowSkeleton rows={2} /></div>
    </div>)}
  </SkeletonRegion>;
}
