
import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib"

export default function AnalogClock(monitor: Gdk.Monitor) {
    const { TOP, RIGHT } = Astal.WindowAnchor

    const drawingArea = new Gtk.DrawingArea({
        hexpand: true,
        vexpand: true,
    })

    drawingArea.set_draw_func((area, cr, width, height) => {
    const now = new Date()

    const seconds = now.getSeconds()
    const minutes = now.getMinutes()
    const hours = now.getHours()

    const centerX = width / 2
    const centerY = height / 2

    const padding = 1
    const radius = Math.min(width, height) / 2 - padding

    // клип по кругу
    //cr.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    //cr.clip()

    // ---------- ФОН ЦИФЕРБЛАТА ----------
    cr.setSourceRGB(0.95, 0.95, 0.95) // почти белый как в macOS
    cr.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    cr.fill()

    // ---------- ВНЕШНИЙ ТОНКИЙ КОНТУР ----------
    cr.setSourceRGBA(0, 0, 0, 0.1)
    cr.setLineWidth(1)
    cr.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    cr.stroke()

    // ---------- ЧАСОВЫЕ ДЕЛЕНИЯ ----------
    for (let i = 0; i < 60; i++) {
        const angle = (i * Math.PI) / 30
        const isHourMark = i % 5 === 0

        const inner = isHourMark ? radius - 14 : radius - 8
        const outer = radius

        cr.setLineWidth(isHourMark ? 2 : 1)
        cr.setSourceRGBA(0, 0, 0, isHourMark ? 0.6 : 0.2)

        cr.moveTo(
            centerX + inner * Math.sin(angle),
            centerY - inner * Math.cos(angle)
        )
        cr.lineTo(
            centerX + outer * Math.sin(angle),
            centerY - outer * Math.cos(angle)
        )
        cr.stroke()
    }

    // ---------- ЦИФРЫ ----------
    cr.setSourceRGB(0.1, 0.1, 0.1)
    cr.selectFontFace("JetBrains Mono", 0, 0) // если нет — fallback
    cr.setFontSize(radius * 0.18)

    for (let i = 1; i <= 12; i++) {
        const angle = (i * Math.PI) / 6
        const textRadius = radius - 30

        const text = i.toString()
        const extents = cr.textExtents(text)

        const x =
            centerX +
            textRadius * Math.sin(angle) -
            extents.width / 2

        const y =
            centerY -
            textRadius * Math.cos(angle) +
            extents.height / 2

        cr.moveTo(x, y)
        cr.showText(text)
    }

    // ---------- ЧАСОВАЯ СТРЕЛКА ----------
    const hourAngle =
        ((hours % 12) + minutes / 60) * (Math.PI / 6)

    cr.setSourceRGB(0.1, 0.1, 0.1)
    cr.setLineWidth(6)
    cr.setLineCap(1)

    cr.moveTo(centerX, centerY)
    cr.lineTo(
        centerX + radius * 0.5 * Math.sin(hourAngle),
        centerY - radius * 0.5 * Math.cos(hourAngle)
    )
    cr.stroke()

    // ---------- МИНУТНАЯ ----------
    const minuteAngle =
        (minutes + seconds / 60) * (Math.PI / 30)

    cr.setLineWidth(4)

    cr.moveTo(centerX, centerY)
    cr.lineTo(
        centerX + radius * 0.75 * Math.sin(minuteAngle),
        centerY - radius * 0.75 * Math.cos(minuteAngle)
    )
    cr.stroke()

    // ---------- СЕКУНДНАЯ ----------
    const secondAngle =
        seconds * (Math.PI / 30)

    cr.setSourceRGB(1, 0.4, 0) // оранжевая как в macOS
    cr.setLineWidth(2)

    cr.moveTo(centerX, centerY)
    cr.lineTo(
        centerX + radius * 0.85 * Math.sin(secondAngle),
        centerY - radius * 0.85 * Math.cos(secondAngle)
    )
    cr.stroke()

    // ---------- ЦЕНТРАЛЬНАЯ ТОЧКА ----------
    cr.setSourceRGB(0.1, 0.1, 0.1)
    cr.arc(centerX, centerY, 4, 0, 2 * Math.PI)
    cr.fill()
    })
 
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
    drawingArea.queue_draw()
    return GLib.SOURCE_CONTINUE
    })

    return (
        <window
            name={"analog-clock-widget"}
            namespace={"ags-widget"}
            layer={Astal.Layer.BOTTOM}
            visible
            gdkmonitor={monitor}
            anchor={TOP | RIGHT}
            margin-top={10}
            margin-right={10}
            application={app}
            focusable={false}
        >
            <box
                class="analog-clock"
                widthRequest={200}
                heightRequest={200}
            >
                {drawingArea}
            </box>
        </window>
    )
}
