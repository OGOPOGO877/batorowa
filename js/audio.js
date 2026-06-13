// audio.js - Sound event system + player hearing indicators
// NPC索敵AIの「音」部分を担当。視覚インジケータもここで管理。

(function() {
  const CONFIG = window.CONFIG || {};

let recentSounds = [];           // {x, y, type, intensity, time, radius}
let soundDirectionGraphics = []; // player用方向矢印

// 音を発生させる（銃声、足音など）
function emitSound(x, y, type = 'generic', intensity = 1.0, customRadius = null, playReal = true) {
  const radius = (customRadius != null) ? customRadius : (type === 'gunshot' ? 650 : 380);
  recentSounds.push({
    x, y,
    type,
    intensity,
    time: Date.now(),
    radius
  });

  if (!playReal) return;

  // 一旦足音の実再生は完全オフ（プレイヤー本人のループ音だけ残す）
  if (type === 'footstep') return;

  // Play real sound with attenuation (guarded). 足音は特に長いクリップの場合多重で固まりやすいのでaudio.js中央でスロットル管理。
  const scene = window.gameScene;
  if (scene && scene.sound && scene.player) {
    const key = (type === 'gunshot') ? 'shoot' : 'walk';
    if (scene.cache.audio.exists(key)) {
      try {
        const dist = Math.hypot(x - scene.player.x, y - scene.player.y);
        let maxR = radius;
        // Per your spec: gunshot uses 650 radius (debug circle), player footstep half current.
        // Volume: 1.0 at center -> 0 at the circle's edge.
        const vol = Math.max(0, 1 - (dist / maxR));
        if (vol > 0.01) {
          scene.sound.play(key, { volume: vol * intensity });
        }
      } catch (e) {
        // Never let audio issues crash the game loop
        console.warn('Audio play failed (safe to ignore during dev):', e.message);
      }
    }
  }
}

// NPC移動時の足音（一旦拾わない設定：仮想イベントは残してデバッグ円は出すが、AI反応と実音再生はオフ）
function emitFootstep(npc) {
  if (!npc) return;
  // playReal=false で実音は鳴らさない（フリーズ防止 + 拾わない設定）
  emitSound(npc.x, npc.y, 'footstep', 0.65, null, false);
}

// プレイヤー射撃時の銃声（NPCが聞きつける）
function emitGunshot(x, y) {
  emitSound(x, y, 'gunshot', 1.0);
}

// 古い音をクリーンアップ
function cleanupSounds() {
  const now = Date.now();
  recentSounds = recentSounds.filter(s => (now - s.time) < 6500);
}

// 指定位置から聞こえる音を取得（NPC索敵用）
function getAudibleSounds(listenerX, listenerY, maxRange = CONFIG.NPC_HEARING_RANGE) {
  const now = Date.now();
  return recentSounds
    .filter(s => {
      const d = Math.hypot(s.x - listenerX, s.y - listenerY);
      const effectiveRange = s.radius * (s.intensity || 1);
      return d < Math.min(maxRange, effectiveRange);
    })
    .map(s => ({
      ...s,
      dist: Math.hypot(s.x - listenerX, s.y - listenerY)
    }));
}

// プレイヤー周囲の「音の方向」インジケータ（現在の機能維持）
function updateSoundIndicators(scene, player, npcs) {
  // 既存グラフィック破棄
  soundDirectionGraphics.forEach(g => g.destroy());
  soundDirectionGraphics = [];

  if (!player || !npcs) return;

  // Use equipment-modified hearing if available
  let HEARING_RADIUS = CONFIG.HEARING_RADIUS;
  if (window.GamePlayer && window.GamePlayer.getEffectiveHearingRadius) {
    HEARING_RADIUS = window.GamePlayer.getEffectiveHearingRadius();
  }

  npcs.forEach(npc => {
    if (!npc.body) return;

    const distToPlayer = Math.hypot(npc.x - player.x, npc.y - player.y);
    if (distToPlayer > HEARING_RADIUS || distToPlayer < 25) return;

    // 移動中のみ（足音発生中）
    const speed = Math.hypot(npc.body.velocity.x || 0, npc.body.velocity.y || 0);
    if (speed < 10) return;

    const angle = Math.atan2(npc.y - player.y, npc.x - player.x);

    const radius = 82;
    const ix = player.x + Math.cos(angle) * radius;
    const iy = player.y + Math.sin(angle) * radius;

    const g = scene.add.graphics({ x: ix, y: iy }).setDepth(200);
    g.lineStyle(5, 0xffff00, 1.0);
    g.rotation = angle;

    // 方向を指す小さな矢印
    g.strokeTriangle(-4, 5, 0, -6, 4, 5);

    soundDirectionGraphics.push(g);
  });
}

// 必要なら音イベント全体を外部からクリア
function clearAllSounds() {
  recentSounds = [];
}

// For DEBUG visuals
function getRecentSoundsForDebug() {
  return recentSounds.slice(); // copy array
}

window.GameAudio = {
  emitSound,
  emitFootstep,
  emitGunshot,
  cleanupSounds,
  getAudibleSounds,
  updateSoundIndicators,
  clearAllSounds,
  getRecentSoundsForDebug
};

})();
