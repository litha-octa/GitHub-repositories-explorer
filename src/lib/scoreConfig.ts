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
 * Every score threshold in one place so it is easy to tune.
 * Weights are summed only for factors that have data, then normalized to 0–100.
 */
export const SCORE_CONFIG: ScoreConfig = {
  lastCommit: {
    weight: 35,
    fullBelowDays: 30, // < 30 days → full
    halfBelowDays: 182, // < 6 months → half
    zeroAboveDays: 365, // > 1 year → zero
    /** Value for 6 months – 1 year (a gap the original plan left open). */
    betweenValue: 0.25,
  },
  issueClose: {
    weight: 25,
    fullBelowDays: 7, // median < 7 days → full
    halfBelowDays: 30, // < 30 days → half, ≥ 30 days → zero
  },
  release: {
    weight: 20,
    fullWithinDays: 182, // ≤ 6 months → full; older or never released → zero
  },
  license: {
    weight: 20,
  },
  status: {
    activeMinScore: 70,
    slowingMinScore: 40,
    /** Last commit older than this → Inactive, whatever the score. */
    inactiveAfterDays: 365,
  },
};
