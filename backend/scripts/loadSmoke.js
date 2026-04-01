const { performance } = require("perf_hooks");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split("=");
    parsed[rawKey] = rawValue.join("=") || "true";
  }

  return parsed;
};

const getPercentile = (values, percentile) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
  return sorted[index];
};

const main = async () => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this Node runtime");
  }

  const args = parseArgs();
  const requests = Math.max(Number(args.requests || process.env.LOAD_TEST_REQUESTS || 300), 1);
  const concurrency = Math.max(
    1,
    Math.min(Number(args.concurrency || process.env.LOAD_TEST_CONCURRENCY || 30), requests)
  );
  const method = String(args.method || process.env.LOAD_TEST_METHOD || "GET").toUpperCase();
  const baseUrl = String(args["base-url"] || process.env.LOAD_TEST_BASE_URL || "http://localhost:5000").trim();
  const requestPath = String(args.path || process.env.LOAD_TEST_PATH || "/api/health").trim();
  const token = String(args.token || process.env.LOAD_TEST_TOKEN || "").trim();
  const targetUrl = new URL(requestPath, baseUrl).toString();

  const headers = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let nextIndex = 0;
  let successCount = 0;
  let failureCount = 0;
  const latencies = [];
  const failures = [];

  const startedAt = performance.now();

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= requests) {
        return;
      }

      const requestStartedAt = performance.now();

      try {
        const response = await fetch(targetUrl, {
          method,
          headers,
        });
        const responseText = await response.text();
        const duration = performance.now() - requestStartedAt;

        latencies.push(duration);

        if (response.ok) {
          successCount += 1;
          continue;
        }

        failureCount += 1;
        if (failures.length < 10) {
          failures.push({
            status: response.status,
            body: responseText.slice(0, 180),
          });
        }
      } catch (error) {
        const duration = performance.now() - requestStartedAt;
        latencies.push(duration);
        failureCount += 1;

        if (failures.length < 10) {
          failures.push({
            status: "network_error",
            body: error.message,
          });
        }
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalDurationMs = performance.now() - startedAt;
  const requestsPerSecond = requests / Math.max(totalDurationMs / 1000, 0.001);

  console.log("CinemaSync Load Smoke");
  console.log(`Target: ${targetUrl}`);
  console.log(`Requests: ${requests}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Duration: ${totalDurationMs.toFixed(2)} ms`);
  console.log(`Throughput: ${requestsPerSecond.toFixed(2)} req/s`);
  console.log(`Latency p50: ${getPercentile(latencies, 50).toFixed(2)} ms`);
  console.log(`Latency p95: ${getPercentile(latencies, 95).toFixed(2)} ms`);
  console.log(`Latency max: ${Math.max(...latencies, 0).toFixed(2)} ms`);

  if (failures.length) {
    console.log("Sample failures:");
    for (const failure of failures) {
      console.log(`- ${failure.status}: ${failure.body}`);
    }
  }

  if (failureCount > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("Load smoke failed:", error.message);
  process.exit(1);
});
