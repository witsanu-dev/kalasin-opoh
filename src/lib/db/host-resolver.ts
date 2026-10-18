import fs from 'fs';

/**
 * Checks whether the application is running inside a Docker container.
 */
export function isRunningInDocker(): boolean {
  if (process.env.IS_DOCKER === 'true' || process.env.DOCKER_CONTAINER === 'true') {
    return true;
  }
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

/**
 * Resolves database hostnames dynamically across Bare-Metal (Node.js) and Docker environments.
 * If running inside a Docker container and the target host is loopback (127.0.0.1 or localhost),
 * this automatically resolves to 'host.docker.internal' so it can connect to host services
 * such as AppServ, XAMPP, MariaDB, or MySQL running on port 3306 or any other port on the host machine.
 *
 * @param host - Hostname or IP address provided in config or UI
 * @returns Resolved host address compatible with the current runtime environment
 */
export function resolveDbHost(host: string | undefined): string {
  if (!host) return '127.0.0.1';
  const trimmed = host.trim();
  const lower = trimmed.toLowerCase();

  // Inside Docker container, 127.0.0.1 / localhost must map to host.docker.internal to reach the host OS
  if (isRunningInDocker() && (lower === '127.0.0.1' || lower === 'localhost')) {
    return 'host.docker.internal';
  }

  return trimmed;
}
