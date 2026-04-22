# High-Level System Architecture

```mermaid
flowchart LR
  user["User"]

  subgraph browser["Browser App"]
    direction LR
    ui["UI"]
    board["Board Controller"]
    algo["Algorithms + Visualization"]
  end

  store[("localStorage<br/>history + sidebar state")]
  api["Express API"]
  llm["OpenAI API"]

  user -->|"interact"| ui
  ui --> board
  board -->|"run"| algo
  board <-->|"save/load"| store
  board -->|"POST /api/explain"| api
  api --> llm
  api -->|"AI summary"| board
```

Main logic runs in the browser. The server is only used for AI summaries and static serving.

- Browser is where the app mainly runs.
- `Board Controller` is the central coordinator.
- History stays in `localStorage`, and AI goes through Express.
