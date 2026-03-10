import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"

export default function VpnWidget(monitor: Gdk.Monitor) {
  const { BOTTOM, RIGHT } = Astal.WindowAnchor

  const container = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 8,
  })

  const title = new Gtk.Label({
    label: "VPN",
    halign: Gtk.Align.START,
  })
  title.add_css_class("vpn-title")
  container.append(title)

  // хранилище для row, чтобы не пересоздавать виджеты
  const vpnRows: Record<string, { row: Gtk.Box; label: Gtk.Label; toggle: Gtk.Switch }> = {}

  type VpnEntry = { name: string; type: string }

  async function getVpnList(): Promise<VpnEntry[]> {
    try {
      const out = await execAsync("nmcli -t -f NAME,TYPE connection show")
      return out
        .split("\n")
        .filter(line => {
          const type = line.split(":")[1]
          return type === "vpn" || type === "wireguard"
        })
        .map(line => {
          const [name, type] = line.split(":")
          return { name, type }
        })
    } catch {
      return []
    }
  }

  async function getActiveVpn(): Promise<string | null> {
    try {
      const out = await execAsync(
        "nmcli -t -f NAME,TYPE connection show --active"
      )
      const line = out
        .split("\n")
        .find(l => {
          const type = l.split(":")[1]
          return type === "vpn" || type === "wireguard"
        })
      return line ? line.split(":")[0] : null
    } catch {
      return null
    }
  }

  async function refresh() {
    const list = await getVpnList()
    const active = await getActiveVpn()

    for (const { name, type } of list) {
      if (!vpnRows[name]) {
        const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 })
        row.add_css_class("vpn-item")

        const label = new Gtk.Label({ label: name, hexpand: true, xalign: 0 })
        const proto = new Gtk.Label({
          label: type === "wireguard" ? "WireGuard" : "VPN",
          halign: Gtk.Align.START,
        })
        proto.add_css_class("vpn-proto")

        const textBox = new Gtk.Box({
          orientation: Gtk.Orientation.VERTICAL,
          spacing: 2,
          hexpand: true,
        })
        textBox.append(label)
        textBox.append(proto)

        const toggle = new Gtk.Switch({
          active: name === active,
          valign: Gtk.Align.CENTER,
        })

        toggle.connect("notify::active", (self) => {
          const run = async () => {
            try {
              if (self.active)
                await execAsync(`nmcli connection up "${name}"`)
              else
                await execAsync(`nmcli connection down "${name}"`)
              await refresh()
            } catch (_) {}
          }
          run()
        })

        row.append(textBox)
        row.append(toggle)
        container.append(row)

        vpnRows[name] = { row, label, toggle }
      }

      // обновляем состояние без пересоздания
      vpnRows[name].toggle.active = name === active

      if (name === active) {
        vpnRows[name].row.add_css_class("active")
      } else {
        vpnRows[name].row.remove_css_class("active")
      }
    }
  }

  refresh().catch(() => {})
  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
    refresh().catch(() => {})
    return GLib.SOURCE_CONTINUE
  })

  return (
    <window
      name={`vpn-widget-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={false}
      gdkmonitor={monitor}
      anchor={BOTTOM | RIGHT}
      margin-bottom={10}
      margin-right={10}
      application={app}
      focusable
      $={(self) => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            // закрываем все окна vpn-widget на всех мониторах
            for (const mon of app.get_monitors()) {
              const w = app.get_window(
                `vpn-widget-${mon.get_connector()}`,
              ) as any
              if (w) w.visible = false
            }
          }
        })
        self.add_controller(controller)
      }}
    >
      <box class="vpn-container vpn-widget">
        {container}
      </box>
    </window>
  )
}
