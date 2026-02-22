import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"

export default function DesktopCalendar(monitor: Gdk.Monitor) {
  const { TOP, LEFT } = Astal.WindowAnchor

  return (
    <window
      name={"clock-widget"}
      namespace={"ags-widget"}
      layer={Astal.Layer.BOTTOM}
      visible
      gdkmonitor={monitor}
      anchor={TOP | LEFT}
      margin-top={13}
      margin-left={13}
      application={app}
      focusable={false}
    >
      <box class="desktop-calendar">
        <Gtk.Calendar />
      </box>
    </window>
  )
}

