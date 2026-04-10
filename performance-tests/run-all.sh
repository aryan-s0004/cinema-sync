#!/usr/bin/env bash
# run-all.sh — Execute all CinemaSync k6 load tests in sequence.
# Usage:
#   ./run-all.sh                        # local (http://localhost:5000)
#   K6_BASE_URL=https://cinema-sync-six.vercel.app ./run-all.sh
#
# Requires k6 to be installed (see README.md).

set -e

BASE_URL="${K6_BASE_URL:-http://localhost:5000}"
RESULTS_DIR="results"
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS_DIR"

echo ""
echo "============================================================"
echo "  CinemaSync k6 Load Test Suite"
echo "  Target: $BASE_URL"
echo "  Started: $(date)"
echo "============================================================"
echo ""

run_test() {
  local script="$1"
  local name="$2"
  local scenario="${3:-smoke}"
  local out="$RESULTS_DIR/${name}_${scenario}_${TS}.json"

  echo ""
  echo "--- Running: $name ($scenario) ---"
  k6 run \
    -e K6_BASE_URL="$BASE_URL" \
    -e SCENARIO="$scenario" \
    "scripts/$script" \
    --out "json=$out" \
    --summary-export "$RESULTS_DIR/${name}_${scenario}_${TS}_summary.json"
  echo "    Results: $out"
}

# Smoke tests (quick sanity check — ~2 min total)
echo "======== SMOKE TESTS ========"
run_test 01_health_movies.js health_movies smoke
run_test 02_auth.js          auth          smoke
run_test 03_booking.js       booking       smoke

# Load tests (normal traffic — ~8 min total)
echo ""
echo "======== LOAD TESTS ========"
run_test 01_health_movies.js health_movies load
run_test 02_auth.js          auth          load
run_test 03_booking.js       booking       load

# Mixed realistic test (runs all 3 groups concurrently)
echo ""
echo "======== MIXED REALISTIC ========"
k6 run \
  -e K6_BASE_URL="$BASE_URL" \
  scripts/04_mixed.js \
  --out "json=$RESULTS_DIR/mixed_${TS}.json" \
  --summary-export "$RESULTS_DIR/mixed_${TS}_summary.json"

echo ""
echo "============================================================"
echo "  All tests complete. Results in ./$RESULTS_DIR/"
echo "  Finished: $(date)"
echo "============================================================"
