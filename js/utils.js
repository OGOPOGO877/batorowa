// utils.js - Shared helper functions

(function() {
  const CONFIG = window.CONFIG || {};
  // Note: GameUtils local for internal, assigned to window at bottom

  function lineSegmentIntersectsRect(x1, y1, x2, y2, minX, minY, maxX, maxY) {
  // Player/NPC → target の線分が軸平行矩形（壁）と交差するかを判定
  // 安定性優先のシンプル実装
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        t0 = Math.max(t0, t);
      } else {
        t1 = Math.min(t1, t);
      }
      if (t0 > t1) return false;
    }
  }
  return true;
}

function angleDiffDeg(a, b) {
  let diff = Math.abs(a - b);
  diff = Math.min(diff, 360 - diff);
  return diff;
}

function normalizeAngle(rad) {
  return Math.atan2(Math.sin(rad), Math.cos(rad));
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Simple LOS check against wallRects (only walls block)
function hasLineOfSight(x1, y1, x2, y2, wallRects) {
  if (!wallRects || wallRects.length === 0) return true;
  for (let i = 0; i < wallRects.length; i++) {
    const r = wallRects[i];
    if (lineSegmentIntersectsRect(x1, y1, x2, y2, r.left, r.top, r.right, r.bottom)) {
      return false;
    }
  }
  return true;
}

window.GameUtils = {
  lineSegmentIntersectsRect,
  angleDiffDeg,
  normalizeAngle,
  dist,
  hasLineOfSight
};

})();
