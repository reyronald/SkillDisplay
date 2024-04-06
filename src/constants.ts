export const SPRINT_ACTION_ID = 3

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
