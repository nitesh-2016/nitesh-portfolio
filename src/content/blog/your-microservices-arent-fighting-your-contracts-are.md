---
title: "Your Microservices Aren’t Fighting. Your Contracts Are."
description: "How OpenAPI, Orval, and Zod stop teams from quietly disagreeing until production — including shipping the generated client as a versioned npm package."
pubDate: 2026-09-21
heroImage: "/blog/your-microservices-arent-fighting-your-contracts-are.png"
tags:
  - architecture
  - openapi
  - orval
  - zod
  - nestjs
  - typescript
---

**Or: how OpenAPI, Orval, and Zod stop teams from quietly disagreeing until production**

Here’s a scene I’ve lived more than once.

Three services. One UI. Everyone ships on Friday.

Monday morning, the end-to-end path is red. Unit tests are green. Staging “worked last week.” Somebody renamed a field. Somebody else treated an optional property as required. A third person assumed an error body that only exists in one environment. Nobody lied. They just stopped agreeing — and nothing forced them to notice.

That’s integration drift. It’s not a drama. It’s entropy.

Contract-first design is how you make that disagreement show up early, while it’s still cheap.

## What I mean by contract-first

Not “we wrote a Swagger file in 2022 and never opened it again.”

In practice it means three boring, powerful habits:

1. **There is one source of truth** — not a wiki, not Slack, not “check the DTO in that other repo.”
2. **Consumers are generated from that truth** — so a contract change breaks their build, not their Friday night.
3. **You still validate at runtime** — because TypeScript types vanish the moment JSON hits the wire.

On NestJS / TypeScript platforms, a stack that earns its keep looks like this:

- **OpenAPI** — the shared HTTP agreement
- **Orval** — typed clients for UIs and sibling services
- **Zod** — runtime checks at trust boundaries

In plain language:

OpenAPI says what we expose.  
Orval keeps callers honest when that agreement moves.  
Zod decides what we actually accept when bytes arrive.

## A walkthrough: starting a “mission”

Picture an orchestration platform. The UI (or another service) starts a mission — a small graph of steps. The orchestrator accepts that graph. Downstream adapters run each step type.

We’ll use that as a toy example. The pattern is the same for billing, partners, identity, or content pipelines.

### 1) OpenAPI — write the agreement down

```yaml
# openapi/platform-api.yaml (excerpt)
paths:
  /missions:
    post:
      operationId: createMission
      tags: [Missions]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateMissionRequest'
      responses:
        '201':
          description: Mission accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Mission'
        '400':
          description: Validation failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'

components:
  schemas:
    CreateMissionRequest:
      type: object
      required: [name, nodes]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 120
        correlationId:
          type: string
          format: uuid
        nodes:
          type: array
          minItems: 1
          items:
            $ref: '#/components/schemas/MissionNode'
    MissionNode:
      type: object
      required: [id, type, input]
      properties:
        id:
          type: string
        type:
          type: string
          enum: [robot.command, sensor.read, wait]
        input:
          type: object
          additionalProperties: true
        dependsOn:
          type: array
          items:
            type: string
    Mission:
      type: object
      required: [id, status]
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
          enum: [accepted, running, failed, completed]
    ProblemDetails:
      type: object
      required: [title, status]
      properties:
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        correlationId: { type: string, format: uuid }
```

Yes, it’s dry. Good. Exciting contracts are usually unfinished contracts.

### 2) Orval — stop hand-writing the client

Once the YAML is real, generate the consumer instead of maintaining a pet `fetch` wrapper that slowly lies.

```ts
import { defineConfig } from 'orval';

export default defineConfig({
  platformApi: {
    input: {
      target: './openapi/platform-api.yaml',
      validation: true,
    },
    output: {
      mode: 'tags-split',
      target: './src/generated/platform-api.ts',
      schemas: './src/generated/models',
      client: 'axios',
      prettier: true,
      override: {
        mutator: {
          path: './src/lib/api-client.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
```

Keep auth and base URL in one mutator:

```ts
// src/lib/api-client.ts
import Axios, { type AxiosRequestConfig } from 'axios';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.PLATFORM_API_BASE_URL,
});

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return AXIOS_INSTANCE(config).then(({ data }) => data);
};
```

After `npx orval`, calling the API looks ordinary — which is the goal:

```ts
import { createMission } from './generated/missions';

await createMission({
  name: 'multi-floor-delivery',
  correlationId: crypto.randomUUID(),
  nodes: [
    {
      id: 'n1',
      type: 'robot.command',
      input: { capability: 'motion.navigate', floor: 3 },
    },
    {
      id: 'n2',
      type: 'sensor.read',
      input: { source: 'elevator' },
      dependsOn: ['n1'],
    },
  ],
});
```

Now rename `dependsOn` to `depends_on` in OpenAPI and regenerate. The consumer’s TypeScript build fails. That failure is a gift. It used to be a production incident.

### 3) Zod — because types don’t ride the HTTP request

Orval helps callers. It does not protect your NestJS process from a bad POST body.

```ts
import { z } from 'zod';

const MissionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['robot.command', 'sensor.read', 'wait']),
  input: z.record(z.unknown()),
  dependsOn: z.array(z.string()).optional(),
});

export const CreateMissionRequestSchema = z.object({
  name: z.string().min(1).max(120),
  correlationId: z.string().uuid().optional(),
  nodes: z.array(MissionNodeSchema).min(1),
});

export type CreateMissionRequest = z.infer<typeof CreateMissionRequestSchema>;
```

At the controller edge:

```ts
@Post('/missions')
create(
  @Body(new ZodValidationPipe(CreateMissionRequestSchema))
  body: CreateMissionRequest,
) {
  return this.missions.create(body);
}
```

Same idea on Kafka or RabbitMQ — parse the envelope before domain logic gets clever:

```ts
const MissionStartedEventSchema = z.object({
  type: z.literal('mission.started'),
  version: z.literal(1),
  correlationId: z.string().uuid(),
  payload: z.object({
    missionId: z.string().uuid(),
    nodeCount: z.number().int().positive(),
  }),
});
```

A useful rule of thumb: **validate at boundaries, not on every internal function call.** Trust drops when a process or a team changes.

## Why this matters more on platforms than on “an app”

One service can limp along on tribal knowledge for a while. A platform cannot.

An orchestration-style system usually has:

- an orchestrator moving inputs and outputs through a graph
- adapters for the messy outside world (devices, sensors, media, identity, billing…)
- a control UI that needs stable shapes for forms, status, and errors

When shapes drift, each of those fails differently. Shared contracts shrink the number of private dialects of the same API.

## Ship the contract as a versioned package

Generating a client in every consumer repo works. Publishing the generated client as an **npm package** works better — especially across React, Angular, and sibling microservices.

The loop looks like this:

1. API contract changes (OpenAPI in the producer).
2. CI lints the spec, runs Orval, bumps a package version (`@your-org/platform-api-client`).
3. CI publishes to **Azure Artifacts** or **GitHub Packages** (private feed is fine).
4. Web apps and services update that dependency like any other library.

Now a contract change isn’t a Slack ping and a hope. It’s a semver event.

Consumers choose when to upgrade. Breaking OpenAPI changes become major versions. Additive fields can ride a minor. Your CI on the consumer side can even fail a PR that is still pinned to an ancient client — if you want that discipline.

A sketch of the producer pipeline:

```yaml
# conceptual — GitHub Actions or Azure DevOps
- run: npm run openapi:lint
- run: npx orval
- run: npm version prerelease --no-git-tag-version   # or semantic-release
- run: npm publish --registry https://pkgs.dev.azure.com/...  # or GitHub Packages
```

On the consumer:

```bash
npm update @your-org/platform-api-client
# or: bump the range in package.json and let Renovate/Dependabot open the PR
```

This is where contract-first stops being a coding style and becomes a **distribution problem you solved**. The agreement isn’t trapped in one monorepo. It travels.

## Habits that keep the contract honest

**One source, many projections.**  
Clients, docs, and stubs should come from the same OpenAPI. If the docs and the code disagree, the process is broken — not “someone forgot to update Confluence.”

**Let CI be the referee.**

```bash
# producer
npm run openapi:lint
npm run openapi:export

# consumer (or monorepo package)
npm run orval
npm run typecheck
```

If only the producer repo builds, you don’t have a platform contract. You have a suggestion with confidence.

**Errors are part of the product.**  
Put a real error schema in OpenAPI (`ProblemDetails` or your house style). Free-form `"something went wrong"` strings are how UIs invent folklore.

**Events need the same respect as HTTP.**  
Define envelopes: `type`, `version`, `payload`, correlation ids. Version payloads on purpose. Sometimes rejecting unknown fields is kinder than “being flexible.”

## A story from the field (without the proprietary bits)

On a NestJS event-driven orchestration system — many node types, lots of async handoffs — the worst bugs weren’t clever algorithms. They were quiet shape mismatches between the orchestrator, node handlers, and the UI.

We made OpenAPI the shared HTTP agreement, generated consumers with Orval, and put Zod at the edges. Reviews started to include the contract diff. People stopped asking “which DTO is real?”

The win wasn’t prettier TypeScript. It was fewer meetings that began with “but it worked on my service.”

## The tradeoffs (said plainly)

You’ll spend real time writing decent OpenAPI. Bad OpenAPI is worse than none — it teaches false confidence.

Generated code can feel noisy. Configure the generator once; don’t hand-edit the output and pray.

Zod everywhere becomes religion. Boundaries matter. Your internal helpers usually don’t need a ceremony.

And green typechecks still won’t catch “amount is in paise, not rupees.” Structure isn’t semantics. Domain review still earns its seat.

## If you’re starting from a messy estate

Don’t announce an enterprise governance program on day one.

1. Pick **one** high-churn boundary — often the BFF or orchestrator API.
2. Publish OpenAPI from it.
3. Generate one consumer with Orval; delete the hand-written client.
4. Add Zod at that same ingress.
5. Only then expand to events and the next service.

Make one boundary trustworthy. Copy the pattern after it hurts less.

## The point

Contract-first isn’t a love letter to OpenAPI.

It’s a way to make disagreement visible while you can still fix it over coffee instead of over an incident bridge.

OpenAPI says what we expose.  
Orval keeps callers tied to that truth.  
Zod keeps runtime from lying to your types.

If you’re wiring an orchestrator, a flock of adapters, and a UI on top — that trio is one of the cheapest reliability upgrades I’ve found.

---

*For architects and Staff/Principal engineers on NestJS / TypeScript platforms. Examples are illustrative.*
