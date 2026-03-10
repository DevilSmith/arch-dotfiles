import app from "ags/gtk4/app"
import Gdk from "gi://Gdk?version=4.0"
import AstalHyprland from "gi://AstalHyprland"
import DesktopCalendar from "./widget/DesktopCalendar"
import AnalogClock from "./widget/AnalogClock"
import WeatherWidget from "./widget/WeatherWidget"
import VpnWidget from "./widget/VpnWidget"
import PlayerWidget from "./widget/PlayerWidget"
import PowerWidget from "./widget/PowerWidget"
import AppMenuWidget from "./widget/AppMenuWidget"
import VolumeOsdWidget from "./widget/VolumeOsdWidget"
import NotificationsWidget from "./widget/NotificationsWidget"
import NotificationPopup from "./widget/NotificationPopup"
import Bar from "./widget/Bar.tsx"

/** Монитор под курсором (через Hyprland) или null. */
function getMonitorUnderCursor(): Gdk.Monitor | null {
  const hypr = AstalHyprland.get_default()
  if (!hypr) return null

  const pos = hypr.get_cursor_position()
  if (!pos) return null

  const x = pos.get_x()
  const y = pos.get_y()

  for (const mon of app.get_monitors() as Gdk.Monitor[]) {
    const g = mon.geometry
    const withinX = x >= g.x && x < g.x + g.width
    const withinY = y >= g.y && y < g.y + g.height
    if (withinX && withinY) return mon
  }

  return null
}

function toggleOnCursorMonitor(
  windowName: (connector: string) => string,
) {
  const monitor = getMonitorUnderCursor()
  const monitors = monitor ? [monitor] : [...app.get_monitors()]
  let name: string | undefined
  for (const mon of monitors) {
    name = windowName(mon.get_connector())
    const window = app.get_window(name) as any
    if (!window) continue
    const willShow = !window.visible
    window.visible = willShow
    if (willShow) {
      window.present?.()
      window.grab_focus?.()
    }
  }
  return name
}

app.start({
  css: "./style.scss",

  requestHandler(argv: string[], response: (res: string) => void) {
    const [cmd] = argv
    let name: string | undefined

    if (cmd === "toggle-vpn-active") {
      name = toggleOnCursorMonitor((c) => `vpn-widget-${c}`)
      response(`toggled ${name ?? ""}`)
      return
    }

    if (cmd === "toggle-player-widget") {
      name = toggleOnCursorMonitor((c) => `player-widget-${c}`)
      response(`toggled ${name ?? ""}`)
      return
    }

    if (cmd === "toggle-power-widget") {
      name = toggleOnCursorMonitor((c) => `power-widget-${c}`)
      response(`toggled ${name ?? ""}`)
      return
    }

    if (cmd === "toggle-app-menu") {
      name = toggleOnCursorMonitor((c) => `app-menu-${c}`)
      response(`toggled ${name ?? ""}`)
      return
    }

    response("unknown command")
  },

  main() {
    for (const monitor of app.get_monitors()) {
      Bar(monitor)
      DesktopCalendar(monitor)
      AnalogClock(monitor)
      WeatherWidget(monitor)
      VpnWidget(monitor)
      PlayerWidget(monitor)
      PowerWidget(monitor)
      AppMenuWidget(monitor)
      VolumeOsdWidget(monitor)
      NotificationsWidget(monitor)
      NotificationPopup(monitor)
    }
  },
})
