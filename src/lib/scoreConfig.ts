export interface ScoreConfig {
  lastCommit: {
    weight: number;
    fullBelowDays: number;
    halfBelowDays: number;
    zeroAboveDays: number;
    betweenValue: number;
  };
  issueClose: { weight: number; fullBelowDays: number; halfBelowDays: number };
  release: { weight: number; fullWithinDays: number };
  license: { weight: number };
  status: { activeMinScore: number; slowingMinScore: number; inactiveAfterDays: number };
}

/**
 * Semua ambang skor di satu tempat supaya mudah disesuaikan.
 * Bobot dijumlahkan hanya untuk faktor yang datanya tersedia, lalu dinormalisasi ke 0–100.
 */
export const SCORE_CONFIG: ScoreConfig = {
  lastCommit: {
    weight: 35,
    fullBelowDays: 30, // < 30 hari → nilai penuh
    halfBelowDays: 182, // < 6 bulan → setengah
    zeroAboveDays: 365, // > 1 tahun → nol
    /** Nilai untuk 6 bulan – 1 tahun (celah yang tidak diatur di rencana awal). */
    betweenValue: 0.25,
  },
  issueClose: {
    weight: 25,
    fullBelowDays: 7, // median < 7 hari → penuh
    halfBelowDays: 30, // < 30 hari → setengah, ≥ 30 hari → nol
  },
  release: {
    weight: 20,
    fullWithinDays: 182, // ≤ 6 bulan → penuh; lebih lama atau belum pernah → nol
  },
  license: {
    weight: 20,
  },
  status: {
    activeMinScore: 70,
    slowingMinScore: 40,
    /** Commit terakhir lebih lama dari ini → Tidak aktif, berapa pun skornya. */
    inactiveAfterDays: 365,
  },
};
