// K7 molecular / gene kit: presentation shared by FL-27 gene-to-protein and, after review,
// FL-28 cell division and FL-30 organic molecules. No model, rubric, Outcome or gene
// sequence lives here; each Lab supplies its pinned data and state.
export { k7StructureSchema, type K7Structure } from "./k7-config";
export {
  AMINO_ACIDS, CODON_AXIS, CODON_MEANINGS, DNA_BASES, RNA_BASES, codonTable, isPurine, pairDna, parseDna, splitCodons, toRna,
  type AminoAcid, type Base, type CodonMeaning, type DnaBase, type RnaBase,
} from "./k7-codons";
export { AMINO_GROUP_COLORS, ATOMIC_RIBBON, BASE_COLORS, BASE_INK, ELEMENT_COLORS, STRAND_TINTS, aminoGroup, type Element, type StrandTint } from "./k7-palette";
export { CLOSED, NM_PER_ANGSTROM, axisX, duplexPose, helixSpec, makePoses, strandAlongCurve, type NucleotidePose, type OpenSpan } from "./k7-geometry";
export { K7_MOTION } from "./k7-motion";
export { MolecularStage, type MolecularView } from "./MolecularStage";
export { GeneLabBench3D, K7_BENCH_SLOTS } from "./bench/GeneLabBench3D";
export { Microscope3D } from "./bench/Microscope3D";
export { Thermocycler3D, TubeRack3D } from "./bench/Thermocycler3D";
export { DnaDuplex3D, type DuplexHighlight, type DuplexRepresentation } from "./molecules/DnaDuplex3D";
export { NucleotidePool3D } from "./molecules/NucleotidePool3D";
export { NucleotideStrand3D, useEasedLayout } from "./molecules/NucleotideStrand3D";
export { Enzyme3D } from "./molecules/Enzyme3D";
export { Ribosome3D } from "./molecules/Ribosome3D";
export { Trna3D } from "./molecules/Trna3D";
export { Polypeptide3D } from "./molecules/Polypeptide3D";
export { AngstromRuler3D } from "./molecules/AngstromRuler3D";
export { Follow, useDamped } from "./molecules/motion";
export { TextLabel } from "./molecules/labels";
export { SequenceDiagram2D, type DiagramBox, type DiagramBracket, type DiagramChain, type DiagramPairing, type DiagramTrack } from "./two-d/SequenceDiagram2D";
export { K7Hud, type K7Station } from "./hud/K7Hud";
export { BasePicker, SequenceTrack, type TrackRow } from "./hud/SequenceTrack";
export { CodonTable } from "./hud/CodonTable";
