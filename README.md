# Acunetix 360 Scan

This action requests a scan on [Acunetix 360](https://acunetix360.com/).

## Inputs

### `website-id`:

**Required** Unique id for your website on Acunetix 360.

### `scan-type`:

**Required** Requested scan type for scan.

### `profile-id`:

**Optional**  Unique profile id for your requested website scan profile on Acunetix 360.

### `user-id`:

**Required** User Id on Acunetix 360 API Credentials. Use GitHub Secrets.

### `api-token`:

**Required** API Token on Acunetix 360 API Credentials. Use GitHub Secrets.

## Outputs

### `scan-message`:

Scan message for requested scan.

## Example Scan Workflow

```yaml
name: Acunetix 360 Scan Sample Workflow

on:
  push:
    branches: [ main ]

jobs:
  acunetix_scan_job:
    runs-on: ubuntu-20.04
    steps:
      # Clones action repository
      - name: Checkout action repository
        id: acunetix-360-scan-action
        uses: actions/checkout@v2
        with:
          repository: Acunetix360/Acunetix-360-GitHub-Actions
          ref: v0.0.1
          path: .
      # Starts actions with given inputs
      - name: Start Acunetix 360 Scan
        id: acunetix-360-scan-step
        uses: ./
        with:
          website-id: '******' # FILL HERE
          scan-type: 'FullWithSelectedProfile'
          profile-id: '******' # FILL HERE
          user-id: ${{ secrets.ACUNETIX_USER_ID }}
          api-token: ${{ secrets.ACUNETIX_API_TOKEN }}
      # Displays output for action
      - name: Display Scan Request Message
        run: echo "${{ steps.acunetix-360-scan-step.outputs.scan-message }}"
```