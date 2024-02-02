import React from "react"
import listenToACT from "./ACTListener"
import "./css/App.css"
import Action from "./Action"
import RotationContainer from "./Rotation"
import ReactDOM from "react-dom"
import { SPRINT_ACTION_ID, LINE_ID } from "./constants"

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

export default function App() {
  const [actionList, setActionList] = React.useState([])
  const [encounterList, setEncounterList] = React.useState([])

  React.useEffect(() => {
    let selfId
    let lastTimestamp = ""
    let lastAction = -1
    let currentZone = "Unknown"

    let lastKey = 0
    let timeoutId = null

    let closeFn = listenToACT((...logSplit) => {
      const openNewEncounter = () => {
        setEncounterList((encounterList) => {
          if (
            encounterList[0] &&
            encounterList[0].rotation &&
            encounterList[0].rotation.length <= 0
          ) {
            encounterList.shift()
          }

          encounterList.unshift({
            name: currentZone,
            rotation: [],
          })

          return encounterList.slice(0, 3)
        })
      }

      if (logSplit.length === 1 && logSplit[0].charID) {
        selfId = logSplit[0].charID
        openNewEncounter()
        return
      }

      const [
        logCode,
        logTimestamp,
        logParameter1,
        logParameter2,
        logParameter3,
        ability,
      ] = logSplit

      if (!handleCodes.has(logCode)) return

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

      const action = parseInt(logParameter3, 16)

      const isCombatAction =
        (action >= 9 && action <= 30000) || action === SPRINT_ACTION_ID
      const isCraftingAction = action >= 100001 && action <= 100300
      const isBugOrDuplicate =
        logTimestamp === lastTimestamp && action === lastAction
      const isItem = ability.startsWith("item_")

      if (
        (!isCombatAction && !isCraftingAction && !isItem) ||
        isBugOrDuplicate
      ) {
        return
      }

      if (Date.now() - Date.parse(lastTimestamp) > 120000) openNewEncounter() //last action > 120s ago

      lastTimestamp = logTimestamp
      lastAction = action

      let keyToRemove = null

      // This is pretty silly but it's the neatest way to handle the updates going
      // out at the same time, without finding some way to merge the action lists....
      ReactDOM.unstable_batchedUpdates(() => {
        setActionList((actionList) => {
          const lastAction = actionList.at(-1)

          keyToRemove = lastAction?.key ?? null

          if (logCode === LINE_ID.NetworkCancelAbility) {
            return actionList.slice(0, -1)
          } else if (lastAction?.action === action && lastAction?.casting) {
            return actionList.with(-1, { ...lastAction, casting: false })
          } else {
            const key = (lastKey % 256) + 1
            lastKey = key
            return actionList.concat({
              action,
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
              rotation: [],
            }
          }

          encounterList[0].rotation.push({ action, ability })

          return encounterList
        })
      })

      if (keyToRemove != null) {
        timeoutId = setTimeout(() => {
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
    <>
      <div className="container">
        <div className="actions">
          {actionList.map(({ action, ability, key, casting }) => (
            <Action
              key={key}
              actionId={action}
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
            actionList={encounter.rotation}
          />
        ))}
      </div>
    </>
  )
}
