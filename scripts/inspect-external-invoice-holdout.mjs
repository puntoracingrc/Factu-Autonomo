#!/usr/bin/env node

import { inspectExternalHoldout } from "./invoice-real-qa-external.mjs";

const datasetPath = process.argv[2];
await inspectExternalHoldout(datasetPath);
