import app from "ags/gtk4/app"
import style from "./style.scss"
import ClockWidget from "./widget/ClockWidget"
import DesktopCalendar from "./widget/DesktopCalendar"

app.start({
  main() {
    for (const monitor of app.get_monitors()) {
      ClockWidget(monitor)
      DesktopCalendar(monitor)
    }
  },
})



