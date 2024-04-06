import React from "react"
import listenToACT from "./ACTListener"
import "./css/App.css"
import Action from "./Action"
import RotationContainer from "./Rotation"
import ReactDOM from "react-dom"
import { SPRINT_ACTION_ID, LINE_ID, LogCode } from "./constants"

const handleCodes = new Set([
  LINE_ID.LogLine,
  LINE_ID.ChangeZone,
  LINE_ID.ChangePrimaryPlayer,
  LINE_ID.NetworkStartsCasting,
  LINE_ID.NetworkAbility,
  LINE_ID.NetworkAOEAbility,
  LINE_ID.NetworkCancelAbility,
  LINE_ID.ActorControl,
])

type Action = {
  key: number
  actionId: number
  ability: string
  casting: boolean
}

type Encounter = {
  name: string
  actionList: Array<{ actionId: number; ability: string }>
}

export default function App() {
  const [actionList, setActionList] = React.useState<Action[]>([])
  const [encounterList, setEncounterList] = React.useState<Encounter[]>([])

  React.useEffect(() => {
    let selfId: number | undefined
    let lastTimestamp = ""
    let lastAction = -1
    let currentZone = "Unknown"

    let lastKey = 0
    let timeoutId: number | undefined = undefined

    const closeFn = listenToACT((...logSplit) => {
      const openNewEncounter = () => {
        setEncounterList((encounterList) => {
          if (
            encounterList[0] &&
            encounterList[0].actionList &&
            encounterList[0].actionList.length <= 0
          ) {
            encounterList.shift()
          }

          encounterList.unshift({
            name: currentZone,
            actionList: [],
          })

          return encounterList.slice(0, 3)
        })
      }

      if (
        logSplit.length === 1 &&
        typeof logSplit[0] !== "string" &&
        logSplit[0].charID
      ) {
        selfId = logSplit[0].charID
        openNewEncounter()
        return
      }

      function refineType(_arg: typeof logSplit): asserts _arg is string[] {}
      refineType(logSplit)

      const [
        logCode,
        logTimestamp,
        logParameter1,
        logParameter2,
        logParameter3,
        ability,
      ] = logSplit

      if (!handleCodes.has(logCode as LogCode)) return

      switch (logCode) {
        case LINE_ID.LogLine:
          if (logParameter1 === "0038" && logParameter3 === "end")
            openNewEncounter()
          return
        case LINE_ID.ChangeZone:
          currentZone = logParameter2
          return
        case LINE_ID.ChangePrimaryPlayer:
          selfId = parseInt(logParameter1, 16)
          openNewEncounter()
          return
        case LINE_ID.ActorControl:
          if (logParameter2 === "40000012" || logParameter2 === "40000010")
            openNewEncounter()
          return
        default:
          break
      }

      if (selfId === undefined) return

      if (parseInt(logParameter1, 16) !== selfId) return

      const actionId = parseInt(logParameter3, 16)

      const isCombatAction =
        (actionId >= 9 && actionId <= 30000) || actionId === SPRINT_ACTION_ID
      const isCraftingAction = actionId >= 100001 && actionId <= 100300
      const isBugOrDuplicate =
        logTimestamp === lastTimestamp && actionId === lastAction
      const isItem = ability.startsWith("item_")

      if (
        (!isCombatAction && !isCraftingAction && !isItem) ||
        isBugOrDuplicate
      ) {
        return
      }

      if (Date.now() - Date.parse(lastTimestamp) > 120000) openNewEncounter() //last action > 120s ago

      lastTimestamp = logTimestamp
      lastAction = actionId

      let keyToRemove: number | null = null

      // This is pretty silly but it's the neatest way to handle the updates going
      // out at the same time, without finding some way to merge the action lists....
      ReactDOM.unstable_batchedUpdates(() => {
        setActionList((actionList) => {
          const lastAction = actionList.at(-1)

          keyToRemove = lastAction?.key ?? null

          if (logCode === LINE_ID.NetworkCancelAbility) {
            return actionList.slice(0, -1)
          } else if (lastAction?.actionId === actionId && lastAction?.casting) {
            const nextActionList = actionList.slice()
            nextActionList[nextActionList.length - 1] = {
              ...lastAction,
              casting: false,
            }
            return nextActionList
          } else {
            const key = (lastKey % 256) + 1
            lastKey = key
            return actionList.concat({
              actionId,
              ability,
              key,
              casting: logCode === LINE_ID.NetworkStartsCasting,
            })
          }
        })
        setEncounterList((encounterList) => {
          if (logCode !== LINE_ID.NetworkAbility) return encounterList

          if (!encounterList[0]) {
            encounterList[0] = {
              name: currentZone,
              actionList: [],
            }
          }

          encounterList[0].actionList.push({ actionId, ability })

          return encounterList
        })
      })

      if (keyToRemove != null) {
        timeoutId = window.setTimeout(() => {
          setActionList((actionList) =>
            actionList.filter((action) => action.key !== keyToRemove),
          )
        }, 10000)
      }
    })

    return () => {
      closeFn()
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="container">
      <div className="actions">
        {actionList.map(({ actionId, ability, key, casting }) => (
          <Action
            key={key}
            actionId={actionId}
            ability={ability}
            casting={casting}
            additionalClasses="action-move"
          />
        ))}
      </div>

      {encounterList.map((encounter, i) => (
        <RotationContainer
          key={i}
          encounterId={i}
          name={encounter.name}
          actionList={encounter.actionList}
        />
      ))}
    </div>
  )
}
