// world.js - Map, obstacles, background, LOS geometry

(function() {
  const CONFIG = window.CONFIG || {};

function createWorld(scene) {
  scene.physics.world.setBounds(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);

  // Background
  const bg = scene.add.graphics();
  bg.fillStyle(0x1a2639, 1);
  bg.fillRect(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);

  // Static obstacles group
  scene.obstacles = scene.physics.add.staticGroup();
  scene.wallRects = [];   // LOS専用（壁のみ）

  // === TEST用 簡易遮蔽物 (scaled for larger map) ===
  // 縦の壁（左側をブロック） ← LOS対象
  const wallV = scene.obstacles.create(800, 1400, null);
  wallV.setSize(22, 320).setDisplaySize(22, 320).setTint(0x777777);

  scene.wallRects.push({
    left: 800 - 11,
    top: 1400 - 160,
    right: 800 + 11,
    bottom: 1400 + 160
  });

  // 上側の岩（LOS対象外）
  const rockU = scene.obstacles.create(1600, 700, null);
  rockU.setSize(70, 45).setDisplaySize(70, 45).setTint(0x555555);

  // 下側の木（部分遮蔽テスト）
  const treeD = scene.obstacles.create(1100, 2000, null);
  treeD.setSize(48, 68).setDisplaySize(48, 68).setTint(0x2e8b57);
  scene.add.rectangle(1100, 2000 - 24, 38, 34, 0x228B22).setDepth(10);

  // 右下の岩
  const rockR = scene.obstacles.create(2000, 1800, null);
  rockR.setSize(55, 50).setDisplaySize(55, 50).setTint(0x555555);

  // 視界テスト用に明るいオブジェクト
  scene.add.rectangle(2200, 1300, 40, 40, 0x00ff00).setDepth(5);
  scene.add.text(2200, 1340, 'VISIBLE?', { fontSize: '12px', color: '#0f0' }).setOrigin(0.5).setDepth(5);

  // Camera
  scene.cameras.main.setBounds(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);

  // Zone (shrinking safe area) - Phase10
  scene.zone = {
    graphics: scene.add.graphics().setDepth(20),
    currentRadius: CONFIG.ZONE_INITIAL_RADIUS,
    centerX: CONFIG.MAP_WIDTH / 2,
    centerY: CONFIG.MAP_HEIGHT / 2,
    lastShrinkTime: 0,
    damageTimer: 0
  };
  drawZone(scene);

  console.log('[world] World and obstacles created');
}

function drawZone(scene) {
  if (!scene.zone) return;
  const z = scene.zone;
  z.graphics.clear();

  // Poison area (outside safe zone)
  z.graphics.fillStyle(0x00aa00, 0.15);
  z.graphics.fillRect(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);

  // Safe zone (cut out)
  z.graphics.fillStyle(0x000000, 0);
  z.graphics.fillCircle(z.centerX, z.centerY, z.currentRadius);

  // Zone border
  z.graphics.lineStyle(4, 0x00ff00, 0.9);
  z.graphics.strokeCircle(z.centerX, z.centerY, z.currentRadius);

  // Next shrink hint (smaller circle)
  if (z.currentRadius > CONFIG.ZONE_MIN_RADIUS + 10) {
    z.graphics.lineStyle(2, 0x00ff00, 0.4);
    z.graphics.strokeCircle(z.centerX, z.centerY, Math.max(CONFIG.ZONE_MIN_RADIUS, z.currentRadius - CONFIG.ZONE_SHRINK_AMOUNT));
  }
}

function updateZone(scene, time, delta, player) {
  if (!scene.zone || !player) return;
  const z = scene.zone;

  // Shrinking
  if (time - z.lastShrinkTime > CONFIG.ZONE_SHRINK_INTERVAL && z.currentRadius > CONFIG.ZONE_MIN_RADIUS) {
    z.currentRadius = Math.max(CONFIG.ZONE_MIN_RADIUS, z.currentRadius - CONFIG.ZONE_SHRINK_AMOUNT);
    z.lastShrinkTime = time;
    drawZone(scene);
    console.log('[zone] Shrunk to', Math.floor(z.currentRadius));
  }

  // Damage if outside
  const dist = Math.hypot(player.x - z.centerX, player.y - z.centerY);
  if (dist > z.currentRadius) {
    z.damageTimer += delta;
    if (z.damageTimer > 1) {
      // Apply damage (we'll hook into player HP in player.js)
      if (window.GamePlayer && window.GamePlayer.applyZoneDamage) {
        window.GamePlayer.applyZoneDamage(player, CONFIG.ZONE_DAMAGE_PER_SECOND);
      }
      z.damageTimer = 0;
    }
  } else {
    z.damageTimer = 0;
  }
}

window.GameWorld = { createWorld, updateZone, drawZone };

})();
