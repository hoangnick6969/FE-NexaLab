import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeading } from "../../components/PageHeading";
import { CardSkeleton, ErrorBox } from "../../components/ui";
import { api, inlineMaterial } from "../../lib/api";
import { httpsUrl } from "../../lib/urls";
import { defineText } from "../../i18n";
import "./ebook-library.css";

const text = defineText({
  vi: {
    eyebrow: "TÀI LIỆU HỌC TẬP",
    title: "Thư viện Ebook",
    description: "Chọn sách giáo khoa để đọc. Bạn có thể tìm theo tên môn hoặc khối lớp.",
    search: "Tìm sách",
    searchPlaceholder: "Ví dụ: Khoa học tự nhiên 8",
    allGrades: "Tất cả",
    grade: (grade: number) => `Lớp ${grade}`,
    subject: "Sách giáo khoa",
    open: "Mở sách",
    empty: "Chưa có sách phù hợp. Hãy thử từ khóa hoặc khối lớp khác.",
    loadFailed: "Không tải được thư viện ebook.",
    back: "Quay lại bài học",
    volume: (version: string) => version && !/^khtn[-_ ]?\d+$/i.test(version) ? version : "Bản điện tử",
  },
  en: {
    eyebrow: "STUDY MATERIALS",
    title: "Ebook library",
    description: "Choose a textbook to read, or search by subject and grade.",
    search: "Find a book",
    searchPlaceholder: "For example: Natural Science 8",
    allGrades: "All grades",
    grade: (grade: number) => `Grade ${grade}`,
    subject: "Textbook",
    open: "Open book",
    empty: "No books match. Try another search or grade.",
    loadFailed: "The ebook library could not be loaded.",
    back: "Back to lessons",
    volume: (version: string) => version && !/^khtn[-_ ]?\d+$/i.test(version) ? version : "Digital edition",
  },
});

type Book = {
  id: string;
  subjectId: string;
  subjectName: string;
  url: string;
  version: string;
  grade: number | null;
  initialPage: number;
  coverAssetVersionId?: string | null;
};

function gradeFrom(...values: string[]): number | null {
  for (const value of values) {
    const match = value.match(/(?:khtn|grade)[-_ ]?(\d{1,2})/i);
    if (match) return Number(match[1]);
  }
  return null;
}

async function loadBooks(): Promise<Book[]> {
  const [curriculum, subjects] = await Promise.all([
    api<{ subjects?: Array<{ id: string; name: string; ebookEditions?: Array<{ id: string; version: string; url: string; fallbackPhysicalPage?: number; coverAssetVersionId?: string | null }> }> }>("/open-curriculum"),
    api<Array<{ id: string; name: string; ebookUrl?: string | null; ebookEditions?: Array<{ id: string; version: string; url: string; fallbackPhysicalPage?: number; coverAssetVersionId?: string | null }> }>>("/subjects"),
  ]);
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const curriculumById = new Map((curriculum.subjects ?? []).map((subject) => [subject.id, subject]));
  const books: Book[] = [];

  for (const subjectId of new Set([...subjectById.keys(), ...curriculumById.keys()])) {
    const fallback = subjectById.get(subjectId);
    const subject = curriculumById.get(subjectId);
    const subjectName = subject?.name ?? fallback?.name;
    if (!subjectName) continue;
    const editions = subject?.ebookEditions?.length ? subject.ebookEditions : fallback?.ebookEditions ?? [];
    for (const edition of editions) {
      const url = httpsUrl(edition.url);
      if (!url) continue;
      books.push({
        id: edition.id,
        subjectId,
        subjectName,
        url,
        version: edition.version,
        grade: gradeFrom(edition.version, url),
        initialPage: edition.fallbackPhysicalPage ?? 1,
        coverAssetVersionId: edition.coverAssetVersionId,
      });
    }
    if (editions.length) continue;
    const url = httpsUrl(fallback?.ebookUrl);
    if (url) {
      books.push({
        id: subjectId,
        subjectId,
        subjectName,
        url,
        version: "",
        grade: gradeFrom(url),
        initialPage: 1,
      });
    }
  }

  return books.sort((a, b) => (a.grade ?? Number.MAX_SAFE_INTEGER) - (b.grade ?? Number.MAX_SAFE_INTEGER)
    || a.subjectName.localeCompare(b.subjectName, "vi")
    || a.version.localeCompare(b.version, "vi"));
}

function EbookCover({ book }: { book: Book }) {
  const t = text();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let revoke: () => void = () => undefined;
    setSrc(null);
    if (book.coverAssetVersionId) inlineMaterial(`assetv:${book.coverAssetVersionId}`).then((image) => {
      if (active) { revoke = image.revoke; setSrc(image.src); }
      else image.revoke();
    }).catch(() => undefined);
    return () => { active = false; revoke(); };
  }, [book.coverAssetVersionId]);
  if (src) return <img className="ebook-library-cover-image" src={src} alt="" onError={() => setSrc(null)} />;
  return <div className="ebook-library-cover" aria-hidden="true"><span>{book.grade ? t.grade(book.grade) : t.subject}</span><BookOpen size={34} strokeWidth={1.5} /><b>{book.subjectName}</b></div>;
}

export function EbookLibraryPage() {
  const t = text();
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const query = useQuery({ queryKey: ["ebook-library"], queryFn: loadBooks });
  const books = query.data ?? [];
  const grades = useMemo(() => [...new Set(books.flatMap((book) => book.grade ? [book.grade] : []))].sort((a, b) => a - b), [books]);
  const filtered = books.filter((book) => (grade === null || book.grade === grade)
    && `${book.subjectName} ${book.version} ${book.grade ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return <main className="ebook-library-page">
    <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} action={<Link className="secondary ebook-library-back" to="/lessons">{t.back}</Link>} />
    <section className="ebook-library-tools" aria-label={t.search}>
      <label className="ebook-library-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">{t.search}</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder} />
      </label>
      <div className="ebook-library-grades" role="group" aria-label={t.allGrades}>
        <button type="button" className={grade === null ? "active" : ""} aria-pressed={grade === null} onClick={() => setGrade(null)}>{t.allGrades}</button>
        {grades.map((item) => <button key={item} type="button" className={grade === item ? "active" : ""} aria-pressed={grade === item} onClick={() => setGrade(item)}>{t.grade(item)}</button>)}
      </div>
    </section>
    {query.isLoading ? <div className="ebook-library-grid"><CardSkeleton count={4} /></div> : query.error ? <><ErrorBox error={query.error} /><button className="secondary" type="button" onClick={() => void query.refetch()}>{t.loadFailed}</button></> : filtered.length ? (
      <section className="ebook-library-grid" aria-label={t.title}>
        {filtered.map((book) => <article key={`${book.subjectId}:${book.id}`} className="ebook-library-card">
          <EbookCover book={book} />
          <div className="ebook-library-card-body">
            <div className="ebook-library-card-meta"><span>{book.grade ? t.grade(book.grade) : t.subject}</span><small>{t.volume(book.version)}</small></div>
            <h2>{book.subjectName}</h2>
            <Link className="ebook-library-open" to={`/ebooks/${encodeURIComponent(book.subjectId)}`} state={{ ebookUrl: book.url, initialPhysicalPage: book.initialPage, fromLibrary: true }}>
              {t.open}<ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>)}
      </section>
    ) : <div className="ebook-library-empty"><BookOpen size={28} /><p>{t.empty}</p></div>}
  </main>;
}
