import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { launchTray } from './tray.js'

export interface BackgroundOptions {
  pidFile: string
  infoFile: string
  dashboardUrl: string
  gatewayUrl: string
}

/**
 * Re-spawns the current process in detached mode and exits the parent.
 * This is the only reliable way to fully release the terminal on Linux.
 *
 * The child process is launched with the same argv plus --daemon flag,
 * runs in its own session (detached), and the parent process exits cleanly.
 */
export async function goBackground(opts: BackgroundOptions): Promise<void> {
  // If already running as a daemon, just set up tray + pid file
  if (process.argv.includes('--daemon')) {
    await setupDaemon(opts)
    return
  }

  // Write the stop script BEFORE respawning so it's available immediately
  const stopScript = path.join(os.homedir(), '.openrat', 'stop.sh')
  await fs.promises.mkdir(path.dirname(stopScript), { recursive: true })
  await fs.promises.writeFile(
    stopScript,
    `#!/usr/bin/env bash\nkill $(cat "${opts.pidFile}") 2>/dev/null && echo "OpenRat parado." || echo "OpenRat nao esta rodando."\n`,
    { encoding: 'utf8', mode: 0o755 },
  )

  // Notify user that we're going to background
  process.stdout.write('\x1b[?25h') // ensure cursor visible
  process.stdout.write(
    `\n OpenRat esta rodando em background.\n` +
    ` Para parar: bash ${stopScript}\n\n`,
  )

  // Small delay to ensure the message is flushed
  await new Promise(resolve => setTimeout(resolve, 100))

  // Re-spawn ourselves as a detached daemon
  const child = spawn(process.execPath, [...process.argv.slice(1), '--daemon'], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      OPENRAT_BG_PID_FILE: opts.pidFile,
      OPENRAT_BG_INFO_FILE: opts.infoFile,
      OPENRAT_BG_DASHBOARD_URL: opts.dashboardUrl,
      OPENRAT_BG_GATEWAY_URL: opts.gatewayUrl,
    },
  })
  child.unref()

  // Parent exits — this releases the terminal
  process.exit(0)
}

/**
 * Runs when the process is the daemon child (--daemon flag).
 * Sets up PID file, info file, tray icon, and redirect stdio.
 */
async function setupDaemon(opts: BackgroundOptions): Promise<void> {
  // Write PID file
  await fs.promises.mkdir(path.dirname(opts.pidFile), { recursive: true })
  await fs.promises.writeFile(opts.pidFile, String(process.pid), 'utf8')

  // Write info file (used by tray to find dashboard URL)
  await fs.promises.writeFile(
    opts.infoFile,
    [
      `pid=${process.pid}`,
      `gateway=${opts.gatewayUrl}`,
      `dashboard=${opts.dashboardUrl}`,
      `startedAt=${Date.now()}`,
    ].join('\n'),
    'utf8',
  )

  // Try to launch tray icon
  const trayProc = await launchTray({ pidFile: opts.pidFile, iconPath: '' })

  if (!trayProc) {
    // Tray is optional — log to a file instead
    const logFile = path.join(os.homedir(), '.openrat', 'openrat.log')
    const msg = `[background] Tray icon nao disponivel (requer python3 + gir1.2-appindicator3). OpenRat continua rodando em background.\n`
    await fs.promises.appendFile(logFile, msg, 'utf8')
  }

  // Redirect stdio to /dev/null (daemon has no terminal)
  const devNull = os.platform() === 'win32' ? 'NUL' : '/dev/null'
  const nullFd = fs.openSync(devNull, 'w')
  fs.closeSync(nullFd)

  // Also write a stop script (in case it wasn't created before)
  const stopScript = path.join(os.homedir(), '.openrat', 'stop.sh')
  await fs.promises.writeFile(
    stopScript,
    `#!/usr/bin/env bash\nkill $(cat "${opts.pidFile}") 2>/dev/null && echo "OpenRat parado." || echo "OpenRat nao esta rodando."\n`,
    { encoding: 'utf8', mode: 0o755 },
  )

  // Set up signal handlers for graceful shutdown
  const shutdown = async () => {
    try { await fs.promises.unlink(opts.pidFile) } catch {}
    try { await fs.promises.unlink(opts.infoFile) } catch {}
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

export function getDefaultPidFile(): string {
  return path.join(os.homedir(), '.openrat', 'openrat.pid')
}

export function getDefaultInfoFile(): string {
  return path.join(os.homedir(), '.openrat', 'openrat.pid.info')
}
