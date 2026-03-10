import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib"
import AstalNotifd from "gi://AstalNotifd?version=0.1"

const POPUP_DURATION_MS = 4000
/** Отступ под баром: высота бара ~48px */
const MARGIN_TOP_BELOW_BAR = 7

export default function NotificationPopup(monitor: Gdk.Monitor) {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const notifd = AstalNotifd.get_default()

  let popupWin: any = null
  let stackBox: Gtk.Box | null = null
  let prevCount = 0

  function addToast(n: { appName?: string; app_name?: string; summary?: string; body?: string }) {
    if (!stackBox) return
    const appName = n.appName ?? n.app_name ?? ""
    const summary = n.summary ?? ""
    const body = n.body ?? ""

    const toastBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 4,
    })
    toastBox.add_css_class("notification-popup")

    const labelApp = new Gtk.Label({ label: appName, xalign: 0, wrap: true })
    labelApp.add_css_class("notification-popup-app")
    const labelSummary = new Gtk.Label({ label: summary, xalign: 0, wrap: true })
    labelSummary.add_css_class("notification-popup-summary")
    const labelBody = new Gtk.Label({ label: body, xalign: 0, wrap: true })
    labelBody.add_css_class("notification-popup-body")

    toastBox.append(labelApp)
    toastBox.append(labelSummary)
    toastBox.append(labelBody)

    stackBox.prepend(toastBox)

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, POPUP_DURATION_MS, () => {
      if (stackBox && toastBox.get_parent() === stackBox) {
        stackBox.remove(toastBox)
      }
      if (popupWin && stackBox && stackBox.get_first_child() === null) {
        popupWin.visible = false
      }
      return GLib.SOURCE_REMOVE
    })
  }

  return (
    <window
      name={`notification-popup-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.NONE}
      visible={false}
      gdkmonitor={monitor}
      anchor={TOP | RIGHT}
      margin-top={MARGIN_TOP_BELOW_BAR}
      margin-right={24}
      application={app}
      focusable={false}
      $={(self) => {
        popupWin = self
        notifd.connect("notify::notifications", () => {
          const list = notifd.notifications
          if (list.length > prevCount && list.length > 0) {
            const newOnes = list.slice(prevCount)
            for (let i = newOnes.length - 1; i >= 0; i--) {
              const last = newOnes[i]
              addToast({
                appName: last.appName ?? last.app_name,
                summary: last.summary,
                body: last.body,
              })
            }
            if (popupWin) popupWin.visible = true
          }
          prevCount = list.length
        })
      }}
    >
      <box
        class="notification-popup-stack"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={8}
        $={(el) => (stackBox = el)}
      />
    </window>
  )
}
