type EventData = {
  type: "broadcast"
} & (
  | {
      msgtype: "ChangeZone"
      msg: {
        type: "ChangeZone"
        zoneID: number
        zoneName: string
      }
    }
  | {
      msgtype: "SendCharName"
      msg: {
        charID: number
        charName: string
        type: "ChangePrimaryPlayer"
      }
    }
  | {
      msgtype: "Chat"
      msg: string
    }
)

type Callback = (eventData: EventData) => void

export function getHost() {
  const urlSearchParams = new URLSearchParams(window.location.search)
  const HOST_PORT = urlSearchParams.get("HOST_PORT")
  const hostPort = HOST_PORT || "ws://127.0.0.1:10501"
  return hostPort
}

// https://github.com/OverlayPlugin/cactbot/blob/main/docs/LogGuide.md
export function listenToACT(callbacks: {
  onopen: () => void
  onclose: () => void
  onmessage: Callback
}) {
  const { onopen, onclose, onmessage } = callbacks

  const hostPort = getHost()

  const wsUri = `${hostPort}/BeforeLogLineRead`

  const ws = new WebSocket(wsUri)

  ws.onerror = () => ws.close()

  ws.onopen = onopen

  ws.onclose = onclose

  ws.onmessage = function (e) {
    if (e.data === ".") return ws.send(".")

    const eventData: EventData = JSON.parse(e.data)
    if (eventData.msgtype === "SendCharName") {
      return onmessage(eventData)
    } else if (eventData.msgtype === "Chat") {
      return onmessage(eventData)
    }
  }

  return () => {
    ws.close()
  }
}
