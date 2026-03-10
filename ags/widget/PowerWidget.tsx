import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { execAsync } from "ags/process"

const CMD = {
  shutdown: "systemctl poweroff",
  reboot: "systemctl reboot",
  suspend: "systemctl suspend",
  logout: "loginctl terminate-user $USER",
} as const

export default function PowerWidget(monitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor

  return (
    <window
      name={`power-widget-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={false}
      gdkmonitor={monitor}
      anchor={TOP}
      margin-top={220}
      application={app}
      focusable
      $={(self) => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            // закрываем все окна power-widget на всех мониторах
            for (const mon of app.get_monitors()) {
              const w = app.get_window(
                `power-widget-${mon.get_connector()}`,
              ) as any
              if (w) w.visible = false
            }
          }
        })
        self.add_controller(controller)
      }}
    >
      <box
        class="power-menu"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={6}
      >
        <label
          class="power-menu-title"
          label="Power"
          xalign={0.5}
        />

        <button
          class="power-menu-btn"
          onClicked={() => execAsync(CMD.shutdown).catch(() => {})}
        >
          <label label="⏻ Shut down" xalign={0} />
        </button>

        <button
          class="power-menu-btn"
          onClicked={() => execAsync(CMD.reboot).catch(() => {})}
        >
          <label label=" Reboot" xalign={0} />
        </button>

        <button
          class="power-menu-btn"
          onClicked={() => execAsync(CMD.suspend).catch(() => {})}
        >
          <label label=" Sleep" xalign={0} />
        </button>

        <button
          class="power-menu-btn"
          onClicked={() => execAsync(CMD.logout).catch(() => {})}
        >
          <label label=" Log out" xalign={0} />
        </button>
      </box>
    </window>
  )
}

