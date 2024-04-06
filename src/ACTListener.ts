const getHost = () =>
  /[?&]HOST_PORT=(wss?:\/\/[^&/]+)/.exec(window.location.search)

type Callback = (
  ...args: (string | { charID: number; charName: string })[]
) => void

type EventData = {
  type: "broadcast"
  msgtype: "Chat" | "SendCharName"
  msg: string
}

export default function listenToACT(callback: Callback) {
  if (!getHost()) return listenOverlayPlugin(callback)
  return listenActWebSocket(callback)
}

// https://github.com/OverlayPlugin/cactbot/blob/main/docs/LogGuide.md
function listenActWebSocket(callback: Callback) {
  const host = getHost()
  const wsUri = host && host[1] ? `${host[1]}/BeforeLogLineRead` : undefined
  if (!wsUri) return () => undefined

  const ws = new WebSocket(wsUri)
  ws.onerror = () => ws.close()
  ws.onclose = () =>
    setTimeout(() => {
      listenActWebSocket(callback)
    }, 1000)
  ws.onmessage = function (e) {
    if (e.data === ".") return ws.send(".")

    const obj: EventData = JSON.parse(e.data)
    if (obj.msgtype === "SendCharName") {
      return callback(obj.msg)
    } else if (obj.msgtype === "Chat") {
      return callback(...obj.msg.split("|"))
    }
  }

  return () => {
    ws.close()
  }
}

function listenOverlayPlugin(callback: Callback) {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const listener = (e: any) => {
    callback(...e.detail)
  }

  document.addEventListener("onLogLine", listener)

  return () => {
    document.removeEventListener("onLogLine", listener)
  }
}
