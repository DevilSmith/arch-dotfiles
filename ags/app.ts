import app from "ags/gtk4/app"
import style from "./style.scss"
import ClockWidget from "./widget/ClockWidget"
import DesktopCalendar from "./widget/DesktopCalendar"
import AnalogClock from "./widget/AnalogClock"
import VpnWidget from "./widget/VpnWidget"

app.start({
requestHandler(argv: string[], response: (res: string) => void) {
    const [cmd] = argv

    if (cmd === "toggle-vpn-active") {
      for (const monitor of app.get_monitors())
      {
        const name = `vpn-widget-${monitor.get_connector()}`
        const window = app.get_window(name)
        window.visible = !window.visible
      }

      response(`toggled ${name}`)  
      return
    }

    response("unknown command")
  },
css: style,
  main() {
    for (const monitor of app.get_monitors()) {
      DesktopCalendar(monitor)
      AnalogClock(monitor)
      VpnWidget(monitor)
    }
  },
})
