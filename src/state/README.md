# Household state boundary

Milestone 2 adds a single client provider here, mounted above household routes so navigation preserves state. It owns validated `AppState` facts, typed commands and the `roomieos:v1` storage adapter. Feature components keep temporary form drafts locally. Domain functions remain independent of React and storage; selectors derive balances and counts.

Milestone 1 deliberately does not read or write browser household storage. No provider or seed state is installed until validation and recovery are implemented together.
