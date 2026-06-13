// npc.js - NPC creation, patrol, and 索敵AI（視界＋音）
// 視界チェックと聴覚による検知をここで担当。audio.jsから音情報を取得。

(function() {
  const CONFIG = window.CONFIG || {};

let npcData = null; // 将来 JSON からロード

function createNPCs(scene) {
  if (!scene) return;

  // テスト用配置（data/npc.json相当の値を使用） - scaled for 3000 map
  const openPositions = [
    { x: 1800, y: 450 }, { x: 2400, y: 900 }, { x: 2400, y: 2100 },
    { x: 1800, y: 2400 }, { x: 2100, y: 1500 }
  ];
  const coverPositions = [
    { x: 650, y: 1400 }, { x: 2100, y: 650 }, { x: 1100, y: 2100 }
  ];

  const allPositions = [...openPositions, ...coverPositions];
  scene.npcs = [];

  allPositions.forEach((pos) => {
    const npc = scene.physics.add.sprite(pos.x, pos.y, 'npc');
    npc.setScale(1.5);
    npc.body.setCollideWorldBounds(true);

    // 状態
    npc.viewFailCount = 0;
    npc.hits = 0;
    npc.flashTimer = 0;
    npc.maxHp = 100; // default max HP for enemies
    npc.hits = 0;
    // Show remaining HP above head (max HP as requested, but shows current to see depletion)
    const remaining = Math.max(0, npc.maxHp - npc.hits);
    npc.hpText = scene.add.text(pos.x, pos.y - 35, remaining.toString(), {
      fontSize: '10px',
      fill: '#ffff00',
      backgroundColor: '#00000088',
      padding: {x: 2, y: 1}
    }).setDepth(1000).setOrigin(0.5, 1);

    // Patrol
    npc.patrolSpeed = CONFIG.NPC_PATROL_SPEED;
    npc.targetX = null;
    npc.targetY = null;
    npc.lastPatrolTime = 0;
    npc.lastFootstepTime = 0;
    npc.footstepInterval = CONFIG.FOOTSTEP_INTERVAL;

    // 索敵AI用 (Phase5 / 5.5)
    npc.detectedPlayer = false;
    npc.alertLevel = 0;           // 0=patrol, 1=investigating, 2=chasing, 3=searching
    npc.state = 'patrol';
    npc.lastHeardGunshot = 0;
    npc.lastKnownPlayerX = null;
    npc.lastKnownPlayerY = null;
    npc.searchTimer = 0;
    npc.facingAngle = 0;          // 移動方向ベースの向き

    scene.npcs.push(npc);
  });

  if (scene.obstacles) {
    scene.physics.add.collider(scene.npcs, scene.obstacles);
  }

  console.log(`[npc] ${scene.npcs.length} NPCs created with detection AI`);
}

function pickNewTarget(npc, currentTime) {
  const attempts = 10;
  const { MAP_WIDTH, MAP_HEIGHT } = CONFIG;

  for (let i = 0; i < attempts; i++) {
    let tx = Phaser.Math.Between(40, MAP_WIDTH - 40);
    let ty = Phaser.Math.Between(40, MAP_HEIGHT - 40);

    let crosses = false;
    const walls = (window.gameScene && window.gameScene.wallRects) || [];
    const GU2 = window.GameUtils || {};
    for (let j = 0; j < walls.length; j++) {
      const r = walls[j];
      if (GU2.lineSegmentIntersectsRect && GU2.lineSegmentIntersectsRect(npc.x, npc.y, tx, ty, r.left, r.top, r.right, r.bottom)) {
        crosses = true;
        break;
      }
    }
    if (!crosses) {
      npc.targetX = tx;
      npc.targetY = ty;
      npc.lastPatrolTime = currentTime || 0;
      return;
    }
  }

  // fallback
  npc.targetX = Phaser.Math.Between(40, MAP_WIDTH - 40);
  npc.targetY = Phaser.Math.Between(40, MAP_HEIGHT - 40);
  npc.lastPatrolTime = currentTime || 0;
}

// === NPC索敵AI: 視界（LOS + 距離 + 簡易FOV） ===
function canSeePlayer(npc, player, wallRects) {
  if (!player || !npc) return false;

  const dx = player.x - npc.x;
  const dy = player.y - npc.y;
  const distance = Math.hypot(dx, dy);

  if (distance > CONFIG.NPC_VISION_RANGE) return false;

  // LOSチェック（壁でブロック）
  const GU = window.GameUtils || {};
  if (!GU.hasLineOfSight || !GU.hasLineOfSight(npc.x, npc.y, player.x, player.y, wallRects)) {
    return false;
  }

  // 簡易FOV（移動方向を向いていると仮定）
  const moveAngle = Math.atan2(npc.body.velocity.y || 0, npc.body.velocity.x || 0);
  let targetAngle = Math.atan2(dy, dx);

  const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - moveAngle), Math.cos(targetAngle - moveAngle)));
  const fovRad = Phaser.Math.DegToRad(CONFIG.NPC_FOV_ANGLE / 2);

  // 止まっている場合は広めに（360度寄り）
  const speed = Math.hypot(npc.body.velocity.x || 0, npc.body.velocity.y || 0);
  if (speed < 5) return true;

  return angleDiff <= fovRad;
}

// === NPC索敵AI: 音を聞く ===
function canHearSounds(npc) {
  const GA = window.GameAudio || {};
  if (!GA.getAudibleSounds) return [];

  const sounds = GA.getAudibleSounds(npc.x, npc.y, CONFIG.NPC_HEARING_RANGE);
  // 一旦足音は拾わない（AI反応オフ）。銃声だけ反応する。仮想イベント自体は残してデバッグ表示は継続。
  return sounds.filter(s => s.type === 'gunshot');
}

// 索敵AIの更新（視界＋音） - expanded per spec
function updateDetection(npc, player, wallRects, time) {
  if (!npc || !player) return;

  const sawPlayer = canSeePlayer(npc, player, wallRects);
  const heardSounds = canHearSounds(npc);

  let newState = npc.state || 'patrol';

  if (sawPlayer) {
    newState = 'chasing';
    npc.detectedPlayer = true;
    npc.lastKnownPlayerX = player.x;
    npc.lastKnownPlayerY = player.y;
    npc.targetX = player.x + (Math.random() - 0.5) * 40;
    npc.targetY = player.y + (Math.random() - 0.5) * 40;
    npc.lastPatrolTime = time;
  } else {
    npc.detectedPlayer = false;
  }

  // Hearing - 一旦足音は拾わないので銃声のみ
  const gunshot = heardSounds.find(s => s.type === 'gunshot');

  if (gunshot && (time - (npc.lastHeardGunshot || 0) > 700)) {
    if (newState !== 'chasing') newState = 'investigating';
    npc.lastHeardGunshot = time;

    const sound = gunshot;
    const dx = sound.x - npc.x;
    const dy = sound.y - npc.y;
    const len = Math.hypot(dx, dy) || 1;
    npc.targetX = npc.x + (dx / len) * 160 + (Math.random() - 0.5) * 60;
    npc.targetY = npc.y + (dy / len) * 160 + (Math.random() - 0.5) * 60;
    npc.lastPatrolTime = time;
    npc.lastKnownPlayerX = sound.x;
    npc.lastKnownPlayerY = sound.y;
  }

  // State machine transitions
  if (newState === 'chasing' && !sawPlayer) {
    newState = 'searching';
    npc.searchTimer = time + 6000; // search for 6s
    if (npc.lastKnownPlayerX && npc.lastKnownPlayerY) {
      npc.targetX = npc.lastKnownPlayerX + (Math.random() - 0.5) * 120;
      npc.targetY = npc.lastKnownPlayerY + (Math.random() - 0.5) * 120;
    }
  }

  if (newState === 'searching' && time > (npc.searchTimer || 0)) {
    newState = 'patrol';
    npc.lastKnownPlayerX = null;
    npc.lastKnownPlayerY = null;
  }

  if (newState !== npc.state) {
    npc.state = newState;
    npc.alertLevel = (newState === 'patrol') ? 0 : (newState === 'investigating' || newState === 'searching') ? 1 : 2;

    // Visual feedback (no explicit ! ? icons - player reads behavior)
    if (npc.alertLevel >= 2) npc.setTint(0xff6666);
    else if (npc.alertLevel === 1) npc.setTint(0xffaa44);
    else if (!npc.flashTimer) npc.clearTint();
  }

  if (!npc.flashTimer && npc.alertLevel < 2 && npc.state === 'patrol') {
    npc.clearTint();
  }
}

function updateNPCs(scene, time) {
  if (!scene.npcs || !scene.player) return;

  const now = time;
  const npcs = scene.npcs;
  const walls = scene.wallRects || [];

  npcs.forEach(npc => {
    // 索敵AI（視界＋音）
    if (window.GameAudio) {
      updateDetection(npc, scene.player, walls, now);
    }

    // パトロールロジック
    if (!npc.targetX || !npc.targetY) {
      pickNewTarget(npc, now);
      return;
    }

    const dx = npc.targetX - npc.x;
    const dy = npc.targetY - npc.y;
    const dist = Math.hypot(dx, dy);

    const patrolInterval = Phaser.Math.Between(3000, 5000);
    if (dist < 18 || (now - npc.lastPatrolTime > patrolInterval)) {
      pickNewTarget(npc, now);
      npc.setVelocity(0, 0);
      return;
    }

    // 移動
    const len = dist || 1;
    const vx = (dx / len) * npc.patrolSpeed;
    const vy = (dy / len) * npc.patrolSpeed;
    npc.setVelocity(vx, vy);

    // 壁にぶつかったら再選択
    if (npc.body.blocked.up || npc.body.blocked.down ||
        npc.body.blocked.left || npc.body.blocked.right) {
      pickNewTarget(npc, now);
      return;
    }

    // Keep HP text above head, update to current remaining HP
    if (npc.hpText) {
      const remaining = Math.max(0, npc.maxHp - npc.hits);
      npc.hpText.setPosition(npc.x, npc.y - 35);
      npc.hpText.setText(remaining.toString());
    }

    // 足音（移動中のみ。止まってるNPCがタイマーだけで音を撒かないように）
    const npcSpeed = Math.hypot(npc.body.velocity.x || 0, npc.body.velocity.y || 0);
    if (npcSpeed > 8 && (now - npc.lastFootstepTime > npc.footstepInterval)) {
      if (window.GameAudio && window.GameAudio.emitFootstep) window.GameAudio.emitFootstep(npc);
      npc.lastFootstepTime = now;
    }

    // 被弾フラッシュ更新
    if (npc.flashTimer > 0) {
      npc.flashTimer--;
      if (npc.flashTimer <= 0) {
        npc.clearTint();
        // 警戒状態を復元
        if (npc.alertLevel >= 2) npc.setTint(0xff6666);
        else if (npc.alertLevel === 1) npc.setTint(0xffaa44);
      }
    }
  });
}

window.GameNPC = {
  createNPCs,
  updateNPCs,
  canSeePlayer,
  canHearSounds,
  updateDetection
};

})();
