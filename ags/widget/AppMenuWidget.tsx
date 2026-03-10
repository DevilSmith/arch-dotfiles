import app from "ags/gtk4/app"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
import { Astal, Gtk, Gdk } from "ags/gtk4"

const WINDOW_NAME_PREFIX = "app-menu"

function closeAllAppMenus() {
  for (const mon of app.get_monitors()) {
    const w = app.get_window(`${WINDOW_NAME_PREFIX}-${mon.get_connector()}`) as any
    if (w) w.visible = false
  }
}

function launchAndClose(appInfo: Gio.AppInfo) {
  try {
    const display = Gdk.Display.get_default()
    const launchContext = display ? display.get_app_launch_context() : null
    appInfo.launch([], launchContext)
  } catch (_) {}
  closeAllAppMenus()
}

export default function AppMenuWidget(monitor: Gdk.Monitor) {
  const { NONE } = Astal.WindowAnchor

  const allApps: Gio.AppInfo[] = []
  try {
    const list = Gio.AppInfo.get_all()
    for (let i = 0; i < list.length; i++) {
      const info = list[i]
      if (info.should_show()) allApps.push(info)
    }
    allApps.sort((a, b) => {
      const na = (a.get_display_name() || "").toLowerCase()
      const nb = (b.get_display_name() || "").toLowerCase()
      return na.localeCompare(nb)
    })
  } catch (_) {}

  const mainBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 8,
  })
  mainBox.add_css_class("app-menu")

  const searchEntry = new Gtk.SearchEntry({
    placeholder_text: "Search applications…",
    hexpand: true,
  })
  searchEntry.add_css_class("app-menu-search")
  mainBox.append(searchEntry)

  const scrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    min_content_height: 280,
    max_content_height: 400,
    propagate_natural_height: true,
  })
  mainBox.append(scrolled)

  const listBox = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.NONE,
    show_separators: false,
  })
  listBox.add_css_class("app-menu-list")
  scrolled.set_child(listBox)

  const rowByApp = new Map<Gio.AppInfo, Gtk.ListBoxRow>()

  function buildRow(appInfo: Gio.AppInfo): Gtk.ListBoxRow {
    const row = new Gtk.ListBoxRow()
    row.add_css_class("app-menu-row")
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 12,
      margin_start: 10,
      margin_end: 10,
      margin_top: 4,
      margin_bottom: 4,
    })
    const icon = appInfo.get_icon()
    if (icon) {
      const img = new Gtk.Image({ gicon: icon, icon_size: Gtk.IconSize.LARGE })
      img.add_css_class("app-menu-icon")
      box.append(img)
    }
    const label = new Gtk.Label({
      label: appInfo.get_display_name() || "",
      hexpand: true,
      xalign: 0,
      ellipsize: Pango.EllipsizeMode.END,
    })
    label.add_css_class("app-menu-label")
    box.append(label)
    row.set_child(box)
    ;(row as any).__appInfo = appInfo
    rowByApp.set(appInfo, row)
    return row
  }

  let currentQuery = ""

  function filterList() {
    currentQuery = (searchEntry.text || "").trim().toLowerCase()
    listBox.invalidate_filter()
  }

  listBox.set_filter_func((row) => {
    const info = (row as any).__appInfo as Gio.AppInfo | undefined
    if (!info) return false
    const name = (info.get_display_name() || "").toLowerCase()
    return !currentQuery || name.includes(currentQuery)
  })

  for (const appInfo of allApps) {
    listBox.append(buildRow(appInfo))
  }

  listBox.connect("row-activated", (_box, row: Gtk.ListBoxRow) => {
    const info = (row as any).__appInfo as Gio.AppInfo | undefined
    if (info) launchAndClose(info)
  })

  searchEntry.connect("search-changed", () => filterList())
  searchEntry.connect("activate", () => {
    const n = listBox.get_n_children()
    for (let i = 0; i < n; i++) {
      const row = listBox.get_row_at_index(i) as Gtk.ListBoxRow
      if (!row.visible) continue
      const info = (row as any).__appInfo as Gio.AppInfo
      if (info) {
        launchAndClose(info)
        break
      }
    }
  })

  return (
    <window
      name={`${WINDOW_NAME_PREFIX}-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={false}
      gdkmonitor={monitor}
      anchor={NONE}
      application={app}
      focusable
      $={(self) => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) closeAllAppMenus()
        })
        self.add_controller(controller)

         // Обработка Esc прямо в строке поиска, чтобы точно срабатывало
         const entryController = new Gtk.EventControllerKey()
         entryController.connect("key-pressed", (_c, keyval) => {
           if (keyval === Gdk.KEY_Escape) closeAllAppMenus()
         })
         searchEntry.add_controller(entryController)

        self.connect("show", () => {
          searchEntry.set_text("")
          filterList()
          // Отложенный фокус — после отрисовки окна, чтобы точно попасть в строку поиска
          GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            searchEntry.grab_focus()
            return false
          })
        })
      }}
    >
      <box>{mainBox}</box>
    </window>
  )
}
