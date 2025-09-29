import { spawnSync } from "node:child_process";

function run(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
}

function hasMissingCheckDependency(output = "") {
  return /@astrojs\/check/.test(output);
}

function exitWith(code, fallback = 1) {
  process.exit(typeof code === "number" && Number.isInteger(code) ? code : fallback);
}

const checkResult = run("astro", ["check"]);
const combinedOutput = `${checkResult.stdout ?? ""}\n${checkResult.stderr ?? ""}`;
const missingDependency = hasMissingCheckDependency(combinedOutput);

if (checkResult.status !== 0 || missingDependency) {
  if (missingDependency) {
    console.warn("[run-check] astro check unavailable; falling back to TypeScript no-emit check.");
    console.warn("[run-check] Install '@astrojs/check' for full diagnostics.");
    const tsResult = run("tsc", ["--noEmit"]);
    if (tsResult.status !== 0) {
      exitWith(tsResult.status);
    }
  } else {
    exitWith(checkResult.status);
  }
}

const buildResult = run("astro", ["build"]);
exitWith(buildResult.status, 0);
