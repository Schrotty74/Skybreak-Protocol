export const LEVEL_COUNT = 14;

export const LEVEL_THEMES = [
  { name: "Neon Undercity", top: "#051d35", mid: "#18072f", bottom: "#02040d", accent: "#00f0ff", secondary: "#ff2b8a", warning: "#ffd84d", motif: 0, platform: "cryo-steel" },
  { name: "Chrome Bazaar", top: "#24113f", mid: "#35102d", bottom: "#08040f", accent: "#ff5bd6", secondary: "#39f5c8", warning: "#ffe66d", motif: 1, platform: "chrome-ice" },
  { name: "Toxic Transit", top: "#102b22", mid: "#132d12", bottom: "#030b08", accent: "#72ff4d", secondary: "#00eaff", warning: "#f5ff73", motif: 2, platform: "corroded-ice" },
  { name: "Crimson Firewall", top: "#351018", mid: "#280617", bottom: "#090208", accent: "#ff365f", secondary: "#ff9b35", warning: "#fff06a", motif: 3, platform: "molten-glass" },
  { name: "Azure Data Sea", top: "#062b45", mid: "#071a45", bottom: "#020612", accent: "#36bfff", secondary: "#7c5cff", warning: "#7fffee", motif: 4, platform: "deep-ice" },
  { name: "Violet Reactor", top: "#29104a", mid: "#19072d", bottom: "#05020c", accent: "#c65cff", secondary: "#ff3dbb", warning: "#70f7ff", motif: 5, platform: "plasma-crystal" },
  { name: "Solar Megagrid", top: "#4a1d0a", mid: "#35100e", bottom: "#0c0304", accent: "#ff9f32", secondary: "#ff355d", warning: "#fff26b", motif: 6, platform: "solar-array" },
  { name: "Ghost Network", top: "#0e3034", mid: "#11202e", bottom: "#03070b", accent: "#84fff2", secondary: "#b1a3ff", warning: "#ffffff", motif: 7, platform: "phase-ice" },
  { name: "Quantum Rift", top: "#25104b", mid: "#071f3b", bottom: "#03020e", accent: "#9c6bff", secondary: "#00f6ff", warning: "#ff61d2", motif: 8, platform: "rift-crystal" },
  { name: "Skybreak Apex", top: "#3a143f", mid: "#082d45", bottom: "#02040d", accent: "#ffffff", secondary: "#00f0ff", warning: "#ffcf4a", motif: 9, platform: "apex-ice" },
  { name: "Inferno Foundry", top: "#4a1206", mid: "#250706", bottom: "#090202", accent: "#ff5c24", secondary: "#ffb02e", warning: "#fff0a3", motif: 10, platform: "magma-forge" },
  { name: "Abyssal Data Ocean", top: "#05275c", mid: "#071842", bottom: "#010714", accent: "#22dcff", secondary: "#8174ff", warning: "#b2fff6", motif: 11, platform: "coral-server" },
  { name: "Stratosphere Relay", top: "#143d59", mid: "#17345b", bottom: "#061021", accent: "#75fff3", secondary: "#cdefff", warning: "#ffe5a1", motif: 12, platform: "aero-alloy" },
  { name: "Terra Core Citadel", top: "#283119", mid: "#172317", bottom: "#060b06", accent: "#64f09a", secondary: "#3de2df", warning: "#f0ba52", motif: 13, platform: "geode-bastion" },
] as const;
export type LevelTheme = typeof LEVEL_THEMES[number];

export const LEVEL_GAMEPLAY = [
  { de: "WARTUNGSSCHÄCHTE", en: "SERVICE SHAFTS" }, { de: "MARKTARKADEN", en: "MARKET ARCADES" },
  { de: "TRANSITLINIEN", en: "TRANSIT LINES" }, { de: "SICHERHEITSGITTER", en: "SECURITY GRID" },
  { de: "DATENKANALE", en: "DATA CHANNELS" }, { de: "REAKTORKAMMERN", en: "REACTOR CHAMBERS" },
  { de: "HELIOSTATEN", en: "HELIOSTATS" }, { de: "PHANTOMKNOTEN", en: "PHANTOM NODES" },
  { de: "RIFTPFADE", en: "RIFT PATHS" }, { de: "SENDETERRASSEN", en: "TRANSMISSION TERRACES" },
  { de: "SCHMIEDEBRÜCKEN", en: "FORGE BRIDGES" }, { de: "KORALLENSERVER", en: "CORAL SERVERS" },
  { de: "TURBINENRINGE", en: "TURBINE RINGS" }, { de: "GEODENWEGE", en: "GEODE PATHS" },
] as const;

export type BlockExplosionStyle = "energy-bolt" | "cryo-shard" | "chrome-sliver" | "toxic-splinter" | "fire-spark" | "sea-droplet" | "plasma-crystal" | "solar-ray" | "ghost-fragment" | "rift-diamond" | "apex-star" | "magma-burst" | "bubble-spray" | "wind-shard" | "geode-fragment";
export const BLOCK_EXPLOSION_STYLES: BlockExplosionStyle[] = ["energy-bolt", "chrome-sliver", "toxic-splinter", "fire-spark", "sea-droplet", "plasma-crystal", "solar-ray", "ghost-fragment", "rift-diamond", "apex-star", "magma-burst", "bubble-spray", "wind-shard", "geode-fragment"];

/** A separate readable falling object for every sector's under-platform hazards. */
export const FALLING_HAZARD_STYLES: BlockExplosionStyle[] = ["cryo-shard", "chrome-sliver", "toxic-splinter", "fire-spark", "sea-droplet", "plasma-crystal", "solar-ray", "ghost-fragment", "rift-diamond", "apex-star", "magma-burst", "bubble-spray", "wind-shard", "geode-fragment"];

export const LEVEL_BACKDROP_FILES = [
  "neon-undercity-2.5d-bg-glow.png", "level-02-chrome-bazaar-bg.png", "level-03-toxic-transit-bg.png", "level-04-crimson-firewall-bg.png", "level-05-azure-data-sea-bg.png",
  "level-06-violet-reactor-bg.png", "level-07-solar-megagrid-bg.png", "level-08-ghost-network-bg.png", "level-09-quantum-rift-bg.png", "level-10-skybreak-apex-bg.png",
  "level-11-inferno-foundry-bg.png", "level-12-abyssal-data-ocean-bg.png", "level-13-stratosphere-relay-bg.png", "level-14-terra-core-citadel-bg.png",
] as const;

export const MUSIC_TRACKS = [
  "audio/level-01-neon-undercity.mp3", "audio/level-02-chrome-bazaar.mp3", "audio/level-03-toxic-transit.mp3", "audio/level-04-crimson-firewall.mp3", "audio/level-05-azure-data-sea.mp3",
  "audio/level-06-violet-reactor.mp3", "audio/level-07-solar-megagrid.mp3", "audio/level-08-ghost-network.mp3", "audio/level-09-quantum-rift.mp3", "audio/level-10-skybreak-apex.mp3",
  "audio/level-11-inferno-foundry.mp3", "audio/level-12-abyssal-data-ocean.mp3", "audio/level-13-stratosphere-relay.mp3", "audio/level-14-terra-core-citadel.mp3",
].map((path) => `${import.meta.env.BASE_URL}${path}`);
