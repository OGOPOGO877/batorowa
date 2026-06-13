// config.js - Game constants and configuration
console.log('[config.js] loaded, attaching CONFIG');
const CONFIG = {
  // Map
  MAP_WIDTH: 3000,
  MAP_HEIGHT: 3000,

  // Player vision (mouse directed)
  VISION_RADIUS: 520,
  FOV_ANGLE: 85,           // degrees

  // Movement
  PLAYER_SPEED: 160,
  NPC_PATROL_SPEED: 70,

  // Audio / Hearing
  HEARING_RADIUS: 480,     // player hearing range for indicators
  NPC_HEARING_RANGE: 520,
  NPC_VISION_RANGE: 280,
  NPC_FOV_ANGLE: 140,      // NPC索敵用視野角

  // Combat
  BULLET_SPEED: 280,
  BULLET_LIFE: 1.2,        // seconds
  SHOT_COOLDOWN: 350,
  HIT_RADIUS: 18,

  // Misc
  FOOTSTEP_INTERVAL: 480,

  // Player survival (Phase6)
  PLAYER_MAX_HP: 5,
  DAMAGE_PER_HIT: 1,

  // Zone / shrinking (Phase10)
  ZONE_INITIAL_RADIUS: 1200,
  ZONE_SHRINK_INTERVAL: 30000,   // ms
  ZONE_SHRINK_AMOUNT: 180,
  ZONE_MIN_RADIUS: 350,
  ZONE_DAMAGE_PER_SECOND: 0.5,

  // Equipment defaults (Phase8)
  DEFAULT_VISION_MULTIPLIER: 1.0,
  DEFAULT_HEARING_MULTIPLIER: 1.0,
  DEFAULT_DAMAGE_REDUCTION: 0.0,

  // Looting / spawns (Phase9)
  LOOT_SPAWN_COUNT: 12,
  LOOT_PICKUP_RADIUS: 28,
};

// Expose for other modules
window.CONFIG = CONFIG;
