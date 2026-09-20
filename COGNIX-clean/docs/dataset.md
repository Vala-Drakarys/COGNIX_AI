# Dataset contract

The dataset directory contains the seed educational corpus used by the retrieval layer. Add future JSON documents using the same contract.

At runtime, the retrieval service scans `backend/dataset/` for JSON files. Each document should contain:

- `id`
- `title`
- `topic`
- `tags` (optional array)
- `content`

Retrieval performs lightweight lexical matching and returns the most relevant documents to the LLM. This keeps the knowledge source independent from the diagnostic controller and makes the corpus replaceable without changing application logic.
