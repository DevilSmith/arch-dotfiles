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

  async function getVpnList(): Promise<string[]> {
    try {
      const out = await execAsync("nmcli -t -f NAME,TYPE connection show")
      return out
        .split("\n")
        .filter(line => {
          const type = line.split(":")[1]
          return type === "vpn" || type === "wireguard"
        })
        .map(line => line.split(":")[0])
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

    for (const name of list) {
      if (!vpnRows[name]) {
        const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 })
        row.add_css_class("vpn-item")

        const label = new Gtk.Label({ label: name, hexpand: true, xalign: 0 })
        const toggle = new Gtk.Switch({ active: name === active })

        toggle.connect("notify::active", async self => {
          if (self.active)
            await execAsync(`nmcli connection up "${name}"`)
          else
            await execAsync(`nmcli connection down "${name}"`)
          refresh()
        })

        row.append(label)
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

  refresh()
  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
    refresh()
    return GLib.SOURCE_CONTINUE
  })

  return (
    <window
      name="vpn-widget"
      namespace="ags-widget"
      layer={Astal.Layer.BOTTOM}
      visible
      gdkmonitor={monitor}
      anchor={BOTTOM | RIGHT}
      margin-bottom={10}
      margin-right={10}
      application={app}
      focusable={false}
    >
      <box class="vpn-container">
        {container}
      </box>
    </window>
  )
}
