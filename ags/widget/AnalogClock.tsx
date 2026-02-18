
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
        const radius = Math.min(width, height) / 2 - 10

        cr.setSourceRGBA(1, 1, 1, 0)
        cr.paint()

        // Внешний круг
        cr.setSourceRGB(1, 1, 1)
        cr.setLineWidth(2)
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        cr.stroke()

        // Метки часов
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6
            const inner = radius - 10
            const outer = radius

            const x1 = centerX + inner * Math.sin(angle)
            const y1 = centerY - inner * Math.cos(angle)
            const x2 = centerX + outer * Math.sin(angle)
            const y2 = centerY - outer * Math.cos(angle)

            cr.moveTo(x1, y1)
            cr.lineTo(x2, y2)
            cr.stroke()
        }

        // Часовая стрелка
        const hourAngle =
            ((hours % 12) + minutes / 60) * (Math.PI / 6)

        cr.setLineWidth(4)
        cr.moveTo(centerX, centerY)
        cr.lineTo(
            centerX + radius * 0.5 * Math.sin(hourAngle),
            centerY - radius * 0.5 * Math.cos(hourAngle)
        )
        cr.stroke()

        // Минутная стрелка
        const minuteAngle =
            (minutes + seconds / 60) * (Math.PI / 30)

        cr.setLineWidth(3)
        cr.moveTo(centerX, centerY)
        cr.lineTo(
            centerX + radius * 0.75 * Math.sin(minuteAngle),
            centerY - radius * 0.75 * Math.cos(minuteAngle)
        )
        cr.stroke()

        // Секундная стрелка
        const secondAngle =
            seconds * (Math.PI / 30)

        cr.setSourceRGB(1, 0, 0)
        cr.setLineWidth(2)
        cr.moveTo(centerX, centerY)
        cr.lineTo(
            centerX + radius * 0.9 * Math.sin(secondAngle),
            centerY - radius * 0.9 * Math.cos(secondAngle)
        )
        cr.stroke()

        // Центральная точка
        cr.setSourceRGB(1, 1, 1)
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
            margin-top={20}
            margin-right={20}
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
