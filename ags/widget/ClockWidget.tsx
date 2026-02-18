import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"

export default function ClockWidget(monitor: Gdk.Monitor) {
  const time = createPoll("", 1000, "date +'%H:%M:%S'")
  const date = createPoll("", 60000, "date +'%d %B %Y'")

  const { BOTTOM, RIGHT } = Astal.WindowAnchor

  return (
    <window
      name={"clock-widget"}
      namespace={"ags-widget"}
      layer={Astal.Layer.BOTTOM}
      visible
      gdkmonitor={monitor}
      anchor={BOTTOM | RIGHT}
      margin-right={10}
      margin-bottom={10}
      application={app}
      focusable={false}
    >
      <box
        class="desktop-clock"
        orientation={Gtk.Orientation.VERTICAL}
      >
        <label class="clock-time" label={time} />
        <label class="clock-date" label={date} />
      </box>
    </window>
  )
}

