// ui.js - UI elements, labels, future HUD

let aliveText, hpText, weaponText, equipText;

function createUI(scene) {
  // Right top ALIVE (as specified in vision) - for 1920x1080
  aliveText = scene.add.text(
    1910, 10,
    'ALIVE: 1',
    { fontSize: '16px', fill: '#0f0', fontStyle: 'bold' }
  ).setScrollFactor(0).setDepth(200).setOrigin(1, 0);

  // Bottom left status (adjusted for 1920x1080)
  hpText = scene.add.text(10, 1040, 'HP: 5', { fontSize: '14px', fill: '#fff' })
    .setScrollFactor(0).setDepth(200);

  weaponText = scene.add.text(10, 1058, 'WEAPON: ハンドガン', { fontSize: '13px', fill: '#ffdd44' })
    .setScrollFactor(0).setDepth(200);

  ammoText = scene.add.text(10, 1076, 'AMMO: 12/12', { fontSize: '13px', fill: '#ffaa00' })
    .setScrollFactor(0).setDepth(200);

  equipText = scene.add.text(10, 1094, 'GEAR: -', { fontSize: '12px', fill: '#88aaff' })
    .setScrollFactor(0).setDepth(200);

  scene.ui = { aliveText, hpText, weaponText, ammoText, equipText };
  console.log('[ui] UI created');
}

function updateUI(scene) {
  if (!scene.ui) return;

  // ALIVE (for single player test we show 1 until death)
  if (scene.ui.aliveText) {
    const alive = (scene.player && window.GamePlayer && window.GamePlayer.getPlayerHP && window.GamePlayer.getPlayerHP() > 0) ? 1 : 0;
    scene.ui.aliveText.setText('ALIVE: ' + alive);
    scene.ui.aliveText.setColor(alive > 0 ? '#0f0' : '#f00');
  }

  if (window.GamePlayer) {
    if (scene.ui.hpText) scene.ui.hpText.setText('HP: ' + (window.GamePlayer.getPlayerHP ? window.GamePlayer.getPlayerHP() : '?'));

    if (scene.ui.weaponText) {
      const w = window.GamePlayer.getCurrentWeapon ? window.GamePlayer.getCurrentWeapon() : 'pistol';
      const name = (window.WEAPONS_DATA && window.WEAPONS_DATA[w] && window.WEAPONS_DATA[w].name) || w;
      scene.ui.weaponText.setText('WEAPON: ' + name);
    }

    if (scene.ui.ammoText) {
      const w = window.GamePlayer.getCurrentWeapon ? window.GamePlayer.getCurrentWeapon() : 'pistol';
      const data = window.WEAPONS_DATA ? window.WEAPONS_DATA[w] : null;
      const mag = data ? (data.magSize || 12) : 12;

      if (window.GamePlayer.isCurrentlyReloading && window.GamePlayer.isCurrentlyReloading()) {
        const progress = window.GamePlayer.getReloadProgress ? Math.floor(window.GamePlayer.getReloadProgress() * 100) : 0;
        scene.ui.ammoText.setText('RELOADING... ' + progress + '%');
        scene.ui.ammoText.setColor('#ffaa00');
      } else {
        const cur = window.GamePlayer.getCurrentAmmo ? window.GamePlayer.getCurrentAmmo() : mag;
        scene.ui.ammoText.setText('AMMO: ' + cur + '/' + mag);
        scene.ui.ammoText.setColor(cur > 0 ? '#ffaa00' : '#ff4444');
      }
    }

    if (scene.ui.equipText) {
      const eq = window.GamePlayer.getEquipment ? window.GamePlayer.getEquipment() : {};
      const parts = [];
      if (eq.goggles) parts.push('GOGGLES');
      if (eq.headset) parts.push('HEADSET');
      if (eq.armor) parts.push('ARMOR');
      if (eq.helmet) parts.push('HELMET');
      scene.ui.equipText.setText('GEAR: ' + (parts.length ? parts.join('+') : '-'));
    }
  }
}

window.GameUI = {
  createUI,
  updateUI
};
