import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { For, createBinding } from "ags"
import AstalNotifd from "gi://AstalNotifd?version=0.1"

export default function NotificationsWidget(monitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor
  const notifd = AstalNotifd.get_default()
  const notifications = createBinding(notifd, "notifications")

  function clearAll() {
    for (const n of notifd.get_notifications()) (n as any).dismiss?.()
  }

  return (
    <window
      name={`notifications-widget-${monitor.get_connector()}`}
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
            for (const mon of app.get_monitors()) {
              const w = app.get_window(
                `notifications-widget-${mon.get_connector()}`,
              ) as any
              if (w) w.visible = false
            }
          }
        })
        self.add_controller(controller)
      }}
    >
      <box
        class="notifications-widget"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={8}
      >
        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
          <label
            class="notifications-title"
            label="Notifications"
            xalign={0}
            hexpand
          />
          <button
            class="notifications-clear-all"
            onClicked={clearAll}
            visible={notifications((list) => list.length > 0)}
          >
            <label label="Clear all" />
          </button>
        </box>

        <scrolledwindow
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          maxContentHeight={400}
          minContentHeight={120}
        >
          <box
            class="notifications-list"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={4}
          >
            <For each={notifications}>
              {(n) => (
                <box
                  class="notification-row"
                  orientation={Gtk.Orientation.VERTICAL}
                  spacing={2}
                >
                  <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={6}
                    hexpand
                  >
                    <label
                      class="notification-app"
                      label={createBinding(n, "appName")}
                      xalign={0}
                    />
                    <button
                      class="notification-close"
                      onClicked={() => (n as any).expire?.()}
                    >
                      <label label="✕" />
                    </button>
                  </box>
                  <label
                    class="notification-summary"
                    label={createBinding(n, "summary")}
                    xalign={0}
                  />
                  <label
                    class="notification-body"
                    label={createBinding(n, "body")}
                    xalign={0}
                    wrap
                  />
                </box>
              )}
            </For>
          </box>
        </scrolledwindow>
      </box>
    </window>
  )
}

