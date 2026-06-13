// main.js - Phaser game bootstrap and main loop orchestration

(function() {
  const CONFIG = window.CONFIG || {};

// Global scene reference for easy cross-module access (debug / simple cases)
let gameScene = null;

// Input
let cursors, wasd, spaceKey;
let lastShotTime = 0;
let lastFrameTime = 0;

function preload() {
  this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
  this.load.image('npc', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');

  // Load sounds and PNG assets as per user spec.
  // Paths are relative to the HTML file location, so they point to the assets folder
  // at the path you mentioned: the 'assets' subfolder inside batorowa-project.
  // e.g. from index.html or test.html in C:\Users\ju-si\Desktop\batorowa-project\
  // 'assets/sounds/walk.wav' resolves to your \\?\C:\Users\ju-si\Desktop\batorowa-project\assets\sounds\walk.wav
  // IMPORTANT: Use a local server (not direct file://) to avoid CORS blocks:
  //   cd C:\Users\ju-si\Desktop\batorowa-project
  //   python -m http.server 8000
  // Then open http://localhost:8000/index.html (or /test.html)
  //
  // Place your files (as you said):
  //   assets/sounds/walk.wav
  //   assets/sounds/shoot.wav
  //   assets/images/weapons/hg.png etc.
  //   assets/images/armor/armor1.png etc.
  //   assets/images/goggles.png
  // (and headset.png, medkit.png as added)
  try {
    this.load.audio('walk', 'assets/sounds/walk.wav');
    this.load.audio('shoot', 'assets/sounds/shoot.wav');

    this.load.image('hg', 'assets/images/weapons/hg.png');
    this.load.image('sg', 'assets/images/weapons/sg.png');
    this.load.image('ar', 'assets/images/weapons/ar.png');
    this.load.image('smg', 'assets/images/weapons/smg.png');
    this.load.image('sr', 'assets/images/weapons/sr.png');

    this.load.image('armor1', 'assets/images/armor/armor1.png');
    this.load.image('armor2', 'assets/images/armor/armor2.png');
    this.load.image('armor3', 'assets/images/armor/armor3.png');
    this.load.image('goggles', 'assets/images/armor/goggles.png');

    // Additional items
    this.load.image('headset', 'assets/images/weapons/headset.png');
    this.load.image('medkit', 'assets/images/items/medkit.png');
  } catch (e) {
    console.warn('Asset load setup issue (expected if running on file://):', e);
  }
}

function create() {
  gameScene = this;
  window.gameScene = this;

  // 1. World
  const GW = window.GameWorld || {};
  if (GW.createWorld) GW.createWorld(this);

  // 2. Player + vision
  const GPc = window.GamePlayer || {};
  if (GPc.createPlayer) GPc.createPlayer(this);

  // 3. NPCs (with索敵AI)
  const GNc = window.GameNPC || {};
  if (GNc.createNPCs) GNc.createNPCs(this);

  // 4. UI
  const GUc = window.GameUI || {};
  if (GUc.createUI) GUc.createUI(this);

  // Enhanced bottom-left UI for main (bigger fonts, cooler panel, raised ~50px to match test state)
  if (this.ui) {
    const u = this.ui;
    const panel = this.add.graphics().setScrollFactor(0).setDepth(150);
    panel.fillStyle(0x111a2e, 0.75);
    panel.fillRoundedRect(6, 978, 240, 72, 4);
    panel.lineStyle(2, 0x4466ff, 0.9);
    panel.strokeRoundedRect(6, 978, 240, 72, 4);

    if (u.hpText) {
      u.hpText.setFontSize('22px').setColor('#ffffff').setPosition(14, 985);
    }
    if (u.weaponText) {
      u.weaponText.setFontSize('18px').setPosition(14, 1008);
    }
    if (u.ammoText) {
      u.ammoText.setFontSize('18px').setPosition(14, 1028);
    }
    if (u.equipText) {
      u.equipText.setFontSize('16px').setPosition(14, 1046);
    }
  }

  // Input
  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys('W,A,S,D');
  spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  // Debug keys (Phase5.9)
  this.debugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8);   // F8: toggle DEBUG
  this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9); // F9: restart (DEBUG only)
  this.resetNpcsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1); // F1: reset NPC spawns
  this.debugMode = false;
  window.DEBUG = false;

  // Hide original cursor + reticle for main (like test)
  this.input.setDefaultCursor('none');
  this.reticleGfx = this.add.graphics().setDepth(999);

  // Simple loot spawns (Phase9)
  // Now prefers PNG images if loaded (e.g. ar.png, goggles.png, armor1.png, headset.png, medkit.png etc.)
  // Falls back to colored circles if the texture for the key is not found.
  this.lootItems = [];
  const lootSpawns = [
    {x: 600, y: 600, type: 'weapon', key: 'hg'},
    {x: 900, y: 700, type: 'weapon', key: 'sg'},
    {x: 1200, y: 600, type: 'weapon', key: 'ar'},
    {x: 1500, y: 700, type: 'weapon', key: 'smg'},
    {x: 1800, y: 600, type: 'weapon', key: 'sr'},
    {x: 700, y: 1000, type: 'equipment', key: 'armor1'},
    {x: 1000, y: 1100, type: 'equipment', key: 'armor2'},
    {x: 1300, y: 1000, type: 'equipment', key: 'armor3'},
    {x: 1600, y: 1100, type: 'equipment', key: 'goggles'},
    {x: 1900, y: 1000, type: 'equipment', key: 'headset'},
    {x: 2200, y: 1100, type: 'item', key: 'medkit'}
  ];
  lootSpawns.forEach(sp => {
    let item;
    if (this.textures.exists(sp.key)) {
      // Use PNG if loaded (weapons, goggles, armors, etc.)
      item = this.add.image(sp.x, sp.y, sp.key).setDepth(30);
    } else {
      // Fallback to colored circle (for dev or missing files)
      item = this.add.graphics({x: sp.x, y: sp.y}).setDepth(30);
      item.fillStyle(sp.type === 'weapon' ? 0xffdd44 : (sp.type === 'equipment' ? 0x66aaff : 0x66ff66), 1);
      item.fillCircle(0, 0, 10);
    }
    item.setData('loot', sp);
    this.lootItems.push(item);
  });

  // To see more variety of your new item images in the main game,
  // you can edit the lootSpawns array above to include keys like 'hg', 'armor1', 'armor2', etc.
  // Example: add {x: 1200, y: 1500, type: 'weapon', key: 'hg'} or {x: 1300, y: 1600, type: 'equipment', key: 'armor1'}

  // Zone timer start
  this.zoneStartTime = 0;

  // 武器ステータスは combat.js 側に一元化した（getWeaponData で全部取れる）
  // ここに WEAPONS_DATA を書かなくてよくなったのでファイル往復が減るはず
  window.EQUIPMENT_DATA = {
    armor: {name:"アーマー", type:"armor", damageReduction:0.3},
    helmet: {name:"ヘルメット", type:"helmet", headProtection:true},
    goggles: {name:"ゴーグル", type:"goggles", visionMultiplier:1.4},
    headset: {name:"ヘッドセット", type:"headset", hearingMultiplier:1.5}
  };

  // Debug graphics layer for Phase5.9
  this.debugGraphics = this.add.graphics().setDepth(999);
  window.DEBUG = false;

  // For player footstep SE instance (for isPlaying check + non-overlap)
  this.playerFootstepSound = null;
  this.lastPlayerFootstepTime = 0;

  console.log('[main] Game initialized');
}

function update(time) {
  const scene = this;
  if (!scene.player) return;

  // Delta time
  if (!lastFrameTime) lastFrameTime = time;
  const delta = Math.min((time - lastFrameTime) / 1000, 0.05);
  lastFrameTime = time;

  // Player
  const GP = window.GamePlayer || {};
  if (GP.updatePlayerMovement) {
    GP.updatePlayerMovement(scene, cursors, wasd, delta);
  }
  if (GP.updateMouseAngle) {
    GP.updateMouseAngle(scene);
  }
  // 視界コーンとNPC visibilityは毎フレーム確実に呼ぶ（マスクが効かないと真っ暗の原因になる）
  if (GP.updateVisionCone) {
    GP.updateVisionCone(scene);
  }
  if (GP.updateNPCVisibility) {
    GP.updateNPCVisibility(scene);
  }

  // Make self character bright and easy to see (always full brightness inside own vision cone)
  if (scene.player) {
    scene.player.setTint(0xffffff);
    scene.player.setAlpha(1.0);
    scene.player.setDepth(180);
  }

  const angle = GP.getMouseAngle ? GP.getMouseAngle() : 0;

  // Shooting (left click only) with ammo/reload
  // Space is reserved for pickup (no more simultaneous fire on pickup)
  const weapon = (GP.getCurrentWeapon && GP.getCurrentWeapon()) || 'pistol';

  // 発射レートは combat.js の getWeaponData から取る（一元管理）
  let weaponData = null;
  if (window.GameCombat && window.GameCombat.getWeaponData) {
    weaponData = window.GameCombat.getWeaponData(weapon);
  }
  const cooldown = weaponData ? weaponData.fireRate : CONFIG.SHOT_COOLDOWN;

  const pointer = scene.input.activePointer;
  const leftClickShoot = pointer && pointer.leftButtonDown();
  if (leftClickShoot && (time - lastShotTime > cooldown)) {
    const GCbt = window.GameCombat || {};
    let shouldFire = true;

    if (GP.tryToFire) {
      shouldFire = GP.tryToFire(weapon);
    }

    if (shouldFire && GCbt.fireBullet && scene.player) {
      lastShotTime = time;
      GCbt.fireBullet(scene, angle, scene.player.x, scene.player.y, weapon);
    }
  }

  // Reload progress update
  if (GP.updateReload) {
    GP.updateReload(scene, time);
  }

  // Player footstep SE (仕様準拠)
  // ・移動中のみ
  // ・停止したら再生しない（現在の音も停止）
  // ・0.35秒ごとに1回試行（毎フレームではない）
  // ・walk.wav 再生中なら重複再生しない
  // ・移動継続中は ザッ (0.35s) ザッ (0.35s) ... のリズム
  // 目的: ゲーム的な足音存在感（リアルループではなくSE連打表現）
  if (scene.player) {
    const pSpeed = Math.hypot(scene.player.body.velocity.x || 0, scene.player.body.velocity.y || 0);
    const isMoving = pSpeed > 10;

    if (isMoving) {
      const FOOTSTEP_INTERVAL = 350; // 0.35秒

      if (!scene.lastPlayerFootstepTime || time - scene.lastPlayerFootstepTime > FOOTSTEP_INTERVAL) {
        // 試行タイミングを進める（リズムを固定）
        scene.lastPlayerFootstepTime = time;

        // 仮想イベントは残す（F8デバッグの黄色円用。AIは拾わない設定のまま）
        const GA = window.GameAudio || {};
        if (GA.emitSound) {
          GA.emitSound(scene.player.x, scene.player.y, 'footstep', 0.65, 190, false);
        }

        // 実SE: 再生中でなければ鳴らす（重複防止）
        const isAlreadyPlaying = !!(scene.playerFootstepSound && scene.playerFootstepSound.isPlaying);
        if (!isAlreadyPlaying) {
          try {
            if (scene.cache.audio.exists('walk')) {
              scene.playerFootstepSound = scene.sound.play('walk', {
                volume: 0.45
                // loopなし、rateなし
              });
            }
          } catch (e) {
            console.warn('Footstep SE play failed:', e.message);
          }
        }
      }
    } else {
      // 停止中：新しい再生はせず、再生中なら止める
      if (scene.playerFootstepSound && scene.playerFootstepSound.isPlaying) {
        scene.playerFootstepSound.stop();
      }
    }
  }

  // NPCs (patrol + 索敵AI)
  const GN = window.GameNPC || {};
  if (GN.updateNPCs) {
    GN.updateNPCs(scene, time);
  }

  // Bullets + combat
  const GC = window.GameCombat || {};
  if (GC.updateBullets) {
    GC.updateBullets(scene, delta, scene.npcs);
    GC.updateHitEffects();
  }

  // Audio (player hearing indicators + sound cleanup)
  const GAu = window.GameAudio || {};
  if (GAu.cleanupSounds) {
    GAu.cleanupSounds();
    GAu.updateSoundIndicators(scene, scene.player, scene.npcs);
  }

  // Zone update
  const GW = window.GameWorld || {};
  if (GW.updateZone) {
    GW.updateZone(scene, time, delta, scene.player);
  }

  // Looting - new system (Space to pickup in range, no auto)
  // Pickup range set, press Space when close to pick (nearest if multiple)
  // If picking different weapon: drop your current weapon on the ground at player pos
  if (scene.lootItems && scene.player && window.GamePlayer && spaceKey && Phaser.Input.Keyboard.JustDown(spaceKey)) {
    const PICKUP_RANGE = 60; // set acquisition range
    let best = null;
    let bestDist = Infinity;

    for (let i = 0; i < scene.lootItems.length; i++) {
      const it = scene.lootItems[i];
      const d = Math.hypot(it.x - scene.player.x, it.y - scene.player.y);
      if (d < PICKUP_RANGE && d < bestDist) {
        bestDist = d;
        best = { it: it, index: i, data: it.getData('loot') };
      }
    }

    if (best && best.data) {
      const ld = best.data;
      const GP = window.GamePlayer;

      if (ld.type === 'weapon' && GP.switchWeapon) {
        const currentW = GP.getCurrentWeapon ? GP.getCurrentWeapon() : null;
        // Drop current if different weapon (e.g. hg while having sg)
        if (currentW && currentW !== ld.key) {
          const dropKey = currentW;  // short key
          const dropX = scene.player.x + (Math.random() - 0.5) * 18;
          const dropY = scene.player.y + 18;
          let dropped;
          if (scene.textures.exists(dropKey)) {
            dropped = scene.add.image(dropX, dropY, dropKey).setScale(0.55);
          } else {
            dropped = scene.add.graphics({ x: dropX, y: dropY }).setDepth(40);
            dropped.fillStyle(0xffdd44, 1);
            dropped.fillCircle(0, 0, 7);
          }
          dropped.setData('loot', { type: 'weapon', key: dropKey });
          scene.lootItems.push(dropped);
        }
        GP.switchWeapon(ld.key);
      } else if (ld.type === 'equipment' && GP.equipItem && window.EQUIPMENT_DATA) {
        const ed = window.EQUIPMENT_DATA[ld.key];
        if (ed) GP.equipItem(ed);
      } else if (ld.type === 'item' && GP.pickupItem) {
        GP.pickupItem(ld.key, { id: ld.key });
      }

      // remove picked item
      best.it.destroy();
      scene.lootItems.splice(best.index, 1);
    }
  }

  // Win condition check (last player alive)
  if (scene.player && window.GamePlayer) {
    const hp = window.GamePlayer.getPlayerHP ? window.GamePlayer.getPlayerHP() : 5;
    if (hp <= 0) {
      console.log('[main] You died. Game over.');
      scene.player.setVelocity(0,0);
    }
  }

  // UI update
  const GU = window.GameUI || {};
  if (GU.updateUI) GU.updateUI(scene);

  // Custom reticle (crosshair) following mouse - original cursor hidden in create
  if (this.reticleGfx) {
    this.reticleGfx.clear();
    const p = scene.input.activePointer;
    const mx = (p.worldX !== undefined ? p.worldX : p.x);
    const my = (p.worldY !== undefined ? p.worldY : p.y);
    this.reticleGfx.lineStyle(2, 0xffff00, 0.85);
    this.reticleGfx.strokeCircle(mx, my, 7);
    this.reticleGfx.lineStyle(1, 0xffffff, 0.7);
    this.reticleGfx.moveTo(mx - 14, my);
    this.reticleGfx.lineTo(mx + 14, my);
    this.reticleGfx.moveTo(mx, my - 14);
    this.reticleGfx.lineTo(mx, my + 14);
  }

  // DEBUG toggle (F8) and restart (F9) - Phase5.9
  if (this.debugKey && Phaser.Input.Keyboard.JustDown(this.debugKey)) {
    this.debugMode = !this.debugMode;
    window.DEBUG = this.debugMode;
    console.log('[DEBUG] mode:', window.DEBUG);
    if (!window.DEBUG && this.debugGraphics) {
      this.debugGraphics.clear();
    }
    if (scene.npcs) {
      scene.npcs.forEach(npc => {
        if (npc && npc.debugStateText) npc.debugStateText.setVisible(!!window.DEBUG);
      });
    }
  }

  // F9 restart - only in debug mode
  if (this.debugMode && this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
    console.log('[DEBUG] Restarting scene (F9)');
    if (scene.playerFootstepSound) {
      scene.playerFootstepSound.stop();
      scene.playerFootstepSound = null;
    }
    if (this.reticleGfx) {
      this.reticleGfx.clear();
    }
    this.scene.restart();
  }

  // F1: reset NPC spawns (always available for testing)
  if (this.resetNpcsKey && Phaser.Input.Keyboard.JustDown(this.resetNpcsKey)) {
    console.log('[DEBUG] Resetting NPC spawns (F1)');
    if (scene.npcs && scene.npcs.length > 0) {
      scene.npcs.forEach(npc => {
        if (npc.debugStateText) npc.debugStateText.destroy();
        if (npc.hpText) npc.hpText.destroy();
        npc.destroy();
      });
      scene.npcs.length = 0;
    }
    const GNc = window.GameNPC || {};
    if (GNc.createNPCs) GNc.createNPCs(scene);
  }

  // Phase5.9 NPC Debug visuals - only when DEBUG=true
  if (window.DEBUG && this.debugGraphics && scene.npcs) {
    this.debugGraphics.clear();

    // Draw recent sound events
    const GA = window.GameAudio || {};
    if (GA.getRecentSoundsForDebug) {
      const sounds = GA.getRecentSoundsForDebug();
      sounds.forEach(s => {
        let color = 0xffff00; // yellow footsteps
        if (s.type === 'gunshot') color = 0xff0000; // red gunshots
        this.debugGraphics.lineStyle(2, color, 0.6);
        const r = s.radius || (s.type === 'gunshot' ? 650 : 380);
        this.debugGraphics.strokeCircle(s.x, s.y, r);
      });
    }

    // Per NPC: vision cone (blue), hearing circle (cyan), state text
    scene.npcs.forEach(npc => {
      if (!npc || !npc.body) return;

      const visR = CONFIG.NPC_VISION_RANGE || 280;
      const fovDeg = CONFIG.NPC_FOV_ANGLE || 140;
      const half = Phaser.Math.DegToRad(fovDeg / 2);

      let dir = Math.atan2(npc.body.velocity.y || 0, npc.body.velocity.x || 0);
      const spd = Math.hypot(npc.body.velocity.x || 0, npc.body.velocity.y || 0);
      if (spd < 5) {
        // keep last dir or default to 0; for debug use current or previous
      }

      // Blue vision fan
      this.debugGraphics.fillStyle(0x0088ff, 0.25);
      this.debugGraphics.slice(npc.x, npc.y, visR, dir - half, dir + half, false);
      this.debugGraphics.fillPath();

      // Cyan hearing range
      const hearR = CONFIG.NPC_HEARING_RANGE || 520;
      this.debugGraphics.lineStyle(2, 0x00ffff, 0.5);
      this.debugGraphics.strokeCircle(npc.x, npc.y, hearR);

      // State text above NPC
      const stateStr = (npc.state || 'patrol').toUpperCase();
      if (!npc.debugStateText) {
        npc.debugStateText = scene.add.text(npc.x, npc.y - 28, stateStr, {
          fontSize: '9px',
          fill: '#ffffff',
          backgroundColor: '#00000088',
          padding: {x:2, y:1}
        }).setDepth(1000).setOrigin(0.5, 1);
      }
      npc.debugStateText.setText(stateStr);
      npc.debugStateText.setPosition(npc.x, npc.y - 28);
      npc.debugStateText.setVisible(true);
    });
  } else if (scene.npcs) {
    // Hide debug texts when DEBUG off
    scene.npcs.forEach(npc => {
      if (npc && npc.debugStateText) npc.debugStateText.setVisible(false);
    });
    if (this.debugGraphics) this.debugGraphics.clear();
  }
}

// Simple direct Phaser initialization (debug scaffolding removed)
const phaserConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#0f1626',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: {
    preload,
    create,
    update
  }
};

try {
  const game = new Phaser.Game(phaserConfig);
  console.log('[main] Phaser.Game started');
} catch (err) {
  console.error('[main] Failed to start Phaser:', err);
  // In production you could show a user-friendly message here
}

})();
