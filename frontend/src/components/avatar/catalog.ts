/**
 * Avatar catalog metadata — id → display name, in picker display order.
 *
 * Mirrors the ids in avatarArt.tsx (art) and backend/src/lib/avatars.ts
 * (defaults + validation). The name is shown in the picker and can label a
 * profile ("the Coelacanth") — the names are half the charm.
 */

export interface AvatarMeta {
  id: string;
  name: string;
}

export const AVATAR_CATALOG: AvatarMeta[] = [
  // deep-sea oddballs & rare
  { id: 'blobfish', name: 'Blobfish' },
  { id: 'anglerfish', name: 'Anglerfish' },
  { id: 'pufferfish', name: 'Pufferfish' },
  { id: 'gulper-eel', name: 'Gulper Eel' },
  { id: 'vampire-squid', name: 'Vampire Squid' },
  { id: 'barreleye', name: 'Barreleye' },
  { id: 'dumbo-octopus', name: 'Dumbo Octopus' },
  { id: 'goblin-shark', name: 'Goblin Shark' },
  { id: 'fangtooth', name: 'Fangtooth' },
  // classic sea life
  { id: 'octopus', name: 'Octopus' },
  { id: 'jellyfish', name: 'Jellyfish' },
  { id: 'whale', name: 'Whale' },
  { id: 'narwhal', name: 'Narwhal' },
  { id: 'crab', name: 'Crab' },
  { id: 'seahorse', name: 'Seahorse' },
  { id: 'sea-turtle', name: 'Sea Turtle' },
  { id: 'manta-ray', name: 'Manta Ray' },
  { id: 'orca', name: 'Orca' },
  // extinct / living fossils
  { id: 'megalodon', name: 'Megalodon' },
  { id: 'dunkleosteus', name: 'Dunkleosteus' },
  { id: 'coelacanth', name: 'Coelacanth' },
  { id: 'ammonite', name: 'Ammonite' },
  { id: 'trilobite', name: 'Trilobite' },
  { id: 'helicoprion', name: 'Helicoprion' },
  // ocean lore & objects
  { id: 'point-nemo', name: 'Point Nemo' },
  { id: 'dock', name: 'The Dock' },
  { id: 'nautilus', name: 'Nautilus' },
  { id: 'lighthouse', name: 'Lighthouse' },
  { id: 'message-in-bottle', name: 'Message in a Bottle' },
  { id: 'kraken', name: 'Kraken' },
  { id: 'buoy', name: 'Buoy' },
];

/** Look up a display name for an avatar id (falls back to the id itself). */
export function avatarName(avatarId?: string | null): string {
  return AVATAR_CATALOG.find((a) => a.id === avatarId)?.name ?? 'Mystery Fish';
}
