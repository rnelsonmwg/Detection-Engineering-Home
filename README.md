# ALL SEEING EYE — Threat Detection Forge

*A prototype tool that converts natural-language threat descriptions into production-grade Splunk SPL detection & hunt packages.*

Focused on threats against **cloud controlplane** and **CI/CD pipelines**: secret stealing, malicious code implantation, threat-actor persistence, supply-chain attacks, identity compromise, and related tradecraft.

---

## v3 — expanded offline forge library

The offline forge now covers **12 template families** via a registry architecture — each family declares a `matches()` predicate and a `produce()` function that returns detections, hunts, and data sources. Multiple families can fire on a single threat (a threat that mentions GitHub + Terraform + AWS triggers all three families, producing 6+ detections).

| Family | Coverage |
|---|---|
| `aws-iam` | IAM user/key creation, access-key geo anomalies, privesc via PolicyAttach, rare CloudTrail APIs |
| `azure-entra` | Service principal credential add, dangerous role assignments (GA, PRA, AppAdmin), conditional access tampering, anomalous consent grants |
| `gcp` | Service account key creation, owner/editor binding additions, rare admin activity baselining |
| `kubernetes` | Pod exec, privileged/hostPath pods, cross-namespace secret reads, Falco shell-in-container, service-account token abuse |
| `github-cicd` | Actions secret add, self-hosted runner registration, pull_request_target workflow mods, workflow-diff exfil hunts |
| `gitlab-ci` | Masked variable mods, rogue runner registration, deploy-key/token creation, CI_JOB_TOKEN cross-project abuse |
| `jenkins-circleci` | Jenkins script console, off-hours plugin installs, CircleCI cross-project context reads, unusual shell invocations |
| `iac` | Sensitive TFC variable access, destructive off-hours runs, first-use API token geography, IAM/SG diffs in plans |
| `oauth-saml` | Illicit consent grants (M365), high-privilege API permissions, SAML signing-cert changes (Golden SAML), enterprise-app baselines |
| `okta-idp` | Impossible-travel sessions, admin MFA enrollment |
| `supply-chain` | Unexpected package registries, runner egress during installs, new first-party deps baselining |
| `secrets-scanners` | Verified TruffleHog/Gitleaks findings, default-branch leaks, long-lived unrotated secrets |
| `generic` | Fallback authentication-breadth baseline |

**10 preset threat scenarios** ship in the sidebar — one or more per family. Click any to auto-populate the brief.

**Adding a family** is a ~50-line patch: push a new object into `TEMPLATE_FAMILIES` with `id`, `label`, `matches(threat)`, and `produce(threat, ctx) → {detections, hunts, dataSources}`. No other code changes required.

---

## v2 — what changed from v1

- **LLM selection is authoritative.** The model you pick in the sidebar is the one that runs. No silent fallbacks to the offline engine.
- **Loud model banner.** Every generated package is stamped at the top with which model produced it, at what temperature, in how many milliseconds — impossible to miss in side-by-side comparisons.
- **Temperature slider.** 0.0 focused → 1.5 wild. Default is 0.7. Threaded through Anthropic, OpenAI, and Gemini calls.
- **Force Offline toggle** (air-gap mode, off by default). When on, bypasses all LLMs even if one is selected. This is an explicit opt-in, not the default path.
- **Fallback is loud.** If an LLM call fails (no key, network error, unparseable JSON), the tool falls back to the offline forge AND tells you — a red banner, a reason, and a log entry.
- **Compare Models.** Check two or more providers in the inspector, click **⊞ Compare Models**, and the same threat brief is fanned out to all of them in parallel. Outputs render in side-by-side scrollable columns. Export the whole comparison as JSON or Markdown.

---

## What you get per threat

For every threat you describe in natural language, All Seeing Eye produces:

- **Detection rules** — alerting SPL, CIM-aware, with `tstats` where it makes sense, each with a `why` rationale and a risk rating.
- **Hunt queries** — exploratory SPL using `stats` / `eventstats` / `streamstats` for baseline deviation hunting.
- **Triage workflow** — numbered steps for the SOC analyst who catches the alert.
- **Response playbook** — checklist-format IR actions from containment to lessons-learned.
- **MITRE ATT&CK mapping** — technique IDs with tactics.
- **Data source inventory** — which indexes/sourcetypes the package assumes.
- **SPL validation** — lightweight static checks for balanced quotes/parens, command recognition, index scoping, and CIM hygiene.

Export as **JSON** (tool-friendly) or **Markdown** (human-friendly, drops straight into a runbook repo).

---

## AI-agnostic by design

The tool works in three modes, selectable at runtime with no restart:

1. **Offline Forge** — rule-based template engine, no network calls, no LLM. Generates useful packages for AWS, GitHub, Okta, and supply-chain threats out of the box. Select it explicitly from the LLM Providers list, or toggle "Force Offline" in settings.
2. **Cloud LLM** — Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google). Keys entered in the inspector, stored only in your browser's `localStorage`, sent only to the provider you target.
3. **Custom / Local** — any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, OpenRouter, Groq, Together, Azure OpenAI, etc.). Add via the "+ Add Custom / Local Model" button.

---

## Compare Models

Researching detection quality across vendors is the point of the tool. In the inspector:

1. Check two or more providers under **Compare Targets** (green dot = ready, amber dot = API key needed).
2. Enter your threat brief as usual.
3. Click **⊞ Compare Models** instead of **▶ Forge**.
4. Watch live status tiles as each provider runs in parallel.
5. Side-by-side columns appear with detection SPL, rationale, MITRE mapping, hunts, triage, and response for each model.
6. Export the comparison as JSON or Markdown for your writeup.

All runs share the same threat brief, the same temperature, and the same (optionally ingested) reference URL context. Divergence in output is then fully attributable to the model itself.

---

## Two deployment types

The same `web/index.html` is the canonical source. The desktop build wraps it — no duplication.

### 1. Browser (single HTML file)

No install. Open `web/index.html` in any modern browser. That's it.

```bash
# Optional: serve it over HTTP so localStorage partitioning behaves predictably
cd all-seeing-eye
npx http-server web -p 8080 -o
```

**Note on CORS:** direct browser calls to `api.anthropic.com`, `api.openai.com`, and `generativelanguage.googleapis.com` are generally permitted — Anthropic requires `anthropic-dangerous-direct-browser-access: true` (already set). If your corporate proxy blocks this, use the desktop build, which has no such restriction.

### 2. Desktop (Electron)

```bash
cd all-seeing-eye
npm install
npm start       # launches the desktop app
```

To build installers:

```bash
npm run dist     # builds for your current OS into ./dist
```

The desktop build adds: a native menu, native Save-As dialogs, no CORS constraints on LLM calls, and desktop-mode labeling in the UI.

---

## Quick start

1. Open the app (browser or desktop).
2. Pick an LLM in the right-hand **LLM Providers** panel. The default **Offline Forge** works with zero setup.
3. In **Threat Brief**, describe the threat in natural language. Optionally add a codename, set the domain, and paste reference URLs (MITRE, CVE, vendor writeups, blog posts — the tool can ingest them for context).
4. Hit **▶ Forge Detection Package**.
5. Review detections & hunts. Each has rationale, CIM mapping, and SPL validation.
6. **Export JSON** for your detection-as-code repo, or **Export MD** for a runbook.

### Starter presets

The sidebar ships with four realistic threat scenarios you can try immediately:

- Okta Session Token Theft (Evilginx-style)
- GitHub Actions Secret Exfil
- AWS IAM Persistence Backdoor
- Malicious NPM Dependency (typosquat)

---

## Settings (right inspector)

| Setting | What it does |
|---|---|
| **Force Offline (air-gap)** | Bypass the selected LLM entirely, even if a key is configured. Useful for air-gapped work. OFF by default — the selected model is authoritative. |
| **Fetch Reference URLs** | Pull URL contents via the `r.jina.ai` public reader proxy for LLM grounding. Disable for air-gapped use. |
| **CIM Data Model Aware** | Prefer accelerated `tstats` over `Authentication`, `Change`, `Network_Traffic` data models. |
| **Include tstats Queries** | Generate `tstats`-based hunts alongside raw-event searches. |
| **MITRE ATT&CK Mapping** | Include technique IDs in output. |
| **LLM Temperature** | 0.0 (focused, near-deterministic) → 1.5 (creative, high variance). Default 0.7. Applied to Anthropic, OpenAI, Gemini, and any custom endpoint. |

---

## Architecture

```
all-seeing-eye/
├── web/
│   └── index.html        ← single-file app, canonical source
├── electron/
│   ├── main.js           ← desktop shell, loads web/index.html verbatim
│   └── preload.js        ← contextBridge for native save dialogs
├── package.json
└── README.md
```

**One codebase, two deployments.** Every fix to `web/index.html` propagates to both.

Threat library and API keys live in browser `localStorage` — scoped per origin (browser) or per app (Electron userData dir). Keys are never transmitted anywhere except the provider you select.

---

## SPL validation rules (heuristic)

The prototype runs these lightweight checks on every generated query:

- Balanced `()`, `[]`, `""`
- At least one recognized SPL command
- Empty pipe segments (`| |`)
- `index=*` without `tstats` (flagged as expensive)
- Missing time scoping (no `earliest=` or `tstats` or `timechart`)
- `tstats` without `datamodel=`

Validation is **heuristic, not a parser** — think linter, not compiler. Always review queries against your own data before deploying.

---

## Extending the prototype

Everything is in `web/index.html`. The parts you'll most likely want to edit:

- **`MITRE_LEXICON`** — keyword → technique mappings. Add entries for threats you care about.
- **`forgeSpl()`** — domain-aware SPL templates. The prototype has templates for cloud (AWS), CI/CD (GitHub), identity (Okta), and supply chain (NPM). Add your own.
- **`SYSTEM_PROMPT`** — the instructions sent to cloud LLMs. Tune for your org's naming conventions, index names, etc.
- **`PRESETS`** — the canned threats in the sidebar.

---

## Roadmap ideas

- Sigma rule output alongside SPL
- Splunk SOAR playbook generation
- Signed-hash export for detection-as-code GitOps workflows
- Test-harness mode: paste sample events, see which rules fire
- Content Pack import/export (share a library of threats across teams)

---

## Prototype caveats

- SPL validation is heuristic, not a real parser. Review before deploying.
- Offline forge templates cover the four demo domains well; edge-case threats may need LLM augmentation.
- URL ingestion uses `r.jina.ai` (a public reader-proxy). For sensitive threat intel, use the desktop build with a local LLM and disable URL fetching.
- No telemetry. No analytics. The tool makes no network calls unless you tell it to (ingesting a URL, calling an LLM).
