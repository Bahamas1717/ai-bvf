Four-pillar score meter (0–100). Fill colour follows RAG thresholds automatically.

```jsx
<PillarMeter label="Strategic Alignment" score={70} threshold={60} />
<PillarMeter label="Governance Risk" score={45} tone="stop" />
```

Auto tone: ≥60 green, ≥40 amber, else red. Force with `tone`. `threshold` draws a target marker line.
