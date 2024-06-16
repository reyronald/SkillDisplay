export const ACTION_IDS = {
  Sprint: 3,
  "Release Iron Will": 32065,
  "Release Defiance": 32066,
  "Release Grit": 32067,
  "Release Royal Guard": 32068,
} as const

// https://github.com/OverlayPlugin/cactbot/blob/main/docs/LogGuide.md
export const LINE_ID = {
  LogLine: "00",
  ChangeZone: "01",
  ChangePrimaryPlayer: "02",
  NetworkStartsCasting: "20",
  NetworkAbility: "21",
  NetworkAOEAbility: "22",
  NetworkCancelAbility: "23",
  ActorControl: "33",
} as const

export type LogCode = (typeof LINE_ID)[keyof typeof LINE_ID]
