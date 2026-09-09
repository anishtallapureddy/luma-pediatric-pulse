import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  MANUAL_ENTERIC_PATH,
  parseManualEntericCsv,
} from "./sources/nrevssEntericManual";

function usage(): never {
  throw new Error(
    "Usage: npm run import:nrevss-enteric -- <path-to-controlled-csv> [--check]",
  );
}

const args = process.argv.slice(2);
const inputArg = args.find((arg) => !arg.startsWith("--"));
if (!inputArg) usage();
const checkOnly = args.includes("--check");
const inputPath = resolve(inputArg);

let csv: string;
try {
  csv = readFileSync(inputPath, "utf8");
} catch (error) {
  throw new Error(`Could not read ${inputPath}`, { cause: error });
}

const snapshot = parseManualEntericCsv(csv);
const latestWeek = snapshot.series.Norovirus[5].weekEnding;

if (checkOnly) {
  console.log(
    `Validated 12 CDC NREVSS rows through ${latestWeek}; no files written.`,
  );
} else {
  mkdirSync(dirname(MANUAL_ENTERIC_PATH), { recursive: true });
  const temporaryPath = `${MANUAL_ENTERIC_PATH}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );
  renameSync(temporaryPath, MANUAL_ENTERIC_PATH);
  console.log(
    `Imported 12 CDC NREVSS rows through ${latestWeek} into ${MANUAL_ENTERIC_PATH}`,
  );
}
