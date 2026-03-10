import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
import AstalMpris from "gi://AstalMpris"
import { createBinding, For } from "ags"

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function PlayerWidget(monitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor
  const mpris = AstalMpris.get_default()
  const players = createBinding(mpris, "players")
  let playButton: Gtk.Button | null = null

  return (
    <window
      name={`player-widget-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={false}
      gdkmonitor={monitor}
      anchor={TOP}
      margin-top={50}
      application={app}
      focusable
      $={(self) => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            // закрываем все окна player-widget на всех мониторах
            for (const mon of app.get_monitors()) {
              const w = app.get_window(
                `player-widget-${mon.get_connector()}`,
              ) as any
              if (w) w.visible = false
            }
          }
        })
        self.add_controller(controller)

        self.connect("notify::visible", () => {
          if (!(self as any).visible || !playButton) return
          // Откладываем фокус на следующую итерацию цикла, чтобы сработало после
          // present() и grab_focus() окна в Bar / hotkey handler
          GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            playButton?.grab_focus?.()
            return GLib.SOURCE_REMOVE
          })
        })
      }}
    >
      <box class="vpn-container player-widget" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        <For each={players}>
          {(player) => {
            const length = Math.max(1, player.length)
            const adj = new Gtk.Adjustment({
              lower: 0,
              upper: length,
              value: Math.max(0, Math.min(player.position, length)),
              stepIncrement: 1,
              pageIncrement: 5,
            })
            const scale = new Gtk.Scale({
              adjustment: adj,
              drawValue: false,
              orientation: Gtk.Orientation.HORIZONTAL,
              hexpand: true,
            })
            const updateFromPlayer = () => {
              const len = Math.max(1, player.length)
              adj.upper = len
              adj.value = Math.max(0, Math.min(player.position, len))
            }
            player.connect("notify::position", updateFromPlayer)
            player.connect("notify::length", updateFromPlayer)

            // Квадратная обложка или заглушка
            const cover = Gtk.Image.new_from_icon_name("audio-x-generic-symbolic")
            cover.add_css_class?.("player-widget-cover")
            ;(cover as any).set_pixel_size?.(72)
            const updateCover = () => {
              const art =
                (player as any).cover_art ||
                (player as any).coverArt ||
                (player as any).art_url ||
                (player as any).artUrl ||
                ""

              // Ничего не известно → ставим заглушку
              if (!art) {
                cover.set_from_icon_name?.("audio-x-generic-symbolic")
                return
              }

              // file:// или просто абсолютный путь
              let path = ""
              if (art.startsWith("file://")) path = art.slice("file://".length)
              else if (art.startsWith("/")) path = art

              if (path) {
                try {
                  ;(cover as any).set_from_file?.(path)
                  return
                } catch {
                  // упадём в заглушку ниже
                }
              }

              // http/https или что-то странное → остаёмся на иконке
              cover.set_from_icon_name?.("audio-x-generic-symbolic")
            }
            updateCover()
            ;(player as any).connect?.("notify::cover-art", updateCover)
            ;(player as any).connect?.("notify::art-url", updateCover)

            return (
              <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                  {cover}
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                    <label
                      class="player-widget-identity"
                      label={createBinding(player, "identity")}
                      xalign={0}
                    />
                    <label
                      class="player-widget-title"
                      label={createBinding(player, "title")}
                      maxWidthChars={35}
                      ellipsize={Pango.EllipsizeMode.END}
                      xalign={0}
                    />
                  </box>
                </box>
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
                  <label
                    class="player-widget-time"
                    label={createBinding(player, "position")((p) => formatTime(p))}
                  />
                  {scale}
                  <label
                    class="player-widget-time"
                    label={createBinding(player, "length")((l) => formatTime(l))}
                  />
                </box>
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                  <button
                    class="player-widget-btn"
                    onClicked={() => player.previous()}
                  >
                    <label label="⏮" />
                  </button>
                  <button
                    class="player-widget-btn"
                    onClicked={() => player.play_pause()}
                    $={(btn) => {
                      if (!playButton) playButton = btn as Gtk.Button
                    }}
                  >
                    <label
                      label={createBinding(player, "playbackStatus")((s) =>
                        s === AstalMpris.PlaybackStatus.PLAYING ? "⏸" : "▶"
                      )}
                    />
                  </button>
                  <button
                    class="player-widget-btn"
                    onClicked={() => player.next()}
                  >
                    <label label="⏭" />
                  </button>
                </box>
              </box>
            )
          }}
        </For>
      </box>
    </window>
  )
}
