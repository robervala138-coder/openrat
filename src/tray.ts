import { spawn, ChildProcess } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const TRAY_SCRIPT = `#!/usr/bin/env python3
import gi, sys, os, signal, subprocess
gi.require_version('Gtk', '3.0')
gi.require_version('AppIndicator3', '0.1')
from gi.repository import Gtk, AppIndicator3, GLib

indicator = None
pid_file = sys.argv[1] if len(sys.argv) > 1 else ""
icon_path = sys.argv[2] if len(sys.argv) > 2 else ""

def on_quit(source):
    if pid_file and os.path.exists(pid_file):
        with open(pid_file, 'r') as f:
            pid = f.read().strip()
        if pid:
            try:
                os.kill(int(pid), signal.SIGTERM)
            except ProcessLookupError:
                pass
        os.remove(pid_file)
    Gtk.main_quit()

def on_open_dashboard(source):
    if pid_file and os.path.exists(pid_file):
        info_file = pid_file + '.info'
        if os.path.exists(info_file):
            with open(info_file, 'r') as f:
                for line in f:
                    if 'dashboard' in line.lower():
                        url = line.split('=', 1)[-1].strip()
                        subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        break

indicator = AppIndicator3.Indicator.new(
    "openrat",
    icon_path if icon_path and os.path.exists(icon_path) else "network-transmit-receive",
    AppIndicator3.IndicatorCategory.APPLICATION_STATUS
)
indicator.set_status(AppIndicator3.IndicatorStatus.ACTIVE)

menu = Gtk.Menu()

item_dashboard = Gtk.MenuItem(label="Abrir Dashboard")
item_dashboard.connect("activate", on_open_dashboard)
menu.append(item_dashboard)

item_sep = Gtk.SeparatorMenuItem()
menu.append(item_sep)

item_quit = Gtk.MenuItem(label="Parar OpenRat")
item_quit.connect("activate", on_quit)
menu.append(item_quit)

menu.show_all()
indicator.set_menu(menu)

GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, lambda: on_quit(None))
GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, lambda: on_quit(None))

Gtk.main()
`

export interface TrayOptions {
  pidFile: string
  iconPath: string
}

export function createTrayIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5b8dee"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <text x="32" y="44" font-family="sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">&#x1F400;</text>
</svg>`
}

export async function writeTrayIcon(dir: string): Promise<string> {
  const svgPath = path.join(dir, 'openrat-tray.svg')
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(svgPath, createTrayIconSvg(), 'utf8')
  return svgPath
}

export async function writeTrayScript(dir: string): Promise<string> {
  const scriptPath = path.join(dir, 'openrat-tray.py')
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(scriptPath, TRAY_SCRIPT, { encoding: 'utf8', mode: 0o755 })
  return scriptPath
}

export async function launchTray(options: TrayOptions): Promise<ChildProcess | null> {
  const trayDir = path.join(os.homedir(), '.openrat', 'tray')
  const scriptPath = await writeTrayScript(trayDir)
  const iconPath = await writeTrayIcon(trayDir)

  try {
    const proc = spawn('python3', [scriptPath, options.pidFile, iconPath], {
      detached: true,
      stdio: 'ignore',
    })
    proc.unref()
    return proc
  } catch {
    return null
  }
}