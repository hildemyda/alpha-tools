// Daftar fitur yang ikut sistem kredit + berapa kredit yang dipotong tiap
// kali dipakai. Nambah fitur baru ke sistem kredit = tinggal tambah 1 baris
// di sini (dan sinkronkan manual ke FEATURE_COSTS di admin/script.js buat
// tampilan referensinya di dashboard).
//
// cost: 0 -> fitur itu GRATIS, gak potong kredit sama sekali, apapun sisa
// kreditnya. Fitur yang gak terdaftar di sini otomatis dianggap cost: 1.
export const FEATURES = {
  igdl: { label: 'IG Downloader', cost: 1 },
  brat: { label: 'Brat Maker', cost: 1 },
  removebg: { label: 'Remove BG', cost: 0 }, // masih gratis buat sekarang
};

export function getFeatureCost(feature) {
  return FEATURES[feature]?.cost ?? 1;
}
