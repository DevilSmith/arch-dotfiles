import app from "ags/gtk4/app"
import style from "./style.scss"
import ClockWidget from "./widget/ClockWidget"
import DesktopCalendar from "./widget/DesktopCalendar"
import AnalogClock from "./widget/AnalogClock"
import VpnWidget from "./widget/VpnWidget"

app.start({
css: style,
  main() {
    for (const monitor of app.get_monitors()) {
      DesktopCalendar(monitor)
      AnalogClock(monitor)
      VpnWidget(monitor)
    }
  },
})



