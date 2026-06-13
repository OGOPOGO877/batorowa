// player.js - Player creation, movement, mouse aiming, vision cone

(function() {
  const CONFIG = window.CONFIG || {};

let mouseAngle = 0;
let visionMaskGraphics = null;
let darkOverlay = null;
let geometryMask = null;

// Player state (Phase6 + Phase8)
let playerHP = CONFIG.PLAYER_MAX_HP;
let equipment = {
  armor: null,
  helmet: null,
  goggles: null,
  headset: null
};
let currentWeapon = 'pistol';
let inventory = []; // simple list of picked up item ids

// Ammo & Reload system
let currentAmmo = {};
let isReloading = false;
let reloadStartTime = 0;
let reloadWeapon = null;

function createPlayer(scene) {
  const { MAP_WIDTH, MAP_HEIGHT } = CONFIG;

  scene.player = scene.physics.add.sprite(MAP_WIDTH * 0.4, MAP_HEIGHT * 0.4, 'player');
  scene.player.setScale(2);
  scene.player.setCollideWorldBounds(true);

  if (scene.obstacles) {
    scene.physics.add.collider(scene.player, scene.obstacles);
  }

  scene.cameras.main.startFollow(scene.player, true, 0.9, 0.9);

  // Reset player state
  playerHP = CONFIG.PLAYER_MAX_HP;
  equipment = { armor: null, helmet: null, goggles: null, headset: null };
  currentWeapon = 'pistol';
  inventory = [];

  // Reset ammo & reload
  currentAmmo = {};
  isReloading = false;
  reloadStartTime = 0;
  reloadWeapon = null;

  // Init ammo from data
  const weaponKeys = ['pistol','smg','ar','sr','sg'];
  weaponKeys.forEach(w => {
    const data = window.WEAPONS_DATA ? window.WEAPONS_DATA[w] : null;
    currentAmmo[w] = data ? (data.magSize || 12) : 12;
  });

  // 初回のマウス角度を計算（これをやらないとコーンが変な方向）
  if (typeof updateMouseAngle === 'function') {
    updateMouseAngle(scene);
  }

  // Vision mask (マウス視界の暗闇表現) - effective radius used in updateVisionCone
  darkOverlay = scene.add.graphics().setDepth(50);
  darkOverlay.fillStyle(0x000000, 0.78);
  darkOverlay.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  visionMaskGraphics = scene.add.graphics().setVisible(false);
  geometryMask = new Phaser.Display.Masks.GeometryMask(scene, visionMaskGraphics);
  darkOverlay.setMask(geometryMask);
  geometryMask.setInvertAlpha(true);

  if (typeof updateVisionCone === 'function') {
    updateVisionCone(scene);
  }

  console.log('[player] Player and vision mask created');
  return scene.player;
}

function getEffectiveVisionRadius() {
  let mult = CONFIG.DEFAULT_VISION_MULTIPLIER;
  if (equipment.goggles && equipment.goggles.visionMultiplier) {
    mult = equipment.goggles.visionMultiplier;
  }
  return CONFIG.VISION_RADIUS * mult;
}

function getEffectiveHearingRadius() {
  let mult = CONFIG.DEFAULT_HEARING_MULTIPLIER;
  if (equipment.headset && equipment.headset.hearingMultiplier) {
    mult = equipment.headset.hearingMultiplier;
  }
  return CONFIG.HEARING_RADIUS * mult;
}

function getDamageReduction() {
  let reduction = CONFIG.DEFAULT_DAMAGE_REDUCTION;
  if (equipment.armor && equipment.armor.damageReduction) {
    reduction = equipment.armor.damageReduction;
  }
  return reduction;
}

function applyDamage(amount) {
  const reduction = getDamageReduction();
  const finalDamage = Math.max(0.5, Math.floor(amount * (1 - reduction)));
  playerHP = Math.max(0, playerHP - finalDamage);
  console.log('[player] Damaged', finalDamage, 'HP left:', playerHP);
  return playerHP;
}

function applyZoneDamage(playerObj, dps) {
  // Called from world zone
  applyDamage(dps);
  if (playerHP <= 0) {
    handlePlayerDeath(playerObj.scene);
  }
}

function heal(amount) {
  playerHP = Math.min(CONFIG.PLAYER_MAX_HP, playerHP + amount);
  console.log('[player] Healed', amount, 'HP now:', playerHP);
}

function equipItem(itemData) {
  if (!itemData || !itemData.type) return false;
  if (['armor', 'helmet', 'goggles', 'headset'].includes(itemData.type)) {
    equipment[itemData.type] = itemData;
    console.log('[player] Equipped', itemData.name);
    return true;
  }
  return false;
}

function pickupItem(itemId, itemData) {
  // Simple: if equipment, equip; else add to inventory
  if (equipItem(itemData)) {
    return true;
  }
  inventory.push(itemId);
  console.log('[player] Picked up', itemId);
  return true;
}

function useRecovery() {
  // Use first recovery item from inventory or simulate
  const idx = inventory.findIndex(id => ['bandage', 'medkit', 'adrenaline'].includes(id));
  if (idx !== -1) {
    const id = inventory.splice(idx, 1)[0];
    const amount = (id === 'medkit') ? 3 : 2;
    heal(amount);
    return true;
  }
  // fallback small heal for testing
  heal(1);
  return true;
}

function switchWeapon(weaponKey) {
  // Use short keys like 'hg' to match loot and combat.js WEAPON_STATS
  const keyMap = { hg: 'hg', pistol: 'hg', smg: 'smg', ar: 'ar', sg: 'sg', sr: 'sr' };
  const realKey = keyMap[weaponKey] || weaponKey;
  if (['hg', 'smg', 'ar', 'sg', 'sr'].includes(realKey)) {
    currentWeapon = realKey;
    // 武器持ち替え時にその武器の最大弾数に即時設定（未使用時のみ初期化）
    if (currentAmmo[realKey] == null) {
      let data = null;
      if (window.GameCombat && window.GameCombat.getWeaponData) {
        data = window.GameCombat.getWeaponData(realKey);
      }
      currentAmmo[realKey] = data ? data.magSize || 12 : 12;
    }
    console.log('[player] Switched to', realKey);
    return true;
  }
  return false;
}

function getCurrentWeaponData() {
  // Will be loaded from data later; for now return basic
  return { key: currentWeapon };
}

function handlePlayerDeath(scene) {
  console.log('[player] PLAYER DIED');
  if (scene && scene.player) {
    scene.player.setTint(0x666666);
    scene.player.setVelocity(0, 0);
  }
  // Win condition will be checked in main update
}

function getPlayerHP() { return playerHP; }
function getEquipment() { return { ...equipment }; }
function getInventory() { return [...inventory]; }
function getCurrentWeapon() { return currentWeapon; }

function getCurrentAmmo() {
  return currentAmmo[currentWeapon] || 0;
}

function isCurrentlyReloading() {
  return isReloading;
}

function getReloadProgress() {
  if (!isReloading || !reloadWeapon) return 0;
  const data = window.WEAPONS_DATA ? window.WEAPONS_DATA[reloadWeapon] : null;
  if (!data) return 1;
  const elapsed = Date.now() - reloadStartTime;
  return Math.min(1, elapsed / (data.reloadTime || 1500));
}

function startReload(weaponKey) {
  if (isReloading) return false;
  let data = null;
  if (window.GameCombat && window.GameCombat.getWeaponData) {
    data = window.GameCombat.getWeaponData(weaponKey);
  } else if (window.WEAPONS_DATA) {
    data = window.WEAPONS_DATA[weaponKey];
  }
  if (!data) return false;
  if ((currentAmmo[weaponKey] || 0) >= (data.magSize || 0)) return false;

  isReloading = true;
  reloadStartTime = Date.now();
  reloadWeapon = weaponKey;
  console.log('[player] Reloading', weaponKey);
  return true;
}

function updateReload(scene, time) {
  if (!isReloading || !reloadWeapon) return;
  let data = null;
  if (window.GameCombat && window.GameCombat.getWeaponData) {
    data = window.GameCombat.getWeaponData(reloadWeapon);
  } else if (window.WEAPONS_DATA) {
    data = window.WEAPONS_DATA[reloadWeapon];
  }
  if (!data) {
    isReloading = false;
    reloadWeapon = null;
    return;
  }
  if (Date.now() - reloadStartTime >= (data.reloadTime || 1500)) {
    currentAmmo[reloadWeapon] = data.magSize || 12;
    isReloading = false;
    reloadWeapon = null;
    console.log('[player] Reload complete for', reloadWeapon || 'weapon');
  }
}

function tryToFire(weaponKey) {
  if (isReloading) return false;

  let data = null;
  if (window.GameCombat && window.GameCombat.getWeaponData) {
    data = window.GameCombat.getWeaponData(weaponKey);
  } else if (window.WEAPONS_DATA) {
    data = window.WEAPONS_DATA[weaponKey];
  }
  if (!data) return true; // allow fire if no data (fallback)

  if (currentAmmo[weaponKey] == null) {
    currentAmmo[weaponKey] = data.magSize || 12;
  }

  if (currentAmmo[weaponKey] <= 0) {
    startReload(weaponKey);
    return false;
  }

  currentAmmo[weaponKey]--;
  return true;
}

function updatePlayerMovement(scene, cursors, wasd, delta) {
  if (!scene.player) return;

  const speed = CONFIG.PLAYER_SPEED;
  let vx = 0, vy = 0;

  if (cursors.left.isDown || wasd.A.isDown) vx -= 1;
  if (cursors.right.isDown || wasd.D.isDown) vx += 1;
  if (cursors.up.isDown || wasd.W.isDown) vy -= 1;
  if (cursors.down.isDown || wasd.S.isDown) vy += 1;

  if (vx !== 0 && vy !== 0) {
    vx *= 0.7071;
    vy *= 0.7071;
  }

  scene.player.setVelocity(vx * speed, vy * speed);
}

function updateMouseAngle(scene) {
  if (!scene.player || !scene.input) return;

  const pointer = scene.input.activePointer;
  const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  mouseAngle = Math.atan2(worldPoint.y - scene.player.y, worldPoint.x - scene.player.x);

  // expose
  scene.mouseAngle = mouseAngle;
}

function getMouseAngle() {
  return mouseAngle;
}

// マウス視界コーン更新（マスク） - uses effective radius from equipment
function updateVisionCone(scene) {
  if (!visionMaskGraphics || !scene.player) return;

  const effectiveRadius = (typeof getEffectiveVisionRadius === 'function')
    ? getEffectiveVisionRadius()
    : CONFIG.VISION_RADIUS;

  const { FOV_ANGLE } = CONFIG;
  const half = Phaser.Math.DegToRad(FOV_ANGLE / 2);

  const angle = (typeof mouseAngle === 'number' && isFinite(mouseAngle)) ? mouseAngle : 0;

  visionMaskGraphics.clear();
  visionMaskGraphics.fillStyle(0xffffff, 1);
  visionMaskGraphics.slice(
    scene.player.x,
    scene.player.y,
    effectiveRadius,
    angle - half,
    angle + half,
    false
  );
  visionMaskGraphics.fillPath();
}

// プレイヤーの視界によるNPCの表示/非表示（ヒステリシス付き）
// 元の updateNPCVisibility をここに移動（機能維持）
function updateNPCVisibility(scene) {
  if (!scene.player || !scene.npcs || !scene.wallRects) return;

  // Use effective radius (goggles etc. increase actual visible range to match the cone)
  const effectiveRadius = (typeof getEffectiveVisionRadius === 'function')
    ? getEffectiveVisionRadius()
    : CONFIG.VISION_RADIUS;

  const { FOV_ANGLE } = CONFIG;
  const halfFOV = FOV_ANGLE / 2;
  const mouseDeg = (mouseAngle * 180) / Math.PI;

  const npcs = scene.npcs;

  npcs.forEach(npc => {
    if (typeof npc.viewFailCount === 'undefined') npc.viewFailCount = 0;

    const dx = npc.x - scene.player.x;
    const dy = npc.y - scene.player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > effectiveRadius) {
      npc.setVisible(false);
      npc.viewFailCount = 0;
      return;
    }

    let npcAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    let diff = Math.abs(npcAngle - mouseDeg);
    diff = Math.min(diff, 360 - diff);

    const wasVisible = npc.visible || (npc.viewFailCount < 2);
    const releaseThreshold = halfFOV + 18;
    const acquireThreshold = halfFOV;
    const threshold = wasVisible ? releaseThreshold : acquireThreshold;
    const inCone = diff <= threshold;

    // LOS (壁のみ)
    const GU = window.GameUtils || {};
    let blocked = !GU.hasLineOfSight ||
      !GU.hasLineOfSight(
        scene.player.x, scene.player.y,
        npc.x, npc.y,
        scene.wallRects
      );

    if (inCone && !blocked) {
      npc.setVisible(true);
      npc.viewFailCount = 0;
    } else {
      npc.viewFailCount++;
      if (npc.viewFailCount >= 3) {
        npc.setVisible(false);
      } else {
        npc.setVisible(true);
      }
    }
  });
}

function getPlayer() {
  return window.gameScene ? window.gameScene.player : null;
}

window.GamePlayer = {
  createPlayer,
  updatePlayerMovement,
  updateMouseAngle,
  getMouseAngle,
  updateVisionCone,
  updateNPCVisibility,
  getPlayer,
  // vision / survival
  getEffectiveVisionRadius,
  getEffectiveHearingRadius,
  getDamageReduction,
  applyDamage,
  applyZoneDamage,
  heal,
  equipItem,
  pickupItem,
  useRecovery,
  switchWeapon,
  getCurrentWeaponData,
  getPlayerHP,
  getEquipment,
  getInventory,
  getCurrentWeapon,
  handlePlayerDeath,
  // ammo / reload
  getCurrentAmmo,
  isCurrentlyReloading,
  getReloadProgress,
  tryToFire,
  updateReload,
  startReload
};

})();
