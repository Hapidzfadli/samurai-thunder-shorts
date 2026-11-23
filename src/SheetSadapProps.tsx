import React from "react";
import { Item, Sheet, sheetHeight } from "./SheetMolaseProps";
import * as S from "./three/objectsSadapProps";

const ISTANA: Item[] = [
  { span: 2, name: "Fasad istana", note: "gaya Palladian, pilar Ionia putih, tangga", el: <S.IstanaFacade />, w: 16, h: 8 },
  { name: "Tiang bendera", note: "Merah Putih berkibar", el: <S.Flagpole />, w: 2.4, h: 9.3 },
  { name: "Monas", note: "di seberang istana (latar jauh)", el: <S.Monas />, w: 9, h: 27.5 },
  { name: "Pos jaga", note: "pos penjaga putih", el: <S.PalaceGuard />, w: 1.2, h: 4.2 },
  { name: "Pagar tanaman", note: "taman rapi", el: <S.Hedge len={3} />, w: 3, h: 1.5 },
  { span: 2, name: "Mobil dinas hitam", note: "sedan hitam rombongan", el: <S.BlackCar />, w: 4.8, h: 1.9 },
];
const RUANG_KERJA: Item[] = [
  { name: "Meja kerja", note: "kayu jati, berkas, bendera mini", el: <S.PresDesk />, w: 3.3, h: 1.3 },
  { name: "Kursi besar", note: "kursi kulit", el: <S.BigChair />, w: 1.1, h: 2.2 },
  { name: "Bendera Merah Putih", note: "bendera di tiang", el: <S.FlagStandMP />, w: 1.6, h: 3.2 },
  { name: "Lambang emas", note: "plakat elang (bukan lambang resmi)", el: <S.GoldEmblem pos={[0, 0.75, 0]} />, w: 1.5, h: 1.6 },
  { name: "Sofa tamu", note: "sofa merah marun", el: <S.Sofa />, w: 2.5, h: 1.3 },
  { name: "Meja tamu", note: "cangkir teh, mangkuk", el: <S.CoffeeTable />, w: 1.5, h: 0.6 },
  { name: "Pilar ukir Jepara", note: "kayu ukir (riset: ada di istana)", el: <S.CarvedPillar />, w: 0.7, h: 4.6 },
  { name: "Kasur kucing", note: "tempat tidur Bobby + bola", el: <S.CatBed />, w: 1.2, h: 0.5 },
  { name: "Lukisan", note: "bingkai emas, pemandangan", el: <S.PortraitFrame pos={[0, 0.8, 0]} />, w: 1.3, h: 1.6 },
  { name: "HP", note: "ponsel yang disadap", el: <S.Smartphone pos={[0, 0.1, 0]} s={6} />, w: 0.6, h: 1.1 },
];
const SERVER: Item[] = [
  { name: "Rak server", note: "lampu kedip", el: <S.ServerRack t={0.7} />, w: 1, h: 2.4 },
  { name: "Mesin LIMS", note: "corong nomor + layar gelombang", el: <S.LimsMachine t={0.5} />, w: 3.2, h: 4.4 },
  { name: "Meja operator", note: "2 monitor, kopi, headset", el: <S.OpsDesk t={0.5} />, w: 3.1, h: 1.6 },
  { name: "Pintu VERIFIKASI", note: "dirantai + sarang laba-laba", el: <S.VerifDoor />, w: 1.9, h: 3 },
  { name: "Map SOP", note: "berdebu, tak pernah dibuka", el: <S.SopBinder />, w: 0.6, h: 0.5 },
  { name: "Mesin penghancur", note: "kertas tercacah", el: <S.Shredder />, w: 0.7, h: 1.1 },
  { name: "Monitor 'HAPUS'", note: "layar merah", el: <S.Monitor mode="delete" />, w: 1.1, h: 0.9 },
  { name: "Kabel", note: "kabel warna-warni", el: <S.CableBundle len={2.4} />, w: 2.5, h: 0.4 },
];
const WARUNG: Item[] = [
  { name: "Etalase warung", note: "toples, termos", el: <S.WarungCounter />, w: 3.4, h: 1.7 },
  { name: "Renceng kopi sachet", note: "digantung di depan", el: <S.Sachets pos={[0, 1.2, 0]} />, w: 2, h: 1.3 },
  { name: "Kaleng kerupuk", note: "kerupuk kaleng biru", el: <S.Kerupuk />, w: 0.6, h: 1 },
  { name: "TV dinding", note: "BREAKING NEWS", el: <S.WallTV pos={[0, 0.8, 0]} />, w: 2, h: 1.6 },
  { name: "Kursi plastik", note: "merah & hijau", el: <group><S.PlasticStool /><S.PlasticStool pos={[0.6, 0, 0]} color="#2bb673" /></group>, w: 1.1, h: 0.5 },
  { name: "Bangku panjang", note: "kayu", el: <S.LongBench />, w: 2.6, h: 0.5 },
  { name: "Tenda belang", note: "atap hijau-putih", el: <S.Awning pos={[0, 2.8, 0]} w={3} />, w: 3.2, h: 3.0 },
  { name: "Gerobak", note: "kopi & gorengan", el: <S.Gerobak />, w: 2, h: 2.5 },
];
const BARESKRIM: Item[] = [
  { span: 2, name: "Gedung Bareskrim", note: "gedung kantor + papan nama", el: <S.PoliceHQ />, w: 14.4, h: 8.4 },
  { name: "Papan bukti", note: "foto + benang merah", el: <S.EvidenceBoard pos={[0, 0.9, 0]} />, w: 2.6, h: 1.8 },
  { name: "Tumpukan berkas", note: "map perkara", el: <S.CaseFiles />, w: 0.6, h: 0.5 },
  { span: 2, name: "Meja sidang etik", note: "taplak hijau, papan nama, mikrofon", el: <S.EthicsTable />, w: 5, h: 1.2 },
  { name: "Panji kepolisian", note: "bendera cokelat + bintang (generik)", el: <S.PoliceFlag />, w: 1.6, h: 3 },
  { name: "Telepon & jam", note: "perabot kantor", el: <group><S.Telephone /><S.WallClock pos={[0.8, 0.6, 0]} /></group>, w: 2.2, h: 1.2 },
];
export const H_SADAP = {
  Istana: sheetHeight(ISTANA, 4),
  Kerja: sheetHeight(RUANG_KERJA, 5),
  Server: sheetHeight(SERVER, 4),
  Warung: sheetHeight(WARUNG, 4),
  Bareskrim: sheetHeight(BARESKRIM, 4),
};
export const SheetSadapIstana: React.FC = () => <Sheet title="PROPERTI · LUAR · ISTANA" sub="Riset: Istana Merdeka bergaya Palladian dengan pilar Yunani, lobi terbuka bertangga, menghadap Monas" items={ISTANA} cols={4} bg={["#e6f2ff", "#ffe9cf"]} />;
export const SheetSadapKerja: React.FC = () => <Sheet title="PROPERTI · DALAM · RUANG KERJA PRESIDEN" sub="Riset: sebagian pilar istana dibalut kayu ukir Jepara; tata ruang kerja asli tidak dipublikasikan, jadi memakai unsur kantor kenegaraan umum" items={RUANG_KERJA} cols={5} bg={["#fff2d8", "#f0d8d0"]} />;
export const SheetSadapServer: React.FC = () => <Sheet title="PROPERTI · DALAM · RUANG SERVER LIMS" sub="Riset: nomor diduga dimasukkan ke LIMS tanpa verifikasi; rekaman diduga dihapus Oktober 2026 (versi sarkas)" items={SERVER} cols={4} bg={["#d8e4f4", "#c8d0e8"]} />;
export const SheetSadapWarung: React.FC = () => <Sheet title="PROPERTI · LUAR · WARUNG KOPI" sub="Tempat warga menonton berita di TV" items={WARUNG} cols={4} bg={["#fff2d8", "#ffe0c0"]} />;
export const SheetSadapBareskrim: React.FC = () => <Sheet title="PROPERTI · BARESKRIM & SIDANG ETIK" sub="Riset: Bareskrim menetapkan tersangka; sidang etik dijadwalkan 17 November 2026. Logo memakai bentuk generik" items={BARESKRIM} cols={4} bg={["#f4ead8", "#e0d0b8"]} />;
