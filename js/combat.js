// combat.js - Shooting, bullets, hit detection, effects

(function() {
  const CONFIG = window.CONFIG || {};

let bullets = [];
let hitEffects = [];

// 武器ステータスはここに全部集約（一箇所でいじれるようにした）
// カラム: ダメージ, 弾速, 連射間隔(ms), 拡散, ペレット, マガジン, リロード(ms)
const hgStats = {
  name: "ハンドガン",
  damage: 5,
  bulletSpeed: 280,
  fireRate: 350,
  spread: 0,
  pellets: 1,
  magSize: 12,
  reloadTime: 1200
};
const smgStats = {
  name: "SMG",
  damage: 8,
  bulletSpeed: 220,
  fireRate: 120,
  spread: 3,
  pellets: 1,
  magSize: 24,
  reloadTime: 1400
};
const arStats = {
  name: "AR",
  damage: 10,
  bulletSpeed: 320,
  fireRate: 200,
  spread: 1,
  pellets: 1,
  magSize: 20,
  reloadTime: 1500
};
const sgStats = {
  name: "SG",
  damage: 10,
  bulletSpeed: 200,
  fireRate: 120,
  spread: 25,
  pellets: 8,
  magSize: 2,
  reloadTime: 1800
};
const srStats = {
  name: "SR",
  damage: 60,
  bulletSpeed: 450,
  fireRate: 800,
  spread: 0,
  pellets: 1,
  magSize: 2,
  reloadTime: 2000
};

const WEAPON_STATS = {
  hg: hgStats,
  pistol: hgStats,
  smg: smgStats,
  ar: arStats,
  sg: sgStats,
  sr: srStats
};

function getWeaponData(weaponKey) {
  // Prefer global WEAPONS_DATA (e.g. from test.html for easy tweaking) if present
  if (window.WEAPONS_DATA && window.WEAPONS_DATA[weaponKey]) {
    console.log('[combat] getWeaponData for', weaponKey, '-> from window.WEAPONS_DATA, damage:', window.WEAPONS_DATA[weaponKey].damage);
    return window.WEAPONS_DATA[weaponKey];
  }
  if (WEAPON_STATS[weaponKey]) {
    console.log('[combat] getWeaponData for', weaponKey, '-> direct match, damage:', WEAPON_STATS[weaponKey].damage);
    return WEAPON_STATS[weaponKey];
  }
  // fallback for old keys like 'pistol'
  const keyMap = {
    pistol: 'hg',
    hg: 'hg',
    smg: 'smg',
    ar: 'ar',
    sg: 'sg',
    sr: 'sr'
  };
  const realKey = keyMap[weaponKey] || weaponKey;
  if (WEAPON_STATS[realKey]) {
    console.log('[combat] getWeaponData for', weaponKey, '-> mapped to', realKey, 'damage:', WEAPON_STATS[realKey].damage);
    return WEAPON_STATS[realKey];
  }
  console.log('[combat] getWeaponData for', weaponKey, '-> FALLBACK damage 1');
  // ultimate fallback
  return {
    name: weaponKey,
    bulletSpeed: CONFIG.BULLET_SPEED,
    damage: 1,
    fireRate: CONFIG.SHOT_COOLDOWN || 350,
    spread: 0,
    pellets: 1,
    magSize: 12,
    reloadTime: 1500
  };
}

function fireBullet(scene, angle, startX, startY, weaponKey = 'pistol') {
  if (!scene) return;

  const w = getWeaponData(weaponKey);
  const bulletSpeed = w.bulletSpeed || CONFIG.BULLET_SPEED;
  const offset = 20;
  const pellets = w.pellets || 1;
  const spread = (w.spread || 0) * (Math.PI / 180); // degrees to rad

  console.log('[combat] fireBullet for weaponKey:', weaponKey, 'damage from data:', w.damage);

  const GA = window.GameAudio || {};
  if (GA.emitGunshot) {
    GA.emitGunshot(startX, startY);
  }

  for (let p = 0; p < pellets; p++) {
    let shotAngle = angle;
    if (spread > 0) {
      shotAngle += (Math.random() - 0.5) * spread * 2;
    }

    const bx = startX + Math.cos(shotAngle) * offset;
    const by = startY + Math.sin(shotAngle) * offset;

    const bullet = scene.add.circle(bx, by, 5, 0xffdd44);
    bullet.setData('vx', Math.cos(shotAngle) * bulletSpeed);
    bullet.setData('vy', Math.sin(shotAngle) * bulletSpeed);
    bullet.setData('life', CONFIG.BULLET_LIFE);
    bullet.setData('damage', w.damage || 1);
    bullet.setData('weapon', weaponKey);

    bullets.push(bullet);
  }
}

function updateBullets(scene, delta, npcs) {
  if (!scene || !bullets) return;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const vx = b.getData('vx') || 0;
    const vy = b.getData('vy') || 0;
    const life = (b.getData('life') || 0) - delta;

    b.x += vx * delta;
    b.y += vy * delta;
    b.setData('life', life);

    if (life <= 0) {
      b.destroy();
      bullets.splice(i, 1);
      continue;
    }

    // NPCとの当たり判定
    for (let j = (npcs ? npcs.length : 0) - 1; j >= 0; j--) {
      const npc = npcs[j];
      if (!npc || typeof npc.hits === 'undefined') continue;

      const d = Math.hypot(npc.x - b.x, npc.y - b.y);
      if (d < CONFIG.HIT_RADIUS) {
        // ヒット処理 (read data BEFORE destroy, because destroy may clear data)
        const dmg = b.getData('damage') || 1;
        const hitWeapon = b.getData('weapon');
        console.log('[combat] bullet hit, dmg applied:', dmg, 'from weapon:', hitWeapon);

        b.destroy();
        bullets.splice(i, 1);

        npc.hits = (npc.hits || 0) + dmg;
        createHitEffect(scene, b.x, b.y);

        // 白フラッシュ（被弾時）
        npc.flashTimer = 10;
        npc.setTint(0xffffff);

        const maxHp = npc.maxHp || 3;
        if (npc.hits >= maxHp) {
          createDeathEffect(scene, npc.x, npc.y);
          if (npc.debugStateText) npc.debugStateText.destroy();
          if (npc.hpText) npc.hpText.destroy();
          npc.destroy();
          npcs.splice(j, 1);
        }
        break;
      }
    }
  }
}

function createHitEffect(scene, x, y) {
  const count = 9;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 1.2;
    const speed = 55 + Math.random() * 55;
    const size = 2.5 + Math.random() * 2.5;

    const g = scene.add.graphics({ x: x, y: y }).setDepth(185);
    g.fillStyle(0xffffaa, 1.0);
    g.fillCircle(0, 0, size);

    hitEffects.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 26 + Math.random() * 8,
      alpha: 1.0
    });
  }

  // 中心コア
  const core = scene.add.graphics({ x: x, y: y }).setDepth(186);
  core.fillStyle(0xffffff, 1.0);
  core.fillCircle(0, 0, 4);

  hitEffects.push({
    graphic: core,
    vx: 0,
    vy: 0,
    life: 10,
    alpha: 1.0
  });
}

function createDeathEffect(scene, x, y) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 70;
    const size = 3 + Math.random() * 3;

    const g = scene.add.graphics({ x: x, y: y }).setDepth(170);
    g.fillStyle(0xffaa00, 0.85);
    g.fillCircle(0, 0, size);

    hitEffects.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 28 + Math.random() * 10,
      alpha: 0.85
    });
  }

  // リング
  const ring = scene.add.graphics({ x: x, y: y }).setDepth(165);
  ring.lineStyle(3, 0xffdd44, 0.7);
  ring.strokeCircle(0, 0, 8);

  hitEffects.push({
    graphic: ring,
    vx: 0,
    vy: 0,
    life: 22,
    alpha: 0.7,
    scaleSpeed: 3.5
  });
}

function updateHitEffects() {
  for (let i = hitEffects.length - 1; i >= 0; i--) {
    const e = hitEffects[i];
    const g = e.graphic;

    e.life--;
    e.alpha = Math.max(0, e.alpha - 0.032);

    if (e.scaleSpeed) {
      const s = 1 + (e.scaleSpeed * (1 - e.life / 22));
      g.scaleX = s;
      g.scaleY = s;
    } else if (e.vx || e.vy) {
      g.x += e.vx * 0.016;
      g.y += e.vy * 0.016;
    }

    g.alpha = e.alpha;

    if (e.life <= 0 || e.alpha <= 0.05) {
      g.destroy();
      hitEffects.splice(i, 1);
    }
  }
}

function getBullets() { return bullets; }
function getHitEffects() { return hitEffects; }

window.GameCombat = {
  fireBullet,
  updateBullets,
  createHitEffect,
  createDeathEffect,
  updateHitEffects,
  getBullets,
  getHitEffects,
  getWeaponData   // これで combat.js だけで武器ステータス全部いじれるようにした
};

// Make data available globally for any legacy code or test.html that checks window.WEAPONS_DATA
window.WEAPONS_DATA = WEAPON_STATS;

})();
