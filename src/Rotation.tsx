import React from "react"
import "./css/Rotation.css"
import Action from "./Action"

type Props = {
  encounterId: number
  name: string
  actionList: Array<{ actionId: number; ability: string }>
}

export default function RotationContainer({
  encounterId,
  name,
  actionList,
}: Props) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        className={open ? "rotation-button expanded" : "rotation-button"}
        onClick={() => {
          setOpen((open) => !open)
        }}
      >
        {encounterId === 0 ? "Current Rotation" : name}
      </button>
      <RotationContents expanded={open} actionList={actionList} />
    </>
  )
}

function RotationContents({
  expanded,
  actionList,
}: {
  expanded: boolean
  actionList: Props["actionList"]
}) {
  if (!expanded) return null

  return (
    <div className="rotation-list">
      {actionList.map(({ actionId, ability }, i) => (
        <Action
          key={i}
          actionId={actionId}
          ability={ability}
          additionalClasses="action-rotation"
          casting={false}
        />
      ))}
    </div>
  )
}
