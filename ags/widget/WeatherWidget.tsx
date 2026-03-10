import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"

// Open-Meteo: бесплатный API без ключа. Координаты — Москва (можно поменять на свой город).
const LAT = "55.7558"
const LON = "37.6173"
const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m&timezone=auto`

export default function WeatherWidget(monitor: Gdk.Monitor) {
  const weatherScript = `T=$(curl -sL "${OPEN_METEO_URL}" 2>/dev/null | grep -oE '"temperature_2m":[0-9.-]+' | cut -d: -f2); [ -n "$T" ] && printf '%.0f°C\n' "$T" || echo "—"`
  const weather = createPoll(
    "…",
    600_000,
    ["bash", "-c", weatherScript],
  )

  const { TOP, RIGHT } = Astal.WindowAnchor

  return (
    <window
      name={`weather-widget-${monitor.get_connector()}`}
      namespace="ags-widget"
      layer={Astal.Layer.BOTTOM}
      visible
      gdkmonitor={monitor}
      anchor={TOP | RIGHT}
      margin-right={10}
      margin-top={220}
      application={app}
      focusable={false}
    >
      <box class="desktop-weather" orientation={Gtk.Orientation.VERTICAL}>
        <label
          class="weather-main"
          label={weather}
          hexpand={true}
          xalign={0.5}
        />
      </box>
    </window>
  )
}

