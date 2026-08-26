# Contributing to ai-bvf

The benchmark ranges, industry multipliers, and scoring math in this protocol depend on public review to improve. Contributions argued in public are how the calibration sharpens.

## What is welcome

- **Calibration disputes.** A benchmark range you think is wrong, with the function, industry, the range the engine returned, what you think it should be, and a citation. File these as a [Discussions](https://github.com/Craig-Horton/ai-bvf/discussions) thread, not an issue.
- **Worked examples where the verdict felt off.** Inputs you used, the verdict you got, what you would have expected, why. Counter-examples are how the engine learns where it is over-confident.
- **Missing industry modules.** A sector the cross-industry default does not land for, with one published reference that would anchor a calibration.
- **Bug fixes** in the scoring engine, MCP server, or telemetry pipeline.
- **Documentation improvements** in README, examples, schema descriptions, and the protocol spec.

## What stays out

- New industry modules without a published benchmark source. The calibration is sourced from McKinsey, Gartner, BCG, Deloitte, Forrester, Accenture, and ServiceNow. New modules need at least one comparable citation.
- LLM-in-the-loop changes to the scoring path. The protocol is deterministic by design. Reasoning, recommendation, and prose stay LLM-driven, the number does not.
- Cosmetic README rewrites that do not change information density.

## How to submit a code change

1. Fork the repository.
2. Branch from `main`, named descriptively (`fix/...`, `feat/...`, `docs/...`).
3. Keep the PR scoped to one concern.
4. Include a test plan in the PR description.
5. CI runs the Test workflow: every workspace builds and the full suite runs. It must be green before merge.

## How to submit a calibration change

Open a [Discussions](https://github.com/Craig-Horton/ai-bvf/discussions) thread first, naming the function, industry, range, your proposed value, and the citation. After the dispute resolves in the thread, the change lands in a release with the contributor named in the release notes, by handle or by full name on request.

## Local development

```bash
git clone https://github.com/Craig-Horton/ai-bvf
cd ai-bvf
npm install
npm -w @aibvf/core run build
npm -w aibvf-mcp run build
npm -w @aibvf/core test
```

Local MCP smoke test:

```bash
node packages/mcp/dist/index.js
```

## License

Source code is MIT. The benchmark corpus and certification marks are proprietary. Contributions to source are taken as MIT-licensed. Contributions to the benchmark corpus are taken under separate written agreement with Craig Horton Advisory.
