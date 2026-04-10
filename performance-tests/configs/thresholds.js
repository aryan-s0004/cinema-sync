// Shared performance thresholds for all CinemaSync k6 test scripts.
// Import this wherever you need consistent pass/fail criteria.

export const thresholds = {
  // 95th percentile response time must be under 2 seconds for all requests
  http_req_duration: ["p(95)<2000", "p(99)<5000"],
  // Overall error rate must stay under 1%
  http_req_failed: ["rate<0.01"],
  // At least 10 requests per second throughput expected
  http_reqs: ["rate>10"],
  // All custom checks (status codes, payloads) must pass at 99%
  checks: ["rate>0.99"],
};

// Stricter thresholds for critical payment + booking paths
export const criticalThresholds = {
  http_req_duration: ["p(95)<3000", "p(99)<8000"],
  http_req_failed: ["rate<0.005"],
  checks: ["rate>0.995"],
};

// Relaxed thresholds for stress tests (we expect some degradation)
export const stressThresholds = {
  http_req_duration: ["p(95)<5000"],
  http_req_failed: ["rate<0.05"],
  checks: ["rate>0.95"],
};
