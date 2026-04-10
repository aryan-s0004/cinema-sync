$base = "http://localhost:5000/api"

Write-Host "[Smoke] Checking health..."
$health = Invoke-RestMethod -Uri "$base/health" -Method Get
Write-Host "Health:" $health.success $health.message

Write-Host "[Smoke] Checking movies list..."
$movies = Invoke-RestMethod -Uri "$base/movies?page=1&limit=3" -Method Get
Write-Host "Movies count:" ($movies.data | Measure-Object | Select-Object -ExpandProperty Count)

Write-Host "[Smoke] Checking trending..."
$trending = Invoke-RestMethod -Uri "$base/movies/trending?page=1&limit=3" -Method Get
Write-Host "Trending count:" ($trending.data | Measure-Object | Select-Object -ExpandProperty Count)

Write-Host "Smoke checks completed."
