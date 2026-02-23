import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib"

export default function DesktopCalendar(monitor: Gdk.Monitor) {
  const { TOP, LEFT } = Astal.WindowAnchor

  let current = new Date()

  const monthLabel = new Gtk.Label({
    halign: Gtk.Align.CENTER,
    hexpand: true,
  })

  const grid = new Gtk.Grid({
    column_homogeneous: true,
    row_homogeneous: true,
  })

  function updateCalendar() {
    // очистка grid
    while (grid.get_first_child())
      grid.remove(grid.get_first_child()!)

    const year = current.getFullYear()
    const month = current.getMonth()

    const monthName = current.toLocaleString("default", { month: "long" })
    monthLabel.label = `${monthName} ${year}`

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const today = new Date()

    let day = 1

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {

        if (row === 0 && col < firstDay) {
          grid.attach(new Gtk.Label({ label: "" }), col, row, 1, 1)
          continue
        }

        if (day > daysInMonth)
          continue

        const label = new Gtk.Label({
          label: `${day}`,
          halign: Gtk.Align.CENTER,
          valign: Gtk.Align.CENTER,
          hexpand: true,
          vexpand: true,
        })

        const isToday =
          day === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()

        const box = new Gtk.Box({
          width_request: 32,
          height_request: 32,
          halign: Gtk.Align.CENTER,
          valign: Gtk.Align.CENTER,
        })

        box.append(label)

        if (isToday)
          box.add_css_class("calendar-today")

        box.add_css_class("calendar-day")

        grid.attach(box, col, row, 1, 1)

        day++
      }
    }
  }

  const prevBtn = new Gtk.Button({ label: "‹" })
  const nextBtn = new Gtk.Button({ label: "›" })

  prevBtn.connect("clicked", () => {
    current.setMonth(current.getMonth() - 1)
    updateCalendar()
  })

  nextBtn.connect("clicked", () => {
    current.setMonth(current.getMonth() + 1)
    updateCalendar()
  })

  updateCalendar()

 let lastDay = new Date().getDate()

  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
  const now = new Date()

  if (now.getDate() !== lastDay) {
    lastDay = now.getDate()
    updateCalendar()
  }

  return GLib.SOURCE_CONTINUE
})

  return (
    <window
      name={"clock-widget"}
      namespace={"ags-widget"}
      layer={Astal.Layer.BOTTOM}
      visible
      gdkmonitor={monitor}
      anchor={TOP | LEFT}
      margin-top={10}
      margin-left={10}
      application={app}
      focusable={false}
    >
     <box class="desktop-calendar" orientation={Gtk.Orientation.VERTICAL}> 
        <box class="calendar-header">
          {prevBtn}
          {monthLabel}
          {nextBtn}
        </box>
        {grid}
      </box>
    </window>
  )
}
