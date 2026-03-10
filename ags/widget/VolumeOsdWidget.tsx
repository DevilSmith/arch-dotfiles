import app from "ags/gtk4/app"
import { createBinding } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib"
import AstalWp from "gi://AstalWp"

const BAR_HEIGHT = 150

export default function VolumeOsdWidget(monitor: Gdk.Monitor) {
  const { RIGHT } = Astal.WindowAnchor
  const wp = AstalWp.get_default()!
  const { defaultSpeaker: speaker } = wp

  let win: any = null
  let hideSourceId: number | null = null

  const barBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
  })
  barBox.add_css_class("volume-osd-bar")
  barBox.set_size_request(-1, BAR_HEIGHT)

  // Spacer сверху — полоса растёт снизу вверх
  const topSpacer = new Gtk.Box({})
  topSpacer.set_vexpand(true)

  // Заливка по громкости; градиент фиксирован в CSS через background-size + background-position
  const fill = new Gtk.Box({})
  fill.add_css_class("volume-osd-fill")
  fill.set_vexpand(false)

  barBox.append(topSpacer)
  barBox.append(fill)

  function scheduleHide() {
    if (hideSourceId !== null) {
      GLib.source_remove(hideSourceId)
      hideSourceId = null
    }
    hideSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1200, () => {
      if (win) win.visible = false
      hideSourceId = null
      return GLib.SOURCE_REMOVE
    })
  }

  function showOsd() {
    if (!win) return
    win.visible = true
    scheduleHide()
  }

  const volumeIcon = createBinding(speaker, "volumeIcon")

  function updateFromSpeaker() {
    const vol = Math.max(0, Math.min(1, speaker.volume ?? 0))
    const h = Math.max(2, Math.round(BAR_HEIGHT * vol))
    fill.set_size_request(-1, h)
  }

  updateFromSpeaker()

  speaker.connect("notify::volume", () => {
    updateFromSpeaker()
    showOsd()
  })
  speaker.connect("notify::mute", () => {
    updateFromSpeaker()
    showOsd()
  })

  return (
    <window
      $={(self) => { win = self }}
      name={`volume-osd-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.NONE}
      visible={false}
      gdkmonitor={monitor}
      anchor={RIGHT}
      margin-right={24}
      margin-top={200}
      application={app}
      focusable={false}
    >
      <box class="volume-osd" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        {barBox}
        <box class="volume-osd-row" orientation={Gtk.Orientation.HORIZONTAL}>
          <image class="volume-osd-icon" iconName={volumeIcon} />
        </box>
      </box>
    </window>
  )
}
