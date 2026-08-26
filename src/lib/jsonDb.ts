import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/** Serializes writes per file so concurrent requests can't interleave and corrupt the JSON. */
const writeLocks = new Map<string, Promise<unknown>>();

function filePath(name: string): string {
    return path.join(DATA_DIR, name);
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
    try {
        const raw = await readFile(filePath(name), "utf-8");
        return JSON.parse(raw) as T;
    } catch (err) {
        if (err instanceof Error && "code" in err && err.code === "ENOENT") return fallback;
        throw err;
    }
}

export async function writeJson<T>(name: string, data: T): Promise<void> {
    const prior = writeLocks.get(name) ?? Promise.resolve();
    const next = prior
        .catch(() => undefined)
        .then(async () => {
            await mkdir(DATA_DIR, { recursive: true });
            await writeFile(filePath(name), JSON.stringify(data, null, 2), "utf-8");
        });
    writeLocks.set(name, next);
    return next;
}
