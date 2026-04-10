# CinemaSync — Performance Test Suite

k6 load tests for the CinemaSync MERN booking backend.

## Prerequisites

### Install k6

**Windows (Chocolatey)**
```powershell
choco install k6
```

**Windows (winget)**
```powershell
winget install k6 --source winget
```

**macOS (Homebrew)**
```bash
brew install k6
```

**Linux (apt)**
```bash
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
  https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

**Verify**
```bash
k6 version
# k6 v0.55.x (...)
```

## Folder Structure

```
performance-tests/
├── scripts/
│   ├── 01_health_movies.js   ← unauthenticated read paths
│   ├── 02_auth.js            ← login / register / refresh
│   ├── 03_booking.js         ← seat lock + booking + payment initiate
│   └── 04_mixed.js           ← realistic concurrent user mix
├── configs/
│   ├── env.js                ← base URL + seed credentials
│   ├── helpers.js            ← login helper, headers, seat picker
│   └── thresholds.js         ← shared pass/fail thresholds
├── results/                  ← JSON output files (gitignored)
├── run-all.sh                ← runs all scripts in sequence
└── README.md
```

## Quick Start

> Make sure the CinemaSync API is running first:
> ```bash
> cd api && npm run dev
> ```

### Run a single test (smoke)

```bash
# From project root
k6 run performance-tests/scripts/01_health_movies.js \
  -e K6_BASE_URL=http://localhost:5000

# Or from inside performance-tests/
cd performance-tests
k6 run scripts/01_health_movies.js -e K6_BASE_URL=http://localhost:5000
```

### Run with a specific scenario

```bash
k6 run -e SCENARIO=load scripts/01_health_movies.js
k6 run -e SCENARIO=stress scripts/02_auth.js
k6 run -e SCENARIO=spike  scripts/02_auth.js
```

### Export results to JSON

```bash
k6 run scripts/03_booking.js \
  --out json=results/booking_load.json \
  --summary-export results/booking_load_summary.json
```

### Run all tests

```bash
chmod +x run-all.sh
./run-all.sh

# Against production
K6_BASE_URL=https://cinema-sync-six.vercel.app ./run-all.sh
```

### Run against production Vercel URL

```bash
k6 run -e K6_BASE_URL=https://cinema-sync-six.vercel.app \
  -e SCENARIO=smoke \
  scripts/01_health_movies.js
```

## Test Scenarios

| Scenario | VUs        | Duration | Purpose                                      |
|----------|-----------|----------|----------------------------------------------|
| smoke    | 3–5       | 30s      | Sanity check — nothing is broken             |
| load     | 30–60     | 2m       | Normal expected traffic                      |
| stress   | 100–500   | 2–3m     | Find breaking point                          |
| spike    | 5→200→5   | ~1.5m    | Sudden traffic burst (popular show on sale)  |
| mixed    | 100 total | 3m       | Realistic concurrent user behaviour          |

## Threshold Reference

| Metric                | Good          | Average       | Bad             |
|-----------------------|---------------|---------------|-----------------|
| p(95) http duration   | < 1s          | 1–2s          | > 2s            |
| p(99) http duration   | < 2s          | 2–5s          | > 5s            |
| Error rate            | < 0.1%        | 0.1–1%        | > 1%            |
| Seat conflict (409)   | < 5%          | 5–20%         | > 30% (by design under spike) |
| Throughput (RPS)      | > 100         | 50–100        | < 50            |

## Reading Results

After `k6 run` you will see a summary like:

```
✓ movie list: status 200 ........ 100.00% ✓ 1420 ✗ 0
✓ movie list: under 1s .......... 98.3%  ✓ 1395 ✗ 25

http_req_duration ..... avg=231ms min=45ms  med=198ms  max=1.2s  p(90)=480ms  p(95)=610ms
http_req_failed ....... 0.07%
http_reqs ............. 1420     23.6/s
vus ................... 50 max
```

| Field              | What it means                                                   |
|--------------------|-----------------------------------------------------------------|
| `http_req_duration`| End-to-end latency (network + server). Watch p(95) and p(99).  |
| `p(95)=610ms`      | 95% of requests completed in under 610ms.                      |
| `http_req_failed`  | HTTP errors (4xx/5xx or network failures).                      |
| `http_reqs`        | Total requests sent; `23.6/s` = throughput.                    |
| `vus`              | Peak concurrent virtual users.                                  |
| `checks`           | Your custom `check()` assertions pass rate.                     |

## Bottleneck Signals

| Symptom                                | Likely Cause                        |
|----------------------------------------|-------------------------------------|
| p(99) > 5s for `/api/movies`           | Missing MongoDB index on `status`   |
| High 409 rate on `/api/seats/lock`     | Expected under spike — not a bug   |
| 5xx errors after 100 VUs              | Connection pool exhausted            |
| p(95) climbs linearly with VUs        | No caching on read-heavy routes     |
| Auth latency > 2s                     | bcrypt rounds too high for load     |

## Results Log

Run this to find which script produced the worst latency:

```bash
# macOS/Linux
for f in results/*_summary.json; do
  echo "=== $f ===" && cat "$f" | python3 -c "
import sys,json
d=json.load(sys.stdin)
dur=d.get('metrics',{}).get('http_req_duration',{})
print('p95:', dur.get('values',{}).get('p(95)',0), 'ms')
print('rps:', d.get('metrics',{}).get('http_reqs',{}).get('values',{}).get('rate',0))
"
done
```
