/** Parent screens' skeletons, drawn in the real blocks' own classes (see components/skeletons.tsx). */
import { Bar, SkeletonRegion } from "../../components/skeletons";

const count = (n: number) => Array.from({ length: n }, (_, i) => i);

/** The parent's home: a sentence and one card per child with three readings. */
export function ParentOverviewSkeleton({ label }: { label: string }) {
  return <SkeletonRegion label={label} className="pp-skeleton">
    <div aria-hidden="true" className="pp-skeleton-stack">
      <Bar w="min(420px, 80%)" h={20} />
      <div className="pp-children">
        {count(2).map((i) => <div key={i} className="pp-child sk-card">
          <div><Bar w="150px" h={22} /><Bar w="60px" h={13} /></div>
          <div className="pp-readings">{count(3).map((c) => <div key={c}><Bar w="40px" h={26} /><Bar w="80%" h={12} /></div>)}</div>
          <Bar w="120px" h={38} className="sk-pill" />
        </div>)}
      </div>
    </div>
  </SkeletonRegion>;
}

/** Rows of a list section: a title line, a note line and a trailing reading. */
export function ParentRowsSkeleton({ label, rows = 2 }: { label: string; rows?: number }) {
  return <SkeletonRegion label={label} className="pp-rows">
    {count(rows).map((i) => <div key={i} className="pp-row sk-card" aria-hidden="true">
      <div><Bar w={`${50 + (i % 2) * 14}%`} h={16} /><Bar w="36%" h={12} /></div>
      <Bar w="56px" h={22} />
    </div>)}
  </SkeletonRegion>;
}

/** The three lab cards of a child. */
export function ParentLabsSkeleton({ label }: { label: string }) {
  return <SkeletonRegion label={label} className="pp-labs">
    {count(3).map((i) => <div key={i} className="pp-lab sk-card" aria-hidden="true">
      <Bar w="60%" h={20} />
      <Bar w="40px" h={32} />
      <Bar w="100%" h={6} className="sk-pill" />
      <Bar w="70%" h={13} />
    </div>)}
  </SkeletonRegion>;
}
