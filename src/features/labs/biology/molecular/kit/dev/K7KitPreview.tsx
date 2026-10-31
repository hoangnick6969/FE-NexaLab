import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import { fl27GeneConfig } from "../../gene-protein/fl27-gene.config";
import {
  AngstromRuler3D, CLOSED, CodonTable, DnaDuplex3D, Enzyme3D, K7Hud, MolecularStage, NucleotideStrand3D, Polypeptide3D, Ribosome3D, Trna3D,
  axisX, codonTable, helixSpec, pairDna, parseDna, toRna, useEasedLayout, type MolecularView, type NucleotidePose,
} from "..";

const SAMPLES = ["duplex", "bubble", "ribosome", "enzymes"] as const;
type Sample = (typeof SAMPLES)[number];
const LABELS: Record<Sample, string> = { duplex: "Chuỗi xoắn kép + thước Å", bubble: "Bóng phiên mã", ribosome: "Ribosome, tRNA, chuỗi polypeptide", enzymes: "Bề mặt enzyme procedural" };
const VIEW: MolecularView = { position: [0.6, 1.8, 13], target: [0, 0.6, 0] };
const structure = fl27GeneConfig.structure;
const spec = helixSpec(structure);
const coding = parseDna("ATGTTCGGATGGCATTAAGC");

/**
 * Development-only gallery of K7 molecules with FL-27 sample data, for
 * checking geometry, materials and motion one piece at a time. Not a Lab run.
 */
export default function K7KitPreview() {
  const navigate = useNavigate();
  const [sample, setSample] = useState<Sample>("duplex");
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState(true);
  const mrna = coding.slice(0, 18).map(toRna);
  const line = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, 18, spec), 0, 0); out.d.set(0, 1, 0); }, []));
  return <LabSpace title="Bộ kit phân tử K7, xem trước" onExit={() => navigate("/")}>
    <MolecularStage view={VIEW}>
      {sample === "duplex" && <>
        <DnaDuplex3D structure={structure} upper={coding} lower={coding.map(pairDna)} labels={labels} />
        <AngstromRuler3D structure={structure} count={coding.length} />
      </>}
      {sample === "bubble" && <DnaDuplex3D structure={structure} upper={coding} lower={coding.map(pairDna)} labels={labels} span={open ? { from: 6, to: 13, amount: 1, upper: 2.4, lower: -1.6 } : CLOSED} />}
      {sample === "ribosome" && <>
        <NucleotideStrand3D bases={mrna} layout={line} labels={labels} />
        <group position={[axisX(4, 18, spec), 0, 0]}><Ribosome3D codonLength={spec.rise * 3} assembled={!open} showSites={labels} /></group>
        <group position={[axisX(4, 18, spec), 1.34, 0]} scale={0.85}><Trna3D anticodon={["A", "A", "G"]} aminoAcid="Phe" rise={spec.rise / 0.85} labels={labels} /></group>
        <group position={[axisX(4, 18, spec) + 0.95, 3.8, 0]}><Polypeptide3D chain={["Met", "Phe", "Gly", "Trp"]} labels={labels} /></group>
      </>}
      {sample === "enzymes" && <>
        <group position={[-4, 0, 0]}><Enzyme3D seed={21} radius={1.2} stretch={[0.72, 1.3, 1.3]} color="#7fc3dc" /></group>
        <group position={[0, 0, 0]}><Enzyme3D seed={7} radius={1.4} stretch={[1.35, 1.05, 1]} color="#7db6e6" groove={0.26} /></group>
        <group position={[4, 0, 0]}><Enzyme3D seed={44} radius={1.1} stretch={[1.15, 0.95, 1]} color="#f1b37c" groove={0.18} /></group>
      </>}
    </MolecularStage>
    <K7Hud
      title="Bộ kit phân tử K7"
      stations={SAMPLES.map((id) => ({ id, label: LABELS[id] }))}
      current={sample}
      onSelect={(id) => setSample(id as Sample)}
      step={{ index: SAMPLES.indexOf(sample), total: SAMPLES.length }}
      instruction="Soi từng phân tử dùng chung của bộ kit K7. Số liệu lấy từ cấu hình mẫu FL-27, chưa duyệt; không chấm điểm."
      actions={<>
        <button type="button" className="secondary" aria-pressed={open} onClick={() => setOpen(!open)}>{open ? "Đóng lại" : "Mở / tách"}</button>
        <button type="button" className="secondary" aria-pressed={labels} onClick={() => setLabels(!labels)}>{labels ? "Ẩn nhãn" : "Hiện nhãn"}</button>
      </>}
    >
      {sample === "ribosome" && <CodonTable table={codonTable(fl27GeneConfig.codeTable)} highlight="UUC" />}
    </K7Hud>
  </LabSpace>;
}
