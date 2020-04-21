import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";

const isWindows = process.platform === "win32";
const is64bit = process.arch === "x64";

export function subsystemForLinuxPresent(): boolean {
  if (!isWindows) {
    return false;
  }

  const bashPath32bitApp = path.join(
    process.env["SystemRoot"] || "",
    "Sysnative",
    "bash.exe"
  );
  const bashPath64bitApp = path.join(
    process.env["SystemRoot"] || "",
    "System32",
    "bash.exe"
  );
  const bashPathHost = is64bit ? bashPath64bitApp : bashPath32bitApp;
  return fs.existsSync(bashPathHost);
}

function windowsPathToWSLPath(
  windowsPath: string | undefined
): string | undefined {
  if (!isWindows || !windowsPath) {
    return undefined;
  } else if (path.isAbsolute(windowsPath)) {
    return `/mnt/${windowsPath.substr(0, 1).toLowerCase()}/${windowsPath
      .substr(3)
      .replace(/\\/g, "/")}`;
  } else {
    return windowsPath.replace(/\\/g, "/");
  }
}

export interface LaunchArgs {
  cwd: string;
  executable: string;
  args: string[];
  combined: string[];
  localRoot?: string;
  remoteRoot?: string;
}

export function createLaunchArg(
  useSubsytemLinux: boolean | undefined,
  useExternalConsole: boolean,
  cwd: string | undefined,
  executable: string,
  args: readonly string[],
  program?: string
): LaunchArgs {
  if (useSubsytemLinux && subsystemForLinuxPresent()) {
    const bashPath32bitApp = path.join(
      process.env["SystemRoot"] || "",
      "Sysnative",
      "bash.exe"
    );
    const bashPath64bitApp = path.join(
      process.env["SystemRoot"] || "",
      "System32",
      "bash.exe"
    );
    const bashPathHost = is64bit ? bashPath64bitApp : bashPath32bitApp;
    const subsystemLinuxPath = useExternalConsole
      ? bashPath64bitApp
      : bashPathHost;

    const bashCommand = [executable]
      .concat(args || [])
      .map((element) => {
        if (element === program) {
          // workaround for issue #35249
          element = element.replace(/\\/g, "/");
        }
        return element.indexOf(" ") > 0 ? `'${element}'` : element;
      })
      .join(" ");
    return {
      cwd,
      executable: subsystemLinuxPath,
      args: ["-ic", bashCommand],
      combined: [subsystemLinuxPath].concat(["-ic", bashCommand]),
      localRoot: cwd,
      remoteRoot: windowsPathToWSLPath(cwd),
    } as LaunchArgs;
  } else {
    return {
      cwd: cwd,
      executable: executable,
      args: args || [],
      combined: [executable].concat(args || []),
    } as LaunchArgs;
  }
}

export function spawn(
  useWSL: boolean,
  executable: string,
  args: readonly string[],
  options: child_process.SpawnOptions
) {
  const launchArgs = createLaunchArg(
    useWSL,
    false,
    undefined,
    executable,
    args
  );
  return child_process.spawn(launchArgs.executable, launchArgs.args, options);
}

export function spawnSync(
  useWSL: boolean,
  executable: string,
  args: readonly string[],
  options?: child_process.SpawnSyncOptions
) {
  const launchArgs = createLaunchArg(
    useWSL,
    false,
    undefined,
    executable,
    args
  );
  return child_process.spawnSync(
    launchArgs.executable,
    launchArgs.args,
    options
  );
}
