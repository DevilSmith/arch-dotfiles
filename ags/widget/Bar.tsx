import app from "ags/gtk4/app"
import { For, With, createBinding, onCleanup } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"
import Astal from "gi://Astal?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import AstalBattery from "gi://AstalBattery"
import AstalPowerProfiles from "gi://AstalPowerProfiles"
import AstalWp from "gi://AstalWp"
import AstalNetwork from "gi://AstalNetwork"
import AstalTray from "gi://AstalTray"
import AstalMpris from "gi://AstalMpris"
import AstalHyprland from "gi://AstalHyprland"
import AstalNotifd from "gi://AstalNotifd?version=0.1"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_SPACING = 5
const CMD = {
  launcher: "wofi --show drun",
  network: "nm-connection-editor",
  bluetooth: "blueman-manager",
  volume: "pavucontrol",
} as const

/** Монитор под курсором (через Hyprland) или null. */
function getMonitorUnderCursor(): Gdk.Monitor | null {
  const hypr = AstalHyprland.get_default()
  if (!hypr) return null

  const pos = hypr.get_cursor_position()
  if (!pos) return null

  const x = pos.get_x()
  const y = pos.get_y()

  for (const mon of app.get_monitors() as Gdk.Monitor[]) {
    const g = mon.geometry
    const withinX = x >= g.x && x < g.x + g.width
    const withinY = y >= g.y && y < g.y + g.height
    if (withinX && withinY) return mon
  }

  return null
}

function togglePlayerWidget() {
  const monitor = getMonitorUnderCursor()
  const monitors = monitor ? [monitor] : [...(app.get_monitors() as Gdk.Monitor[])]

  for (const m of monitors) {
    const win = app.get_window(`player-widget-${m.get_connector()}`) as any
    if (!win) continue
    const willShow = !win.visible
    win.visible = willShow
    if (willShow) {
      win.present?.()
      win.grab_focus?.()
    }
  }
}

function toggleNotificationsWidget() {
  const monitor = getMonitorUnderCursor()
  const monitors = monitor ? [monitor] : [...(app.get_monitors() as Gdk.Monitor[])]

  for (const m of monitors) {
    const win = app.get_window(`notifications-widget-${m.get_connector()}`) as any
    if (!win) continue
    const willShow = !win.visible
    win.visible = willShow
    if (willShow) {
      win.present?.()
      win.grab_focus?.()
    }
  }
}

function toggleAppMenu() {
  const monitor = getMonitorUnderCursor()
  const monitors = monitor ? [monitor] : [...(app.get_monitors() as Gdk.Monitor[])]

  for (const m of monitors) {
    const win = app.get_window(`app-menu-${m.get_connector()}`) as any
    if (!win) continue
    const willShow = !win.visible
    win.visible = willShow
    if (willShow) {
      win.present?.()
      win.grab_focus?.()
    }
  }
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

/** Сортировка по «номеру» из name (например "4", "3:vim"), иначе по id. */
function workspaceSortKey(ws: { name: string; id: number }): number {
  const head = ws.name.split(":")[0] ?? ""
  const n = parseInt(head, 10)
  return Number.isNaN(n) ? 1e9 + ws.id : n
}

/** Подпись: name как в Hyprland; если пусто (часто после старта) — id. */
function workspaceLabel(ws: { name: string; id: number }): string {
  const n = ws.name?.trim()
  if (!n) return String(ws.id)
  const head = n.split(":")[0]?.trim()
  return head || String(ws.id)
}

/** Текущий стол иногда не попадает в workspaces, пока нет окон / до sync — добавляем вручную. */
function mergeWithActive<T extends { id: number }>(list: T[], active: T | null | undefined): T[] {
  if (!active) return [...list]
  if (list.some((w) => w.id === active.id)) return [...list]
  return [...list, active]
}

function Workspaces({ gdkMonitor }: { gdkMonitor: Gdk.Monitor }) {
  const hypr = AstalHyprland.get_default()!
  const connector = gdkMonitor.get_connector()
  const hMonitor = connector ? hypr.get_monitor_by_name(connector) : null
  // На этом мониторе — activeWorkspace; иначе глобальный фокус (один монитор / нет сопоставления имён).
  const active = hMonitor
    ? createBinding(hMonitor, "activeWorkspace")
    : createBinding(hypr, "focusedWorkspace")
  // Списка из одного workspaces мало: текущий стол после старта/без окон часто не в массиве,
  // а notify на нём не всегда совпадает с activeWorkspace. Опрос короткий — стабильный merge.
  const connectorStr = connector ?? ""
  const sorted = createPoll(
    (() => {
      const hm = connectorStr ? hypr.get_monitor_by_name(connectorStr) : null
      const arr = hypr.get_workspaces()
      const f = hm?.activeWorkspace ?? hypr.focusedWorkspace
      return mergeWithActive(arr, f).sort((a, b) => workspaceSortKey(a) - workspaceSortKey(b))
    })(),
    200,
    () => {
      const hm = connectorStr ? hypr.get_monitor_by_name(connectorStr) : null
      const arr = hypr.get_workspaces()
      const f = hm?.activeWorkspace ?? hypr.focusedWorkspace
      return mergeWithActive(arr, f).sort((a, b) => workspaceSortKey(a) - workspaceSortKey(b))
    },
  )

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={BAR_SPACING}>
      <For each={sorted}>
        {(ws) => (
          <button
            class={active((f) => (f?.id === ws.id ? "workspace active" : "workspace"))}
            onClicked={() => hypr.dispatch("workspace", ws.name?.trim() ? ws.name : String(ws.id))}
          >
            <label label={workspaceLabel(ws)} />
          </button>
        )}
      </For>
    </box>
  )
}

// ---------------------------------------------------------------------------
// MPRIS
// ---------------------------------------------------------------------------

const MPRIS_ICON_PLAY = "media-playback-start-symbolic"
const MPRIS_ICON_PAUSE = "media-playback-pause-symbolic"

function Mpris() {
  const mpris = AstalMpris.get_default()
  const players = createBinding(mpris, "players")

  return (
    <box hexpand>
      <box hexpand />
      <button class="icon-button status-button" onClicked={togglePlayerWidget}>
        <With value={players}>
          {(list) => {
            const p = list[0]
            if (!p) {
              return (
                <image
                  class="status-icon"
                  iconName={MPRIS_ICON_PLAY}
                  halign={Gtk.Align.CENTER}
                  valign={Gtk.Align.CENTER}
                />
              )
            }
            return (
              <image
                class="status-icon"
                iconName={createBinding(p, "playbackStatus")((s) =>
                  s === AstalMpris.PlaybackStatus.PLAYING ? MPRIS_ICON_PAUSE : MPRIS_ICON_PLAY
                )}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
              />
            )
          }}
        </With>
      </button>
      <box hexpand />
    </box>
  )
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function Tray() {
  const tray = AstalTray.get_default()
  const items = createBinding(tray, "items")

  return (
    <box class="tray-box" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <For each={items}>
        {(item) => (
          <menubutton class="tray-item" hasFrame={false} canFocus={false}>
            <image class="tray-icon" gicon={createBinding(item, "gicon")} />
          </menubutton>
        )}
      </For>
    </box>
  )
}

// ---------------------------------------------------------------------------
// Wireless
// ---------------------------------------------------------------------------

function Wireless() {
  const network = AstalNetwork.get_default()
  const wifi = createBinding(network, "wifi")

  return (
    <box class="status-item" visible={wifi(Boolean)} hexpand>
      <With value={wifi}>
        {(w) =>
          w && (
            <box hexpand>
              <box hexpand />
              <button
                class="icon-button status-button"
                tooltipText={createBinding(w, "ssid")}
                onClicked={() => execAsync(CMD.network).catch(() => {})}
              >
                <image
                  class="status-icon"
                  iconName="network-wireless-signal-excellent-symbolic"
                  halign={Gtk.Align.CENTER}
                  valign={Gtk.Align.CENTER}
                />
              </button>
              <box hexpand />
            </box>
          )
        }
      </With>
    </box>
  )
}

// ---------------------------------------------------------------------------
// Bluetooth
// ---------------------------------------------------------------------------

function BluetoothButton() {
  return (
    <button
      class="icon-button status-button"
      halign={Gtk.Align.CENTER}
      onClicked={() => execAsync(CMD.bluetooth).catch(() => {})}
    >
      <image iconName="bluetooth-symbolic" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function NotificationsButton() {
  const notifd = AstalNotifd.get_default()
  const hasNotifications = createBinding(notifd, "notifications")((list) => list.length > 0)
  return (
    <box hexpand>
      <box hexpand />
      <button
        class={hasNotifications((h) =>
          h ? "icon-button status-button has-notifications" : "icon-button status-button"
        )}
        onClicked={toggleNotificationsWidget}
      >
        <image
          class="status-icon"
          iconName="preferences-system-notifications-symbolic"
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        />
      </button>
      <box hexpand />
    </box>
  )
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

function AudioOutput() {
  const { defaultSpeaker: speaker } = AstalWp.get_default()!
  return (
    <button
      class="icon-button status-button"
      halign={Gtk.Align.CENTER}
      onClicked={() => execAsync(CMD.volume).catch(() => {})}
    >
      <image iconName={createBinding(speaker, "volumeIcon")} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Battery + power profiles
// ---------------------------------------------------------------------------

function Battery() {
  const battery = AstalBattery.get_default()
  const power = AstalPowerProfiles.get_default()
  const percent = createBinding(battery, "percentage")((p) => `${Math.floor(p * 100)}%`)
  const activeProfile = createBinding(power, "activeProfile")
  const profiles = createBinding(power, "profiles")

  return (
    <menubutton class="status-item" hasFrame={false} canFocus={false} halign={Gtk.Align.CENTER}>
      <box
        class="battery-button status-button"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={BAR_SPACING}
        visible={createBinding(battery, "isPresent")}
        halign={Gtk.Align.CENTER}
      >
        <image iconName={createBinding(battery, "iconName")} />
        <label class="battery-percent-label" label={percent} xalign={0.5} yalign={0.5} />
      </box>
      <popover>
        <box
          class="power-profiles-popover"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={BAR_SPACING}
          margin-top={6}
          margin-bottom={6}
          margin-start={8}
          margin-end={8}
        >
          <For each={profiles}>
            {(p) => (
              <button
                class={activeProfile((ap) =>
                  ap && ap.profile === p.profile ? "power-profile-row active" : "power-profile-row"
                )}
                onClicked={() => { power.activeProfile = p }}
              >
                <label xalign={0} label={p.description ?? p.profile ?? ""} />
              </button>
            )}
          </For>
        </box>
      </popover>
    </menubutton>
  )
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

function Clock() {
  const time = createPoll("", 1000, () => GLib.DateTime.new_now_local().format("%H\n%M")!)
  return (
    <button class="icon-button status-button" halign={Gtk.Align.CENTER}>
      <label label={time} xalign={0.5} yalign={0.5} justify={Gtk.Justification.CENTER} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Bar (main)
// ---------------------------------------------------------------------------

export default function Bar(monitor: Gdk.Monitor) {
  let win: Astal.Window
  const { TOP, LEFT, BOTTOM } = Astal.WindowAnchor

  onCleanup(() => win.destroy())

  return (
    <window
      $={(self) => (win = self)}
      visible
      name={`bar-${monitor.get_connector()}`}
      namespace="nord-bar"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | BOTTOM}
      application={app}
    >
      <box class="bar-root" orientation={Gtk.Orientation.VERTICAL} spacing={BAR_SPACING} vexpand>
        <box class="island bar-island arch-island">
          <box hexpand />
          <button class="icon-button status-button" onClicked={toggleAppMenu}>
            <label class="arch-label" label=" " xalign={0.5} yalign={0.5} widthChars={1} />
          </button>
          <box hexpand />
        </box>

        <box class="island bar-island" orientation={Gtk.Orientation.VERTICAL} spacing={BAR_SPACING}>
          <Workspaces gdkMonitor={monitor} />
        </box>

        <box class="island bar-island center-island" spacing={BAR_SPACING}>
          <Mpris />
        </box>

        <box
          class="island bar-island right-island"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={BAR_SPACING}
          vexpand
          valign={Gtk.Align.END}
        >
          <Wireless />
          <BluetoothButton />
          <AudioOutput />
          <Battery />
          <Clock />
        </box>

        <box class="island bar-island notifications-island" spacing={BAR_SPACING}>
          <NotificationsButton />
        </box>
      </box>
    </window>
  )
}
