# ADR-003: Caching and Indexing

## Status
Accepted

## Context
Balance, order book, and workflow query paths are read-heavy and latency-sensitive.

## Decision
Apply Redis-backed caching for selected read paths and add targeted database indexes to high-frequency filters/sorts.

## Consequences
- Lower median and tail latency.
- Requires cache invalidation discipline and index maintenance.
