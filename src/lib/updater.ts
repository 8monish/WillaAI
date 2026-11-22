import { createSignal } from "solid-js";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdatePhase = "idle" | "checking" | "available" | "downloading" | "installing" | "ready" | "none" | "error";

const [phase, setPhase] = createSignal<UpdatePhase>("idle");
const [update, setUpdate] = createSignal<Update | null>(null);
const [progress, setProgress] = createSignal(0); // 0..1, or -1 when size is unknown
const [error, setError] = createSignal("");
export { phase, update, progress, error };

/** Ask GitHub Releases for a newer signed build. */
export async function checkForUpdate(): Promise<void> {
  if (phase() === "downloading" || phase() === "installing") return;
  setPhase("checking");
  setError("");
  try {
    const u = await check();
    setUpdate(u);
    setPhase(u ? "available" : "none");
  } catch (e) {
    const msg = String(e);
    // No published release with latest.json yet (or offline): not worth an alarming error.
    setError(/valid release JSON|404/i.test(msg) ? "no published release found" : msg);
    setPhase("error");
  }
}

/** Download with progress, install, then restart into the new version. */
export async function installUpdate(): Promise<void> {
  const u = update();
  if (!u) return;
  let total = 0;
  let done = 0;
  setProgress(0);
  setPhase("downloading");
  try {
    await u.downloadAndInstall((e) => {
      if (e.event === "Started") { total = e.data.contentLength ?? 0; if (!total) setProgress(-1); }
      else if (e.event === "Progress") { done += e.data.chunkLength; if (total) setProgress(done / total); }
      else if (e.event === "Finished") setPhase("installing");
    });
    setPhase("ready");
    await relaunch();
  } catch (e) {
    setError(String(e));
    setPhase("error");
  }
}
