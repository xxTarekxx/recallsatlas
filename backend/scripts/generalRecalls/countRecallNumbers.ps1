# Stats: all *.csv in downloads — row count, unique Recall Number, heading consistency
$dir = Join-Path $PSScriptRoot "downloads"
$files = Get-ChildItem -LiteralPath $dir -Filter "*.csv"
$seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$byNum = @{}
$total = 0
$empty = 0
foreach ($f in $files) {
  foreach ($r in (Import-Csv -LiteralPath $f.FullName)) {
    $total++
    $n = $r.'Recall Number'
    if ([string]::IsNullOrWhiteSpace($n)) {
      $empty++
      continue
    }
    $n = $n.Trim()
    [void]$seen.Add($n)
    $h = ($r.'Recall Heading').Trim()
    if (-not $byNum.ContainsKey($n)) { $byNum[$n] = [System.Collections.Generic.HashSet[string]]::new() }
    [void]$byNum[$n].Add($h)
  }
}
$nonEmpty = $total - $empty
$headingConflicts = ($byNum.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }).Count
Write-Host "CSV files:           $($files.Count)"
Write-Host "Data rows (total):   $total"
Write-Host "Empty recall # rows: $empty"
Write-Host "Unique Recall Number: $($seen.Count)"
if ($nonEmpty -ne $seen.Count) {
  Write-Host "Extra row appearances (same recall in multiple category CSVs): $($nonEmpty - $seen.Count)"
}
Write-Host "Recall #s with >1 distinct Recall Heading: $headingConflicts"
