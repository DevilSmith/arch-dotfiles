import app from "ags/gtk4/app"
import { For, With, createBinding, onCleanup } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
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

const BAR_SPACING = 6
const CMD = {
  launcher: "wofi --show drun",
  network: "nm-connection-editor",
  bluetooth: "blueman-manager",
  volume: "pavucontrol",
} as const

function formatWindowTitle(c: { appClass?: string; instance?: string; class?: string } | null): string {
  if (!c) return ""
  let name = c.appClass || c.instance || c.class || ""
  if (!name) return ""
  if (name.includes(".")) name = name.split(".").pop() ?? name
  return name[0].toUpperCase() + name.slice(1)
}

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

function Workspaces({ gdkMonitor }: { gdkMonitor: Gdk.Monitor }) {
  const hypr = AstalHyprland.get_default()!
  const connector = gdkMonitor.get_connector()
  const hMonitor = connector ? hypr.get_monitor_by_name(connector) : null
  // На этом мониторе — activeWorkspace; иначе глобальный фокус (один монитор / нет сопоставления имён).
  const active = hMonitor
    ? createBinding(hMonitor, "activeWorkspace")
    : createBinding(hypr, "focusedWorkspace")
  const workspaces = createBinding(hypr, "workspaces")
  const sorted = workspaces((arr) =>
    [...arr].sort((a, b) => workspaceSortKey(a) - workspaceSortKey(b)),
  )

  return (
    <box spacing={BAR_SPACING}>
      <For each={sorted}>
        {(ws) => (
          <button
            class={active((f) => (f?.name === ws.name ? "workspace active" : "workspace"))}
            onClicked={() => hypr.dispatch("workspace", ws.name)}
          >
            <label label={ws.name} />
          </button>
        )}
      </For>
    </box>
  )
}

// ---------------------------------------------------------------------------
// Active window
// ---------------------------------------------------------------------------

function ActiveWindow() {
  const hypr = AstalHyprland.get_default()
  const client = createBinding(hypr, "focusedClient")

  return (
    <label
      class="workspace"
      maxWidthChars={40}
      singleLineMode
      ellipsize={Pango.EllipsizeMode.END}
      xalign={0}
      label={client(formatWindowTitle)}
    />
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
    <button class="icon-button" onClicked={togglePlayerWidget}>
      <box spacing={0}>
        <For each={players}>
          {(player) => (
            <image
              iconName={createBinding(player, "playbackStatus")((s) =>
                s === AstalMpris.PlaybackStatus.PLAYING
                  ? MPRIS_ICON_PAUSE
                  : MPRIS_ICON_PLAY
              )}
            />
          )}
        </For>
        <image
          iconName={MPRIS_ICON_PLAY}
          visible={players((list) => list.length === 0)}
        />
      </box>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function Tray() {
  const tray = AstalTray.get_default()
  const items = createBinding(tray, "items")

  return (
    <box>
      <For each={items}>
        {(item) => (
          <menubutton>
            <image gicon={createBinding(item, "gicon")} />
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
    <box visible={wifi(Boolean)}>
      <With value={wifi}>
        {(w) =>
          w && (
            <button class="icon-button" onClicked={() => execAsync(CMD.network).catch(() => {})}>
              <box spacing={BAR_SPACING}>
                <image iconName="network-wireless-signal-excellent-symbolic" />
                <label
                  label={wifi((ap: any) => ap?.get_ssid?.() ?? ap?.ssid ?? "")}
                />
              </box>
            </button>
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
    <button class="icon-button" onClicked={() => execAsync(CMD.bluetooth).catch(() => {})}>
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
    <button
      class={hasNotifications((h) => (h ? "icon-button has-notifications" : "icon-button"))}
      onClicked={toggleNotificationsWidget}
    >
      <image iconName="preferences-system-notifications-symbolic" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

function AudioOutput() {
  const { defaultSpeaker: speaker } = AstalWp.get_default()!
  return (
    <button class="icon-button" onClicked={() => execAsync(CMD.volume).catch(() => {})}>
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
    <menubutton hasFrame={false} canFocus={false}>
      <box
        class="battery-button"
        spacing={BAR_SPACING}
        visible={createBinding(battery, "isPresent")}
      >
        <image iconName={createBinding(battery, "iconName")} />
        <label label={percent} />
        <label class="battery-profile-label" label={activeProfile((p) => p?.profile ?? "")} />
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
  const time = createPoll("", 1000, () => GLib.DateTime.new_now_local().format("%H:%M")!)
  return (
    <button class="icon-button">
      <label label={time} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Bar (main)
// ---------------------------------------------------------------------------

export default function Bar(monitor: Gdk.Monitor) {
  let win: Astal.Window
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  onCleanup(() => win.destroy())

  return (
    <window
      $={(self) => (win = self)}
      visible
      name={`bar-${monitor.get_connector()}`}
      namespace="nord-bar"
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <box class="bar-root" orientation={Gtk.Orientation.HORIZONTAL} spacing={BAR_SPACING} hexpand>
        <box class="island arch-island">
          <button class="icon-button" onClicked={toggleAppMenu}>
            <label class="arch-label" label="" xalign={0.5} yalign={0.5} />
          </button>
        </box>

        <box class="island" spacing={BAR_SPACING}>
          <Workspaces gdkMonitor={monitor} />
          <ActiveWindow />
        </box>

        <box class="island center-island" spacing={BAR_SPACING}>
          <Mpris />
        </box>

        <box class="island right-island" spacing={BAR_SPACING} hexpand halign={Gtk.Align.END}>
          <Wireless />
          <BluetoothButton />
          <AudioOutput />
          <Battery />
          <Clock />
        </box>

        <box class="island" spacing={BAR_SPACING}>
          <NotificationsButton />
        </box>
      </box>
    </window>
  )
}
