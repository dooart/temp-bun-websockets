# bun-websockets

simple test with bun websockets to pinpoint specific internal problem

## prep

1. make sure you're on bun v1.1.7
2. bun install

## simple test (works)

1. `bun server-simple-works.ts`
1. `bun client.ts`

## delegated websocket test (works)

1. `bun server-delegated-works.ts`
1. `bun client.ts`

## hocuspocus test (fails)

1. `bun server-hocuspocus.ts`
1. `bun client-hocuspocus.ts`
