The signature CI gate report — `aibvf-check` output ("SonarQube for AI"). Overall PASS/FAIL derived from the check rows.

```jsx
<Scorecard
  command="aibvf-check ./portfolio.bvf.json"
  threshold="min-verdict=Fix · max-governance-risk=60"
  checks={[
    { name: 'CX copilot rollout', verdict: 'Accelerate', score: 72, pass: true },
    { name: 'Autonomous procurement agent', verdict: 'Stop', score: 38, pass: false },
  ]}
  footer="What you don't gate, you don't govern."
/>
```

Gate is PASS only when every check passes; otherwise FAIL with `exit 1`. Failed rows get a red wash. Feature it large as a hero/signature visual.
