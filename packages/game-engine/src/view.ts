import { COMBAT_PROFILES, type GameState, type MechSide, type MechView } from "@steelmind/game-types";
import { getDistance, getDistanceCategory, opponentOf } from "./arena";
import { revealAttribute, unknownEnemyAttributes } from "./scan";

// The information one mech may observe (SPEC §28–§30). Hidden enemy
// attributes appear only after they were scanned; using a weapon reveals
// nothing about it.
export function createMechView(state: GameState, side: MechSide): MechView {
  const own = state.mechs[side];
  const enemy = state.mechs[opponentOf(side)];
  const distance = getDistance(state);
  return {
    side,
    round: state.round + 1,
    initiative: state.initiative,
    own: {
      profileId: own.profileId,
      hp: own.hp,
      maxHp: COMBAT_PROFILES[own.profileId].hp,
      energy: own.energy,
    },
    enemy: { hp: enemy.hp, energy: enemy.energy },
    distance,
    distanceCategory: getDistanceCategory(distance),
    knownEnemyAttributes: own.scannedEnemyAttributes.map((a) => revealAttribute(enemy.profileId, a)),
    unknownEnemyAttributes: unknownEnemyAttributes(own),
    enemyActions: state.actionLog.filter((entry) => entry.side !== side),
  };
}
