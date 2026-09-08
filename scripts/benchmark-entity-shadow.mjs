import { gzipSync, strToU8 } from "fflate";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3110";
const EXPECT_ENTITY_SHADOW_DISABLED =
  process.env.EXPECT_ENTITY_SHADOW_DISABLED === "true";
const EXPECT_SECOND_WORKSPACE_SHADOW_DISABLED =
  process.env.EXPECT_SECOND_WORKSPACE_SHADOW_DISABLED === "true";
const PROFILE_NAVIGATION_ONLY =
  process.env.PROFILE_NAVIGATION_ONLY === "true";
const requestedCpuThrottleRate = Number(process.env.CPU_THROTTLE_RATE ?? "1");
const CPU_THROTTLE_RATE =
  Number.isFinite(requestedCpuThrottleRate) && requestedCpuThrottleRate >= 1
    ? requestedCpuThrottleRate
    : 1;
const VERCEL_TRUSTED_OIDC_TOKEN =
  process.env.VERCEL_TRUSTED_OIDC_TOKEN?.trim() || null;
const VERCEL_AUTOMATION_BYPASS_SECRET =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || null;
const CHROME_EXECUTABLE_PATH =
  process.env.CHROME_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WORKSPACE_OWNER = "synthetic-entity-shadow-benchmark";
const WORKSPACE_STORAGE_KEY =
  `factu:workspace:v2:guest:${encodeURIComponent(WORKSPACE_OWNER)}`;
const SECOND_WORKSPACE_OWNER = "synthetic-entity-shadow-account-b";
const SECOND_WORKSPACE_STORAGE_KEY =
  `factu:workspace:v2:guest:${encodeURIComponent(SECOND_WORKSPACE_OWNER)}`;
const GUEST_ID_KEY = "factu:workspace:v2:guest-device-id";
const COMPRESSED_STORAGE_PREFIX = "factu-gzip-v1:";
const NOW = "2026-09-07T12:00:00.000Z";

function syntheticWorkspace() {
  const customers = Array.from({ length: 1_000 }, (_, index) => ({
    id: `customer-${index}`,
    customerType: "person",
    name: `Cliente Sintetico ${index}`,
    firstName: `Cliente ${index}`,
    lastName: "Sintetico",
    nif: `SYN-C-${String(index).padStart(6, "0")}`,
    email: `cliente-${index}@example.invalid`,
    phone: `600${String(index).padStart(6, "0")}`,
    createdAt: NOW,
    updatedAt: NOW,
  }));
  const suppliers = Array.from({ length: 1_000 }, (_, index) => ({
    id: `supplier-${index}`,
    name: `Proveedor Sintetico ${index}`,
    nif: `SYN-P-${String(index).padStart(6, "0")}`,
    createdAt: NOW,
  }));
  const products = Array.from({ length: 1_000 }, (_, index) => ({
    id: `product-${index}`,
    key: `producto-${index}`,
    name: `Producto Sintetico ${index}`,
    family: "Material sintetico",
    supplierId: suppliers[index].id,
    supplierName: suppliers[index].name,
    cost: 25 + (index % 50),
    pvp: 50 + (index % 80),
    source: "manual",
    createdAt: NOW,
    updatedAt: NOW,
  }));
  const expenses = Array.from({ length: 1_000 }, (_, index) => ({
    id: `expense-${index}`,
    date: "2026-09-01",
    supplierId: suppliers[index].id,
    supplierName: suppliers[index].name,
    description: `Gasto sintetico ${index}`,
    amount: 10 + (index % 100),
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Transferencia",
    createdAt: NOW,
  }));
  const documents = Array.from({ length: 6_000 }, (_, index) => {
    const customer = customers[index % customers.length];
    const type = index % 5 === 0 ? "presupuesto" : "factura";
    return {
      id: `document-${index}`,
      type,
      number:
        type === "presupuesto"
          ? `P-2026-${String(index + 1).padStart(4, "0")}`
          : `F-2026-${String(index + 1).padStart(4, "0")}`,
      date: "2026-09-01",
      customerId: customer.id,
      client: { name: customer.name, nif: customer.nif },
      items: [
        {
          id: `item-${index}`,
          description: `Servicio sintetico de rendimiento ${index}`,
          quantity: 1,
          unitPrice: 100 + (index % 50),
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: NOW,
      updatedAt: NOW,
    };
  });

  return {
    profile: {
      commercialName: "Empresa Sintetica Rendimiento",
      name: "Empresa Sintetica Rendimiento SL",
      nif: "B10000009",
      country: "Espana",
    },
    documents,
    expenses,
    recurringExpenses: [],
    userReminders: [],
    suppliers,
    products,
    customers,
    counters: {
      factura: 6_000,
      factura_rectificativa: 0,
      presupuesto: 6_000,
      recibo: 0,
    },
    meta: { lastModified: NOW },
  };
}

function encodeWorkspace(data) {
  const json = JSON.stringify(data);
  const compressed = gzipSync(strToU8(json), { level: 6 });
  return {
    jsonBytes: Buffer.byteLength(json),
    raw: `${COMPRESSED_STORAGE_PREFIX}${Buffer.from(compressed).toString("base64")}`,
  };
}

async function routeTiming(page, pathname, heading) {
  const startedAt = performance.now();
  await page.goto(`${BASE_URL}${pathname}`, { waitUntil: "domcontentloaded" });
  try {
    await page
      .getByRole("heading", { name: heading, exact: true })
      .waitFor({ timeout: 30_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      visibilityState: document.visibilityState,
      body: document.body.innerText.slice(0, 1_500),
    }));
    throw new Error(
      `route_timeout:${pathname}:${JSON.stringify(diagnostics)}`,
      { cause: error },
    );
  }
  return Math.round(performance.now() - startedAt);
}

async function appNavigationTiming(
  page,
  pathname,
  heading,
  { profile = false } = {},
) {
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  if (profile) {
    await client.send("Profiler.enable");
    await client.send("Profiler.start");
  }
  const before = await client.send("Performance.getMetrics");
  const startedAt = performance.now();
  await page.locator(`a[href="${pathname}"]`).first().click();
  await page
    .getByRole("heading", { name: heading, exact: true })
    .waitFor({ timeout: 30_000 });
  const elapsedMs = Math.round(performance.now() - startedAt);
  const after = await client.send("Performance.getMetrics");
  const cpuProfile = profile ? await client.send("Profiler.stop") : null;
  await client.detach();
  const metric = (metrics, name) =>
    metrics.metrics.find((entry) => entry.name === name)?.value ?? 0;
  const result = {
    elapsedMs,
    scriptMs: Math.round(
      (metric(after, "ScriptDuration") - metric(before, "ScriptDuration")) *
        1_000,
    ),
    taskMs: Math.round(
      (metric(after, "TaskDuration") - metric(before, "TaskDuration")) *
      1_000,
    ),
  };
  if (!cpuProfile) return result;

  const nodes = new Map(
    cpuProfile.profile.nodes.map((node) => [node.id, node.callFrame]),
  );
  const selfTimeByNode = new Map();
  cpuProfile.profile.samples?.forEach((nodeId, index) => {
    selfTimeByNode.set(
      nodeId,
      (selfTimeByNode.get(nodeId) ?? 0) +
        (cpuProfile.profile.timeDeltas?.[index] ?? 0),
    );
  });
  return {
    ...result,
    topCpuFunctions: [...selfTimeByNode]
      .map(([nodeId, microseconds]) => ({
        functionName: nodes.get(nodeId)?.functionName || "(anonymous)",
        url: nodes.get(nodeId)?.url || "",
        line: (nodes.get(nodeId)?.lineNumber ?? -1) + 1,
        column: (nodes.get(nodeId)?.columnNumber ?? -1) + 1,
        selfMs: Math.round(microseconds / 1_000),
      }))
      .sort((left, right) => right.selfMs - left.selfMs)
      .slice(0, 20),
  };
}

async function quoteLinkManagerTiming(page) {
  const startedAt = performance.now();
  await page
    .getByRole("button", {
      name: "Ver o gestionar documentos y gastos vinculados",
      exact: true,
    })
    .first()
    .click();
  await page.getByRole("heading", { name: /^Vínculos de / }).waitFor();
  const visibleCandidates = await page
    .getByTestId("document-link-modal")
    .locator("button[aria-pressed]")
    .count();
  if (visibleCandidates === 0) {
    throw new Error("quote_link_manager_candidates_missing");
  }
  const elapsedMs = Math.round(performance.now() - startedAt);
  await page.getByRole("button", { name: "Cerrar vínculos" }).click();
  return { elapsedMs, visibleCandidates };
}

async function readShadowSummary(page, storageKey = WORKSPACE_STORAGE_KEY) {
  return page.evaluate(async (storageKey) => {
    const databases = await indexedDB.databases();
    const databaseInfo = databases.find(
      (entry) => entry.name === "factura-autonomo-entity-shadow",
    );
    if (!databaseInfo) return null;

    return new Promise((resolve) => {
      const request = indexedDB.open(
        "factura-autonomo-entity-shadow",
        databaseInfo.version,
      );
      request.onerror = () => resolve({ error: "open_failed" });
      request.onsuccess = () => {
        const database = request.result;
        if (
          !database.objectStoreNames.contains("manifests") ||
          !database.objectStoreNames.contains("entities") ||
          !database.objectStoreNames.contains("health")
        ) {
          database.close();
          resolve({ error: "schema_incomplete" });
          return;
        }
        const transaction = database.transaction(
          ["manifests", "entities", "health"],
          "readonly",
        );
        const manifestRequest = transaction
          .objectStore("manifests")
          .get(storageKey);
        const entityRequest = transaction
          .objectStore("entities")
          .index("storageKey")
          .getAll(storageKey);
        const healthRequest = transaction.objectStore("health").get(storageKey);
        transaction.oncomplete = () => {
          database.close();
          resolve({
            manifest: manifestRequest.result ?? null,
            entityCount: entityRequest.result?.length ?? 0,
            health: healthRequest.result ?? null,
          });
        };
        transaction.onerror = () => {
          database.close();
          resolve({ error: "read_failed" });
        };
      };
    });
  }, storageKey);
}

async function readShadowFingerprints(page, storageKey = WORKSPACE_STORAGE_KEY) {
  return page.evaluate(async (workspaceStorageKey) => {
    const openRequest = indexedDB.open("factura-autonomo-entity-shadow");
    const database = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const transaction = database.transaction("entities", "readonly");
    const request = transaction
      .objectStore("entities")
      .index("storageKey")
      .getAll(workspaceStorageKey);
    const records = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return records.map((record) => ({
      id: record.id,
      entityType: record.entityType,
      payloadFingerprint: record.payloadFingerprint,
    }));
  }, storageKey);
}

async function waitForNormalizedCache(page, storageKey, timeoutMs = 15_000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const cacheCreated = await page.evaluate(async (workspaceStorageKey) => {
      const databases = await indexedDB.databases();
      const databaseInfo = databases.find(
        (entry) => entry.name === "factura-autonomo-normalized-cache",
      );
      if (!databaseInfo) return false;

      return new Promise((resolve) => {
        const request = indexedDB.open(
          "factura-autonomo-normalized-cache",
          databaseInfo.version,
        );
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("snapshots", "readonly");
          const recordRequest = transaction
            .objectStore("snapshots")
            .get(`3:${workspaceStorageKey}`);
          transaction.oncomplete = () => {
            database.close();
            resolve(recordRequest.result?.storageKey === workspaceStorageKey);
          };
          transaction.onerror = () => {
            database.close();
            resolve(false);
          };
        };
      });
    }, storageKey);
    if (cacheCreated) return Math.round(performance.now() - startedAt);
    await page.waitForTimeout(250);
  }
  throw new Error(`normalized_cache_timeout:${storageKey}`);
}

async function waitForShadow(
  page,
  {
    entityCount,
    upserted,
    storageKey = WORKSPACE_STORAGE_KEY,
    checkedAfter,
  },
  timeoutMs = 60_000,
) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const summary = await readShadowSummary(page, storageKey);
    if (
      summary?.manifest?.totalEntities === entityCount &&
      summary.entityCount === entityCount &&
      summary.health?.matches === true &&
      summary.health.sourceRawFingerprint ===
        summary.manifest.sourceRawFingerprint &&
      (upserted === undefined ||
        summary.manifest.lastMutation?.upserted === upserted) &&
      (checkedAfter === undefined ||
        Date.parse(summary.health.checkedAt) > Date.parse(checkedAfter))
    ) {
      return {
        ...summary,
        readyMs: Math.round(performance.now() - startedAt),
      };
    }
    await page.waitForTimeout(250);
  }
  throw new Error(
    `entity_shadow_timeout:${JSON.stringify(await readShadowSummary(page, storageKey))}`,
  );
}

async function measureIndexedDbReadStrategies(page) {
  return page.evaluate(async (storageKey) => {
    const openDatabase = (name) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const requestResult = (request) =>
      new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const median = (values) => {
      const sorted = [...values].sort((left, right) => left - right);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const normalizedDatabase = await openDatabase(
      "factura-autonomo-normalized-cache",
    );
    const entityDatabase = await openDatabase(
      "factura-autonomo-entity-shadow",
    );
    const normalizedTimes = [];
    const entityTimes = [];
    let normalizedEntityCount = 0;
    let separatedEntityCount = 0;

    try {
      for (let iteration = 0; iteration < 9; iteration += 1) {
        let startedAt = performance.now();
        const normalizedTransaction = normalizedDatabase.transaction(
          "snapshots",
          "readonly",
        );
        const normalized = await requestResult(
          normalizedTransaction
            .objectStore("snapshots")
            .get(`3:${storageKey}`),
        );
        normalizedEntityCount =
          normalized.data.customers.length +
          normalized.data.documents.length +
          normalized.data.expenses.length +
          normalized.data.suppliers.length +
          normalized.data.products.length;
        normalizedTimes.push(performance.now() - startedAt);

        startedAt = performance.now();
        const entityTransaction = entityDatabase.transaction(
          ["manifests", "entities", "health"],
          "readonly",
        );
        const [manifest, entities, health] = await Promise.all([
          requestResult(entityTransaction.objectStore("manifests").get(storageKey)),
          requestResult(
            entityTransaction
              .objectStore("entities")
              .index("storageKey")
              .getAll(storageKey),
          ),
          requestResult(entityTransaction.objectStore("health").get(storageKey)),
        ]);
        separatedEntityCount = entities.reduce(
          (count, record) => count + (record.payload?.id ? 1 : 0),
          0,
        );
        if (!manifest || !health?.matches) {
          throw new Error("entity_cache_metadata_invalid");
        }
        entityTimes.push(performance.now() - startedAt);
      }
    } finally {
      normalizedDatabase.close();
      entityDatabase.close();
    }

    return {
      iterations: normalizedTimes.length,
      normalizedSnapshotMedianMs: Number(median(normalizedTimes).toFixed(1)),
      separatedEntitiesMedianMs: Number(median(entityTimes).toFixed(1)),
      normalizedEntityCount,
      separatedEntityCount,
    };
  }, WORKSPACE_STORAGE_KEY);
}

async function proveAbortedTransactionIsAtomic(page) {
  return page.evaluate(async (storageKey) => {
    const openRequest = indexedDB.open("factura-autonomo-entity-shadow");
    const database = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const readState = () =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(
          ["manifests", "entities"],
          "readonly",
        );
        const manifestRequest = transaction.objectStore("manifests").get(storageKey);
        const recordsRequest = transaction
          .objectStore("entities")
          .index("storageKey")
          .getAll(storageKey);
        transaction.oncomplete = () =>
          resolve({
            manifest: manifestRequest.result,
            firstRecord: recordsRequest.result[0],
          });
        transaction.onerror = () => reject(transaction.error);
      });

    const before = await readState();
    await new Promise((resolve) => {
      const transaction = database.transaction(
        ["manifests", "entities"],
        "readwrite",
      );
      transaction.onabort = () => resolve();
      transaction.objectStore("entities").put({
        ...before.firstRecord,
        payload: { ...before.firstRecord.payload, name: "CORTE INCOMPLETO" },
      });
      transaction.objectStore("manifests").put({
        ...before.manifest,
        sourceRawFingerprint: "transaccion-incompleta",
      });
      transaction.abort();
    });
    const after = await readState();
    database.close();
    return {
      preserved:
        JSON.stringify(before.manifest) === JSON.stringify(after.manifest) &&
        JSON.stringify(before.firstRecord) === JSON.stringify(after.firstRecord),
      entityId: before.firstRecord.id,
    };
  }, WORKSPACE_STORAGE_KEY);
}

async function corruptShadowAndExpireHealth(page) {
  return page.evaluate(async (storageKey) => {
    const openRequest = indexedDB.open("factura-autonomo-entity-shadow");
    const database = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const transaction = database.transaction(
      ["entities", "health"],
      "readwrite",
    );
    const recordsRequest = transaction
      .objectStore("entities")
      .index("storageKey")
      .getAll(storageKey);
    const healthRequest = transaction.objectStore("health").get(storageKey);
    await new Promise((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve();
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    const target = recordsRequest.result.find(
      (record) => record.entityType === "customer",
    );
    if (!target) throw new Error("customer_shadow_missing");
    transaction.objectStore("entities").put({
      ...target,
      payload: { ...target.payload, name: "CACHE CORRUPTA" },
    });
    await new Promise((resolve, reject) => {
      healthRequest.onsuccess = () => resolve();
      healthRequest.onerror = () => reject(healthRequest.error);
    });
    transaction.objectStore("health").put({
      ...healthRequest.result,
      checkedAt: "1970-01-01T00:00:00.000Z",
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
    return {
      id: target.id,
      originalName: target.payload.name,
      corruptedAt: new Date().toISOString(),
    };
  }, WORKSPACE_STORAGE_KEY);
}

async function readShadowEntity(page, id) {
  return page.evaluate(async (entityId) => {
    const openRequest = indexedDB.open("factura-autonomo-entity-shadow");
    const database = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const transaction = database.transaction("entities", "readonly");
    const request = transaction.objectStore("entities").get(entityId);
    const record = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return record;
  }, id);
}

async function deleteNormalizedWorkspaceCache(page) {
  await page.evaluate(async (storageKey) => {
    const databases = await indexedDB.databases();
    const databaseInfo = databases.find(
      (entry) => entry.name === "factura-autonomo-normalized-cache",
    );
    if (!databaseInfo) return;
    const openRequest = indexedDB.open(
      "factura-autonomo-normalized-cache",
      databaseInfo.version,
    );
    const database = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const transaction = database.transaction("snapshots", "readwrite");
    const request = transaction.objectStore("snapshots").getAll();
    await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    for (const record of request.result) {
      if (record.storageKey === storageKey) {
        transaction.objectStore("snapshots").delete(record.id);
      }
    }
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, WORKSPACE_STORAGE_KEY);
}

async function main() {
  const data = syntheticWorkspace();
  const encoded = encodeWorkspace(data);
  const browser = await chromium.launch({
    executablePath: CHROME_EXECUTABLE_PATH,
    headless: true,
  });
  const extraHTTPHeaders = {
    ...(VERCEL_TRUSTED_OIDC_TOKEN
      ? {
          "x-vercel-trusted-oidc-idp-token": VERCEL_TRUSTED_OIDC_TOKEN,
        }
      : {}),
    ...(VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass": VERCEL_AUTOMATION_BYPASS_SECRET,
        }
      : {}),
  };
  const context = await browser.newContext({
    extraHTTPHeaders:
      Object.keys(extraHTTPHeaders).length > 0 ? extraHTTPHeaders : undefined,
  });
  const page = await context.newPage();
  let throttleClient = null;
  if (CPU_THROTTLE_RATE > 1) {
    throttleClient = await context.newCDPSession(page);
    await throttleClient.send("Emulation.setCPUThrottlingRate", {
      rate: CPU_THROTTLE_RATE,
    });
  }
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${BASE_URL}/inicio`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ guestIdKey, owner, storageKey, raw }) => {
        localStorage.clear();
        localStorage.setItem(guestIdKey, owner);
        localStorage.setItem(storageKey, raw);
      },
      {
        guestIdKey: GUEST_ID_KEY,
        owner: WORKSPACE_OWNER,
        storageKey: WORKSPACE_STORAGE_KEY,
        raw: encoded.raw,
      },
    );

    if (PROFILE_NAVIGATION_ONLY) {
      const routes = {};
      routes.customersColdMs = await routeTiming(page, "/clientes", "Clientes");
      await page.waitForTimeout(3_000);
      routes.invoicesSpaWarm = await appNavigationTiming(
        page,
        "/facturas",
        "Facturas",
        { profile: true },
      );
      routes.quotesSpaWarm = await appNavigationTiming(
        page,
        "/presupuestos",
        "Presupuestos",
        { profile: true },
      );
      routes.quoteLinkManagerOpen = await quoteLinkManagerTiming(page);
      routes.customersSpaWarm = await appNavigationTiming(
        page,
        "/clientes",
        "Clientes",
      );
      process.stdout.write(
        `${JSON.stringify(
          { mode: "profile", cpuThrottleRate: CPU_THROTTLE_RATE, routes },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const routes = {};
    routes.customersColdMs = await routeTiming(page, "/clientes", "Clientes");
    if (EXPECT_ENTITY_SHADOW_DISABLED) {
      await waitForNormalizedCache(page, WORKSPACE_STORAGE_KEY);
      const databaseNames = await page.evaluate(async () =>
        (await indexedDB.databases()).map((database) => database.name),
      );
      const shadowCreated = databaseNames.includes(
        "factura-autonomo-entity-shadow",
      );
      process.stdout.write(
        `${JSON.stringify(
          {
            mode: "disabled",
            shadowCreated,
            customersColdMs: routes.customersColdMs,
            pageErrors,
          },
          null,
          2,
        )}\n`,
      );
      if (shadowCreated) throw new Error("disabled_shadow_was_created");
      return;
    }
    const initialShadow = await waitForShadow(page, { entityCount: 10_000 });
    const indexedDbReads = await measureIndexedDbReadStrategies(page);
    await deleteNormalizedWorkspaceCache(page);
    routes.customersRawFallbackMs = await routeTiming(
      page,
      "/clientes",
      "Clientes",
    );
    await waitForNormalizedCache(page, WORKSPACE_STORAGE_KEY);
    const initialFingerprints = await readShadowFingerprints(page);
    routes.invoicesMs = await routeTiming(page, "/facturas", "Facturas");
    routes.expensesMs = await routeTiming(
      page,
      "/gastos",
      "Gastos y compras",
    );
    routes.suppliersMs = await routeTiming(
      page,
      "/proveedores",
      "Proveedores",
    );
    routes.productsMs = await routeTiming(page, "/productos", "Productos");
    routes.customersWarmMs = await routeTiming(page, "/clientes", "Clientes");
    routes.backgroundSettleMs = 3_000;
    await page.waitForTimeout(routes.backgroundSettleMs);
    routes.invoicesSpaWarm = await appNavigationTiming(
      page,
      "/facturas",
      "Facturas",
      { profile: true },
    );
    routes.quotesSpaWarm = await appNavigationTiming(
      page,
      "/presupuestos",
      "Presupuestos",
      { profile: true },
    );
    routes.quoteLinkManagerOpen = await quoteLinkManagerTiming(page);
    routes.customersSpaWarm = await appNavigationTiming(
      page,
      "/clientes",
      "Clientes",
    );

    await page
      .getByRole("button", { name: /^Editar Cliente \d+ Sintetico$/ })
      .first()
      .click();
    await page.getByRole("heading", { name: "Editar cliente" }).waitFor();
    await page.getByLabel("Nombre *").fill("Cliente Guardado Benchmark");
    await page.getByRole("textbox", { name: /^Apellidos/ }).fill("");
    const saveStartedIso = new Date().toISOString();
    const saveStartedAt = performance.now();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByText("Cliente Guardado Benchmark", { exact: true }).waitFor();
    const customerSaveMs = Math.round(performance.now() - saveStartedAt);
    const updatedShadow = await waitForShadow(page, {
      entityCount: 10_000,
      checkedAfter: saveStartedIso,
    });
    const updatedFingerprints = await readShadowFingerprints(page);
    const initialFingerprintsById = new Map(
      initialFingerprints.map((record) => [record.id, record.payloadFingerprint]),
    );
    const changedShadowEntities = updatedFingerprints.reduce(
      (counts, record) => {
        if (initialFingerprintsById.get(record.id) === record.payloadFingerprint) {
          return counts;
        }
        counts[record.entityType] = (counts[record.entityType] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const changedShadowEntityCount = Object.values(changedShadowEntities).reduce(
      (total, count) => total + count,
      0,
    );
    if (
      changedShadowEntities.customer !== 1 ||
      changedShadowEntityCount !== 1
    ) {
      throw new Error(
        `entity_shadow_customer_update_scope_failed:${JSON.stringify(changedShadowEntities)}`,
      );
    }

    const interruptedTransaction = await proveAbortedTransactionIsAtomic(page);
    const corrupted = await corruptShadowAndExpireHealth(page);
    await deleteNormalizedWorkspaceCache(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Clientes", exact: true }).waitFor();
    const repairedShadow = await waitForShadow(page, {
      entityCount: 10_000,
      upserted: 1,
      checkedAfter: corrupted.corruptedAt,
    });
    const repairedEntity = await readShadowEntity(page, corrupted.id);

    const secondData = syntheticWorkspace();
    secondData.customers = secondData.customers.slice(0, 2).map((customer, index) => ({
      ...customer,
      id: `account-b-customer-${index}`,
      name: `Cuenta B Cliente ${index}`,
      firstName: "Cuenta B",
      lastName: `Cliente ${index}`,
    }));
    secondData.documents = secondData.documents.slice(0, 2).map((document, index) => ({
      ...document,
      id: `account-b-document-${index}`,
      customerId: secondData.customers[index].id,
      client: { name: secondData.customers[index].name },
    }));
    secondData.expenses = secondData.expenses.slice(0, 1).map((expense) => ({
      ...expense,
      id: "account-b-expense-0",
    }));
    secondData.suppliers = secondData.suppliers.slice(0, 1).map((supplier) => ({
      ...supplier,
      id: "account-b-supplier-0",
    }));
    secondData.products = secondData.products.slice(0, 1).map((product) => ({
      ...product,
      id: "account-b-product-0",
    }));
    const secondEncoded = encodeWorkspace(secondData);
    await page.evaluate(
      ({ guestIdKey, owner, storageKey, raw }) => {
        localStorage.setItem(guestIdKey, owner);
        localStorage.setItem(storageKey, raw);
      },
      {
        guestIdKey: GUEST_ID_KEY,
        owner: SECOND_WORKSPACE_OWNER,
        storageKey: SECOND_WORKSPACE_STORAGE_KEY,
        raw: secondEncoded.raw,
      },
    );
    await page.goto(`${BASE_URL}/clientes`, { waitUntil: "domcontentloaded" });
    await page.getByText("Cuenta B Cliente 0", { exact: true }).waitFor();
    await waitForNormalizedCache(page, SECOND_WORKSPACE_STORAGE_KEY);
    const secondShadow = EXPECT_SECOND_WORKSPACE_SHADOW_DISABLED
      ? await readShadowSummary(page, SECOND_WORKSPACE_STORAGE_KEY)
      : await waitForShadow(page, {
          entityCount: 7,
          storageKey: SECOND_WORKSPACE_STORAGE_KEY,
        });
    const firstShadowWhileSecondIsActive = await readShadowSummary(
      page,
      WORKSPACE_STORAGE_KEY,
    );
    await page.evaluate(
      ({ guestIdKey, owner }) => localStorage.setItem(guestIdKey, owner),
      { guestIdKey: GUEST_ID_KEY, owner: WORKSPACE_OWNER },
    );
    await page.goto(`${BASE_URL}/clientes`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("combobox", { name: /^Buscar cliente/ })
      .fill("Cliente Guardado Benchmark");
    await page
      .getByRole("option", { name: /Cliente Guardado Benchmark/ })
      .click();
    await page.getByText("Cliente Guardado Benchmark", { exact: true }).waitFor();
    const firstShadowAfterReturn = await waitForShadow(page, {
      entityCount: 10_000,
    });

    const storedRawLength = await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey)?.length ?? 0,
      WORKSPACE_STORAGE_KEY,
    );
    const accountSwitchIsolated =
      (EXPECT_SECOND_WORKSPACE_SHADOW_DISABLED
        ? !secondShadow?.manifest && secondShadow?.entityCount === 0
        : secondShadow?.entityCount === 7) &&
      firstShadowWhileSecondIsActive.entityCount === 10_000 &&
      firstShadowAfterReturn.entityCount === 10_000;
    if (!accountSwitchIsolated) {
      throw new Error(
        `entity_shadow_account_isolation_failed:${JSON.stringify({
          firstShadowWhileSecondIsActive,
          firstShadowAfterReturn,
          secondShadow,
        })}`,
      );
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          fixture: {
            customers: data.customers.length,
            documents: data.documents.length,
            expenses: data.expenses.length,
            suppliers: data.suppliers.length,
            products: data.products.length,
            totalEntities: 10_000,
            jsonBytes: encoded.jsonBytes,
            initialStoredRawLength: encoded.raw.length,
            finalStoredRawLength: storedRawLength,
          },
          routes,
          indexedDbReads,
          customerSaveMs,
          shadow: {
            initial: initialShadow,
            afterCustomerSave: updatedShadow,
            changedAfterCustomerSave: changedShadowEntities,
          },
          resilience: {
            interruptedTransaction,
            corruptionRepair: {
              repaired:
                repairedShadow.health.matches === true &&
                repairedEntity?.payload?.name === corrupted.originalName,
              upserted: repairedShadow.manifest.lastMutation.upserted,
            },
            accountSwitch: {
              isolated: accountSwitchIsolated,
              firstWorkspaceEntities:
                firstShadowAfterReturn.entityCount,
              secondWorkspaceEntities: secondShadow?.entityCount ?? 0,
              secondWorkspaceShadowCreated: Boolean(secondShadow?.manifest),
            },
          },
          pageErrors,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await throttleClient?.detach();
    await context.close();
    await browser.close();
  }
}

await main();
