

import * as deep from "deep-diff";

export type SUDiff = deepDiff.IDiff[];
export function diff(lhs: Object, rhs: Object, prefilter?: deepDiff.IPrefilter, acc?: deepDiff.IAccumulator): SUDiff {
  const ret = deep.diff(lhs, rhs, prefilter, acc);
  return ret != null ? ret : [];
}
