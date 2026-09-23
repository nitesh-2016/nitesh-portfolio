---
title: "Stop Calling Everything a Gateway"
description: "BFF, API Gateway, and direct service calls solve different problems. Mixing them up is how platforms get a fat proxy, a chatty UI, and nobody who owns either."
pubDate: 2026-09-23
heroImage: "/blog/stop-calling-everything-a-gateway.png"
tags:
  - architecture
  - bff
  - api-gateway
  - microservices
  - nestjs
  - typescript
---

Here’s a conversation that happens in almost every platform review.

Someone draws three boxes: UI, “Gateway,” microservices. The arrow from the browser lands on the middle box. Everyone nods. Six months later that middle box is doing auth, aggregation, retries, GraphQL, REST, feature flags, and a little bit of business logic “just for now.” The UI still fans out to two “temporary” services. On-call still doesn’t know which layer owns the 504.

The problem usually isn’t microservices. It’s that **BFF**, **API Gateway**, and **call the service directly** got treated as synonyms.

They aren’t. They answer different questions.

## Three patterns, three jobs

### Direct call — “this UI owns this dependency”

The browser (or mobile app) talks to a service using that service’s public contract. Fine when:

- one client, one backend surface
- the contract is stable and already shaped for humans (forms, lists, errors)
- you can live with CORS, auth tokens, and versioning at that edge
- failure of that one call is understandable to the user

Direct is honest. It’s also how you accidentally build a distributed monolith in the *client*: five services, five loading spinners, five ways to say “unauthorized,” and a product manager who thinks “frontend is slow.”

### API Gateway — “one front door for the platform”

A shared edge in front of many services. Typical jobs:

- TLS termination, routing, rate limits
- authentication / token validation (sometimes)
- coarse request logging and correlation ids
- protocol translation (rarely — be careful)

A gateway is **infrastructure policy**, not “where we put product features.” When it starts composing domain responses, you’ve invented a BFF without admitting it — and you’ve put every team’s UI behind one shared blast radius.

### BFF (Backend for Frontend) — “this experience needs its own backend shape”

A backend owned by (or for) a specific client experience: web app, admin console, partner portal, mobile. Typical jobs:

- aggregate 2–N service calls into one screen-shaped response
- reshape DTOs so the UI doesn’t speak three dialects
- hide internal service topology from the browser
- enforce UX-specific authz (“can this role see this panel”)
- absorb churn so the mobile app doesn’t ship every time inventory renames a field

A BFF is **product-facing composition**. It’s allowed to be opinionated about screens. A gateway should not be.

## A concrete scene

Say you have:

- an orchestration API (`POST /missions`, status, node events)
- an identity service (users, roles)
- a notifications service
- a React admin console and a separate citizen-facing Next.js app

**Wrong default:** both UIs call all three services. Each UI reinvents join logic, error mapping, and “wait for Kafka to catch up” polling. Two teams ship the same bug twice.

**Also wrong:** one shared “Platform Gateway” that knows about admin tables *and* citizen RTL forms *and* mission DAG shapes. Now every UI change risks the shared edge, and deploys get political.

**Usually right:**

- a thin **API Gateway** (or ingress) for routing, TLS, rate limits, maybe JWT validation
- an **Admin BFF** that composes mission + identity for operator screens
- a **Citizen BFF** (or Next.js route handlers used *as* a BFF) shaped for bilingual self-service flows
- services stay callable by other services; the browser mostly talks to *its* BFF

Direct calls can still exist for simple, stable resources (e.g. a public config endpoint). Exceptions should be boring and few.

## Decision table (the useful kind)

| Question | Prefer |
| --- | --- |
| Do we need one edge policy (rate limit, TLS, WAF) for many services? | API Gateway |
| Does one screen need 3+ service calls or awkward joins? | BFF |
| Is the contract already UI-shaped and stable for one client? | Direct (or keep it) |
| Will two different products diverge in authz and payload shape? | Separate BFFs |
| Are we tempted to put domain rules in nginx / Kong / Envoy plugins? | Stop — that’s a BFF or a service |

## NestJS sketch: a small Admin BFF

Keep it dull on purpose.

```ts
// admin-bff: GET /screens/mission/:id
@Controller('screens/mission')
export class MissionScreenController {
  constructor(
    private readonly missions: MissionsClient, // Orval-generated
    private readonly identity: IdentityClient,
  ) {}

  @Get(':id')
  async getScreen(@Param('id') id: string, @CurrentUser() user: User) {
    const [mission, operators] = await Promise.all([
      this.missions.getMission(id),
      this.identity.listOperators({ tenantId: user.tenantId }),
    ]);

    // Authz for *this console*, not a generic gateway rule
    if (!user.can('missions:read')) {
      throw new ForbiddenException();
    }

    return {
      mission: {
        id: mission.id,
        status: mission.status,
        nodeCount: mission.nodes.length,
      },
      assigneeOptions: operators.map((o) => ({
        id: o.id,
        label: o.displayName,
      })),
      ui: {
        canCancel: user.can('missions:cancel') && mission.status === 'running',
      },
    };
  }
}
```

Notice what this is *not*:

- not a generic `/proxy/missions/*`
- not inventing a second source of truth for mission state
- not replacing OpenAPI on the domain services — the BFF *consumes* those contracts (Orval helps here)

The gateway in front might only do:

```text
/admin-api/*  → admin-bff
/citizen-api/* → citizen-bff
/internal/*   → blocked from public
```

## Failure modes I’ve seen (and caused)

**God gateway.**  
Every team adds “one more plugin.” Latency and ownership evaporate. Fix: extract BFFs; leave the gateway boring.

**Chatty UI.**  
Twenty waterfalls, no aggregation, CORS chaos. Fix: BFF for the hot screens first, not a rewrite of the universe.

**BFF as a second domain service.**  
Business rules duplicate and drift. Fix: BFF composes and adapts; domain services still own writes and invariants.

**“Temporary” direct calls that become architecture.**  
Document them. Time-box them. Or promote them to a real public API with a contract.

**One BFF for every client forever.**  
Admin and mobile diverge until the shared BFF is full of `if (client === 'ios')`. Fix: split when the shapes stop overlapping.

## How this ties to contract-first

If you already publish OpenAPI and generate clients, BFFs become *consumers* of platform contracts — not a place to invent private JSON by vibe.

- Domain services: stable, versioned contracts
- BFF: screen-shaped DTOs (can be looser, still validated with Zod at the edge)
- Gateway: mostly headers, routes, and policy — not schemas of record

That separation keeps Friday’s UI tweak from becoming Monday’s cross-team incident.

## A practical rollout

1. List the top five screens by complexity (joins, roles, polling).
2. Put those behind a BFF; leave simple reads alone for a sprint.
3. Move shared edge concerns (TLS, rate limit, authn) to the gateway / ingress.
4. Ban new domain logic in gateway config reviews.
5. Split BFFs when two products argue over the same response shape for a month.

You don’t need a grand platform program. You need names that mean something, and a rule about where product opinion is allowed to live.

## The point

**Direct call** is a relationship between one client and one service.  
**API Gateway** is shared edge policy.  
**BFF** is an experience-owned backend that shapes the product.

Call the middle box by its real job. If you can’t say which of the three it is, it will eventually try to be all three — and that’s when the architecture diagram stops matching the outage.

---

*For architects and Staff/Principal engineers designing NestJS / TypeScript platforms with more than one UI. Examples are illustrative.*
