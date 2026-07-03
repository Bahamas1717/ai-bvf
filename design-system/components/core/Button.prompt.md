Copper action button for AI BVF — one primary per view, ghost/outline for secondary.

```jsx
<Button variant="primary" size="md" onClick={run}>Score initiative</Button>
<Button variant="ghost">Cancel</Button>
```

Variants: `primary` (copper fill), `ghost` (subtle fill + hairline), `outline` (copper outline). Sizes: `sm` · `md` · `lg`. All uppercase, wide-tracked. Pass `disabled` to dim + lock.
