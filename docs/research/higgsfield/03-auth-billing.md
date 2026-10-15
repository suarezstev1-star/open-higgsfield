# 03 — Identity, accounts, monetization, telemetry (higgsfield.ai frontend, static analysis)

Scope: what the shipped JS shows about authentication, organizations/workspaces, billing/credits, and analytics/consent.
Method: grep plus small node scripts (`tools/ctx.mjs`, `tools/routemap.mjs`, `tools/strs.mjs`) over `hf-assets/`. No network requests were made.
All chunk names below are short forms of `hf-assets/868a8dba-<id>.js`. The main entry/router bundle is `QhqiFCLt1Ukztv0Y`, about 1.2 MB.
The route→chunk map is in `tools/routemap.tsv`. It was built heuristically from `R(\`/route\`)({component:I(X,...)})` patterns in the main bundle.

Legend:
- **[O]** OBSERVED: the literal is in the code.
- **[I]** INFERRED: reasoned from the code.
- **[U]** UNKNOWN.

UI text is mostly Lingui message IDs (for example `{id:\`t-Me_j\`}`). The message catalogs are not among the downloaded JS (route `/locales/$locale`), so most user-visible copy cannot be resolved.

---

## 1. Authentication

### 1.1 Clerk is the identity provider
- [O] Production Clerk publishable key in the main bundle: `k_=\`pk_live_Y2xlcmsuaGlnZ3NmaWVsZC5haSQ\``. Decoded from base64 it is `clerk.higgsfield.ai$`. The same key is passed to the provider (`publishableKey:\`pk_live_Y2xl...\`,proxyUrl:n,prefetchUI:!1`).
- [O] `hf-site/index.html` loads `https://clerk.higgsfield.ai/npm/@clerk/clerk-js@6.32.1/dist/clerk.browser.js` and carries `<meta name="hf-clerk-mode" content="hosted"/>`.
- [O] There are two Clerk frontend-API modes: **hosted** (`clerk.higgsfield.ai`) and **proxy** (`https://higgsfield.ai/_clerk`).
  - Main bundle: `fD=\`hf_clerk_proxy\`,pD=\`/api/auth/clerk-proxy-rollout\`,mD=\`https://higgsfield.ai/_clerk\``.
  - OAuth handling: `aD=new Map([[\`https://higgsfield.ai\`,\`https://clerk.higgsfield.ai\`]]),oD=\`__hf_oauth_mode\``.
  - [I] The proxy mode is a staged rollout, gated by a cookie or flag (`hf_clerk_proxy`) and a server endpoint.
- [O] Server-side (TanStack Start SSR) Clerk middleware config: `secretKey:A_,proxyUrl:j_,jwtKey:M_` with `{}.CLERK_SECRET_KEY`, `{}.CLERK_JWT_KEY`, `CLERK_SECRETLESS_MIDDLEWARE`. These are empty in the client build.
- [O] The cookie notice (`iMf2NACEVp2Vgrtp`) lists `__session` from Clerk, Inc.: "Keeps you signed in for the current session". It also lists Cloudflare `_cfuvid` on `clerk.higgsfield.ai`.

### 1.2 Sign-in / sign-up flows
Routes and chunks from `routemap.tsv`:

| Route | Chunk |
|---|---|
| `/auth/sign-in` | `jZKkl9_mhFsrdVFD` |
| `/auth/sign-up` | `As9QeDNG3m6GB201` |
| `/auth/login` | `PMbI5aX1V2CA9a8H` |
| `/auth/logout` | `3lxTS-g1e4Hze173` |
| `/auth/sso` | `DLPkE6jrpFq7go7O` |
| `/auth/sso-callback` | `669QZX9fZuFQNnql` |
| `/auth/token` | `PKihk6je-MOhPuoW` |
| `/auth/email/sign-in`, `/auth/email/sign-up`, `/auth/email/verify` | — |
| `/auth/forgot-password` | — |

There are also legacy aliases: `/sign-in`, `/sign-up`, `/login`, `/logout`.

- [O] Social OAuth providers (`M7Ir_Vjnra39U3Oq`): `z={oauth_google:\`Google OAUTH\`,oauth_apple:\`Apple OAUTH\`,oauth_microsoft:\`Microsoft OAUTH\`}`. The same three buttons appear in `74M9G8WATb2A1Iz5` (welcome-quiz sign-up) and `MTeL6eey3q22JZqd` (mobile).
- [O] OAuth is redirect-based, through `/auth/sso-callback`:

  ```js
  n.authenticateWithRedirect({strategy:e,redirectUrl:`/auth/sso-callback?${i.toString()}`,redirectUrlComplete:r})
  // params: rp (return path), provider, source
  ```

  The last-used provider is stored in `sessionStorage['hf:oauth-provider']`, and a `data-auth-last-used` badge marks it in the UI.
- [O] Email and password sign-up with email-code verification (`74M9G8...`): `await i.create({emailAddress:l,password:f}),await i.prepareEmailAddr...`, using `strategy:\`email_code\`` and `attemptEmailAddressVerification`.
- [O] Ticket sign-in: `/auth/token?t=<clerk ticket>`. The main bundle maps `/auth/token`→`t`, and `/auth/sign-in`, `/sign-in`, `/checkout-first/return`, `/accept-invitation` → `__clerk_ticket`. Ticket parameters are captured and stripped from the URL. [I] The backend uses this for magic-link-style handoffs: checkout-first, invitations, and desktop/mobile.
- [O] Enterprise SSO (`SB1I8wMQhBTZU69v`, `rMGNHEg2UbKVmPvG`, `yogviFmjqhIWR4Uo`):
  - The page calls `signIn.create({identifier: email})` and checks `supportedFirstFactors.some(e=>e.strategy===\`enterprise_sso\`)`.
  - It then calls `authenticateWithRedirect({strategy:\`enterprise_sso\`, ..., continueSignIn:!0, identifier})`.
  - If no SSO factor exists, it shows an error: `trackSsoLoginError(\`clerk_sso_factor\`,\`No enterprise SSO factor found\`)`.
- [O] Higgsfield also acts as an **OAuth authorization server**, via Clerk OAuth applications, for MCP/agent clients:
  - Paths: `/oauth/authorize`, `/_clerk/oauth/authorize/continue`, and the consent page `/oauth/consent` (with a `mock-checkout` sub-route).
  - Parsed query fields: `client_id`, `surface`, `agent`, `resource`.
  - The consent page can show an MCP trial pricing step: `v=\`oauth_consent\`,y=\`oauth_consent_trial_pricing\`,b=\`oauth_consent_trial_return\``, with `promotion_name:\`mcp_free_trial\`` (`0dsOhzitMrh9Ectb`).
  - Allowed console origins: `open.higgsfield.ai` and `console.higgsfield.ai`.
- [O] **CLI device auth.** `/device` (chunk `3tbQWUkeaRBTRZpd` → `H5tNt6L5_-TU5aL5`) no longer runs a device flow. It renders a static card telling the user to run `` `higgsfield auth login` `` and links to `https://github.com/higgsfield-ai/cli#updating`.
  - [O] The API module still exports `deviceAuthApiUrl` = `https://fnf-device-auth.higgsfield.ai` (`Uvx7o7ASR4AkkzQA`: `x as deviceAuthApiUrl`), but no endpoint paths under it appear in the bundles.
  - [I] The device code and polling now happen in the CLI, outside the web app. [U] The exact device-auth endpoints are not known.
- [O] Other sign-in-adjacent integrations:
  - Discord account linking: `/discord-verify`, `/discord/oauth/start`, `/discord-verify/callback`.
  - Adobe plugin: `/api/adobe-plugin/session/exchange`.
- [O] Email verification:
  - Route `/_private/email-verification` (`UfLaTJGSTJBlfoQO`).
  - Business email verification: `/business-email-verification/{submit,claim,status}`, `/business-domain-verification`.
  - Business unlimited verification: `/business-unlim/verification/{submit,confirm}`.
- [O] Bot protection is **DataDome**, not Datadog. Main bundle: `Cc=\`378262463E4AB20E202654D445C059\`,wc=\`https://dd.higgsfield.ai/js\`,Tc={sessionByHeader:!0,endpoint:wc,enableTagEvents:!0,ajaxListenerPath:[{host:\`fnf-api-gw.higgsfield.ai\`}]}`.
  - `N74mD0Hu9YNzgMYQ` handles `DataDomeCaptchaDisplayed`, `ddChallengeContainer`, and "DataDome recovery".
  - The cookie list includes a `datadome` cookie (vendor DataDome, 365 days).

### 1.3 How the session token reaches API calls
- [O] The API gateway base is `yb=\`https://fnf-api-gw.higgsfield.ai/fnf\``. There are many service prefixes on the same gateway: `/fnf-campaign-api`, `/fnf-community`, `/fnf-notification`, `/fnf-skills-marketplace`, `/fnf-apps-marketplace`, `/fnf-agent-gateway`, `/fnf-ai-cmo`, and others.
- [O] A named export module (`Uvx7o7ASR4AkkzQA`) re-exports the helpers: `apiUrl`, `authHeaders`, `apiHeaders`, `hfWorkspaceIdHeader`, `deviceAuthApiUrl`, and so on.
- [O] Header builders in the main bundle:

  ```js
  function yye(e,t=new Headers){return t.set(`Authorization`,`Bearer ${e}`),jb(t)}  // + Accept-Language
  function xye(e=new Headers,t){return e.set(`hf-workspace-id`,t),e}
  function vye(e){return e.set(`hf-env`,Ib[cd]),e}
  ```

- [O] Token resolution:
  - On the client, a "refreshable" resolver calls `session.getToken()` and `forceRefresh` calls `getToken({skipCache:!0})`. Clerk's built-in `getToken` is wrapped with a timeout. On failure it fires the analytics event `auth_token_fetch_failed`.
  - As a fallback, the code reads the `__session` cookie directly: `document.cookie.split('; ').find(e=>e.startsWith('__session='))`. It checks JWT `exp`.
  - During SSR, the token comes from a request-scoped async store: `no request-scoped auth token available during SSR`.
- [O] Typical call: `fetch(m('/subscriptions/update'),{headers:{Authorization:\`Bearer ${t}\`,...}})`.
  - Workspace-scoped calls add `hf-workspace-id`.
  - `POST /workspaces/context {workspace_id | ticket}` switches the active workspace, and `DELETE` clears it.
- [O] An alternative typed client (`RKpCrebWFpypqouZ`, "createFnfWebAdapter") uses `baseUrl` `https://fnf.higgsfield.ai` with `getToken` and `workspaceId` callbacks. Example methods: `getUser`→`GET /user`, `listWorkspaces`→`GET /workspaces`, `getWorkspaceWallet`→`GET /workspaces/wallet`, `switchWorkspace`→`POST /workspaces/context`.

### 1.4 Logout, sessions
- [O] `/auth/logout` and `/accept-invitation/logout` call Clerk `signOut({sessionId})` (`PWbhSVQtwGhDrQ5v`, `WLDaoDSyn3S6jlfq`).
- [O] Session management under `/me/settings/sessions`:
  - `GET /user/sessions`
  - `POST /user/sessions/{id}/revoke`
  - `POST /user/sessions/revoke-all {include_current}` (`-etth-pPUpwyls9R`)
  - `/user/session-evaluation` [U: purpose]

### 1.5 Blocked / suspended / reactivate
- [O] The global error handler (`EQw-J7y6ceZcfV8J`) routes `isSuspendedUserError(r)` to `/reactivate` and `isBlockedUserError(r)` to `/blocked`.
- [O] The `/blocked` page (`526bAdktSej_QYvi`):
  - Reads `{status:'blocked'|'suspended'|'unknown', detail:{email, reason, appeal_applied_at}}`, or falls back to `GET /user` fields `suspended_at` and `blocked_at`.
  - Offers an **appeal form**: `POST /antifraud/appeal` (FormData `email`, `text`, optional `image`; at most 2 MB; pdf/png/jpeg).
  - Also offers sign-out (`trackLogoutClicked('blocked_account','/blocked')`).
- [O] **Suspension is user-initiated**, a self-service pause or deactivation (`_UKPDvaFoUV7_Ti-`): `PUT /user/suspend`, `GET /user/suspend/allowed`, with a reasons checklist. `/user/unsuspend` exists as a path literal.
  - [I] `/reactivate` (`w--FXXg-R44o8gYb`) calls unsuspend.
- [O] Card verification gate: when `is_limited` is true, the app redirects to `/verify-card` (`1YQj3gga9YuMi5JH`). The path `/card-verification/{}` also appears. [I] This is an anti-abuse step for free or trial users.

---

## 2. Organizations, workspaces, members, roles, SSO

- [O] **Workspace = Clerk Organization.**
  - The invitation payload carries `clerkOrganizationId`, `workspaceId`, `recipientEmail` and `ssoEnabled:e.workspace.sso_enabled` (`WLDaoDSyn3S6jlfq`).
  - Clerk `orgId` is used together with `userId` as a cache key, for example `` `${userId}:${orgId}` `` in the payment flow.
- [O] Workspace types and plans:
  - `to=new Set([\`free\`,\`team\`,\`scale\`,\`enterprise\`])` (`2MNHP7SGhNLVJV4s`), plus a variant that includes `lite`.
  - The workspace record carries `plan_type`, `billing_period`, `workspace_type`.
- [O] Settings routes under `/me/settings/_team/`, with chunks:

  | Route | Chunk |
  |---|---|
  | `organization` | `Xm_gcLzo3pVxog6l` |
  | `members` | `nc4LVFnXz8U6MWpc` |
  | `billing` | `getF7-eAZbbuC_nx` |
  | `sub-workspaces` | `TQi1uaMrebgBFkNT` |
  | `unlimited-access-history` | `gBGDYxI2ONLnG07K` |

  Other paths: `/me/settings/team/{profile,settings,usage}`, `/enter-team`, `/accept-invitation`.
- [O] Workspace API (from `paths.txt` and chunk contexts):
  - Core: `/workspaces`, `/workspaces/accessible`, `/workspaces/details`, `/workspaces/context`, `/workspaces/settings`, `/workspaces/profile`, `/workspaces/leave`, `/workspaces/transfer-ownership`.
  - Members: `/workspaces/members`, `/workspaces/members/former`, `/workspaces/members/{id}/role` (PATCH `{role}`), `/workspaces/members/{id}/spend-pause`, `/workspaces/members/{id}/unlims` (POST `{bundle_type}`), `/workspaces/members/usage-stats(/download)`.
  - Invites and seats: `/workspaces/invites` (POST `{email_addresses:[...],role:'member',group_id,invite_redirect_url:origin+'/accept-invitation'}`), `/workspaces/invites/import` (CSV), `/workspaces/groups`, `/workspaces/groups/restrictions`, `/workspaces/add-seats`.
  - Capabilities: `/workspaces/capabilities`, `/workspaces/admin-capabilities` (GET/PUT `{title,is_enabled}`).
  - Other: `/workspaces/contact-sales`, `/workspaces/supercomputer-safety`, `/api/workspace-members-template`.
- [O] **Workspace roles**: `e.Owner=\`owner\`,e.Admin=\`admin\`,e.Member=\`member\`,e.Billing=\`billing\``.
  - Member status values include `pending` and `active`.
  - The role picker offers `admin`, `member` and `billing` (`0554jjL8Rk7SIhiA`). The owner changes only through transfer-ownership.
- [O] **Project-level roles and permissions** are separate: `e.Owner=\`owner\`,e.Admin=\`admin\`,e.Collaborate=\`collaborate\`,e.View=\`view\`,e.Banned=\`banned\`,e.Pending=\`pending\``.
  - The permission map in `Q1vKcBlBoEe73OpP` includes `"project.editDetails":{capabilities:[\`edit_project_settings\`]}`, `"project.manageRolePermissions":{capabilities:[\`manage_role_permissions\`]}`, `"project.transferOwnership":{ownerOnly:!0}`, `project.viewUsage`, and `project.publish`.
- [O] **Sub-workspaces** (`E-utpVXOpGnlRwDV`):
  - Endpoints: `D=\`/workspaces/sub-workspaces\``, `.../{id}/detach`.
  - Credit allocation schema: `{amount, pending_amount, period:[one_time|daily|weekly|monthly], duration_count, next_at, ends_at}`.
- [O] **Enterprise SSO configuration** (`81M0oePEzm4BIy4k`):
  - Endpoints: `GET/POST /workspaces/sso/saml`, `/workspaces/sso/saml/{id}`, `GET/POST /workspaces/sso/oidc {domain, client_id, client_secret}`, `GET/POST /workspaces/sso/domains` (domains carry a verification state).
  - Error codes: `sso_connection_already_exists`, `sso_connection_not_found`, `sso_domain_not_allowed`, `sso_clerk_error`.
  - A debug page `/debug/sso-domains-field` (`b7RhBC1u-jJgOS7G`) documents the `GET /workspaces/sso/domains` field.
- [O] **Team/Scale feature gating keys** are tied to upgrade/enterprise modals: `sub_workspaces`, `sso_setup`, `role_credit_limits`, `pause_member`, `member_groups`, `assign_admins`, `csv_import`, `export_reports`, `detailed_analytics`, `dedicated_capacity`, `usage_rights`.
  - Modal statuses: `team_seat_cap_scale_upgrade`, `scale_seat_limit_enterprise_offer`, `legal_protection_*_enterprise_offer`, `credit_capacity_enterprise_offer`, `team_concurrency_scale_upgrade`, `team_member_overuse_scale_upgrade`, and others.
  - Each modal has `contactOwnerRoles:[\`admin\`]`. [I] Non-admins are told to contact an admin or owner.
- [O] **Member credit requests** use these codes: `credit_request_created`, `..._approved`, `..._denied`, `..._forbidden`.
- [O] The team cancellation request is `POST /subscriptions/team/cancel-request`.

---

## 3. Monetization

### 3.1 Payment processor: Stripe
- [O] Stripe live key: `loadStripe(\`pk_live_51R4agDCmk0pn4HuHroiCEQJB0e2XHmUvRVWfDaqIL7t8WWJGKQetMUlyS6TjuZsP1EO1Eof0m59yHycIk9Q2XbsP00pnC0Ofo2\`, {betas:[\`custom_checkout_payment_form_1\`]})` (`h5vztXJMhsSKV3lQ`, `IpYj22Sk6GSnEG3-`).
- [O] An embedded custom checkout uses the Stripe Checkout Elements SDK: `r.initCheckoutElementsSdk(n)` / `initCheckoutFormSdk` (`Twnghhkvp-AyMjhP`).
  - Express checkout order: `paymentMethodOrder:[\`applePay\`,\`googlePay\`,\`link\`]`; `amazonPay` also appears (`5p5L2hJZPD0wSNfk`).
  - The Stripe appearance theme uses accent `colorPrimary:#D1FE17`.
- [O] Redirect checkout: many mutations return `checkout_url`, and the client sets `window.location.href=checkout_url`. This covers gifts, MCP and unlim trials, and plan changes.
  - The client treats returning referrers `checkout.stripe.com`, `*.stripe.com` and `*.stripe.network` as a Stripe return.
- [O] Workspace billing uses the Stripe **customer portal**:
  - Endpoints: `/workspaces/subscription/portal-link`, `/workspaces/subscription/try-charge-then-portal-link`, `/workspaces/subscription/billing-info-link`.
  - The URL allowlist is `In=new Set([\`billing.stripe.com\`])` (`Csuzqb8Cdag7tAbr`).
  - Invoice states: draft, open, paid, failed, void, uncollectible, partially_paid.
- [O] The `/payment` route (`T7esOq__RsDV7NrW`, schema in `y0bqVS9zM6_KPTsp`) takes query params:

  ```
  price_id, product_id, plan_type, plan_name,
  billing_period ∈ {monthly, quarterly, annual, eighteen_month, two_year, one_time},
  amount, final_amount, currency, success_url, cancel_url, checkout_attempt_id
  ```

- [O] Checkout telemetry and correlation (`6_6x355X099YGNI2`): `checkout_journey_id`, `checkout_attempt_id`, `stripe_checkout_session_id`, decline codes.
- [O] Churn and cancel flows use **Churnkey**:
  - `GET /churnkey/auth` (`3WAZIBI-Eb3EH3eD`), the Churnkey modal (`#ck-cf-modal`), a custom header, and translations of Churnkey copy.
  - Event: `subscription_cancel_churnkey_final_confirmation`.
  - Related endpoints: `/subscriptions/pause`, `/subscriptions/resume`, `/subscriptions/cancel`, `/subscriptions/cancel-upsell`, `/subscriptions/cancellation-reminder`, `/subscriptions/renew`.
  - Routes: `/me/settings/cancel`, `/renew`.
- [O] No Paddle, Chargebee, Adyen, Solidgate or PayPal code was found.

### 3.2 Plans / tiers
- [O] Full enum (`BwY8KR1JB6z7RgJN`, `y0bqVS9zM6_KPTsp`): `free, lite, basic, starter, plus, pro, creator, max, ultra, ultimate, team, scale, enterprise`, plus the pseudo-plan `two_day_offer`.
- [O] The individual plans have gone through several generations:
  - Legacy order: `$f=[\`free\`,\`basic\`,\`pro\`,\`ultimate\`,\`creator\`]` (`F7sjVJwm9gd3MaWn`).
  - Current upgrade map (`8ZEVr5jnm8lc1gd-`): `Mi={free:[basic,plus,ultra,team], ..., pro:[plus,ultra,team], creator:[ultra,team], ultra:[ultra,team], team:[team]}`, `Ni=[basic,plus,ultra,team]`, default period `annual`.
  - A/B pricing arms: `[\`basic\`,\`starter\`,\`pro\`,\`max\`]` (plan-select test), `[\`pro\`,\`max\`]` (max arm), `[\`ultimate\`,\`creator\`]` (otherwise) (`8wBZrgSAyp9IDdU8`).
  - Business plans: `team`, `scale`, `enterprise`. Enterprise uses `/workspaces/contact-sales` and `https://higgsfield.ai/enterprise`.
- [O] Pricing data is remote config, not hardcoded:
  - `https://pricing.higgsfield.ai/v2/pricing-config?planVersion=${v}&locale=${l}` (`LANTiUtVkXntR7Bt`)
  - Upsell offers: `https://pricing.higgsfield.ai/v2/pricing-config/upsell-offers?bundle_type=...`
  - Plan cards and packages: `/subscriptions/plan-cards`, `/subscriptions/v2/packages`
  - Gift pricing version: `hn(\`v2_b\`)`
- [O] Only mock prices appear, in the MCP plan-set mock (`4lDLn3LIA4KFBGjr`, active when `NEXT_PUBLIC_MCP_TRIAL_MOCK==='1'`):
  - Plus: 1,200 credits, $49/mo, annual shown as $29.
  - Ultra: 6,000 credits, $250 list, $174/mo, annual shown as $134.
  - [I] These are illustrative fixtures and may not be live prices.
- [O] **Checkout-first** (`/checkout-first/<uuid>`, nine landing variants, plus `/checkout-first/return`):
  - The user pays before an account exists.
  - Config: `{variant:'plans', endpoint:'/subscriptions/checkout-first/plans', selections:[Starter 200 credits/mo, Plus 1,000 credits/mo, Ultra 3,000 credits/mo]}` (`wgRTVI_CDM0QjoKZ`).
  - Return URL: `/checkout-first/return?session_id={CHECKOUT_SESSION_ID}`.
  - After return, the page shows a `check-email` view or consumes `__clerk_ticket` to sign the new user in, then checks `passwordEnabled` before continuing. [I] The backend creates the Clerk user from the Stripe email and emails a sign-in ticket.
- [O] Plan change: `POST /subscriptions/change {..., plan_version}` returns proration fields (`due_on_renewal_amount`, `renewal_date`, `tax_amount`, `checkout_url`) (`Bn3hg2iutruNsXKd`).
  - Related: `/subscriptions/update`, `/subscriptions/invoices`, `/subscriptions/plans/setup/pair`.
- [O] Team checkout: `POST /workspaces/create-checkout-session` (`gvNT5v_02ZpSR-R-`). Seats are added through `/workspaces/add-seats`.

### 3.3 Credits
- [O] The user has three credit balances: `subscription_credits`, `package_credits` and `bonus_credits`.
  - Shown remaining credits are `credits_left: a.subscription_credits + a.package_credits`.
  - `total_plan_credits` and `daily_credits` exist. Generation requests carry `meta:{use_unlimited, use_free_daily_credits}`.
- [O] **Credits are stored in hundredths in the API.** Package fetch: `credits:e.credits/100, amount:e.amount/100, tax_amount:e.tax_amount/100` (`weJ-0udV_AMyPux_`, `D8xGg2iI28tu_W7N`).
- [O] Credit packages and top-ups:
  - Individuals: `/subscriptions/v2/packages`, `/subscriptions/packages/instant` (one-click), `/subscriptions/v2/adjustable-credits` (slider).
  - Workspaces: `/workspaces/wallet`, `/workspaces/wallet/purchase-credits`, `/workspaces/credit-price`, `/workspaces/wallet/auto-top-up` (+ `dry-run`, `invoices`, `retry-payment`, `disable`).
  - Analytics events: `CREDIT_PACKAGE_SELECTED` with `package_credits`, `package_price` and `package_type`.
- [O] Usage reporting:
  - Workspace ledger: `/workspaces/credit-ledger` (+ `usage-chart`, `usage-history`, `statistics`), `/workspaces/credit-spent-overview`, `/workspaces/usage-overview`.
  - Pages: `/me/settings/usage`, `/me/settings/credits-usage`.
  - Concepts: `credit_rollover`, `credits_exhausted`, `not_enough_credits`, `out_of_credits`.
- [O] Other credit-like currencies:
  - Concurrency boost: `/concurrent-boost-credits/{state,products,purchase,enable,disable}`, `not_enough_boost_credits`.
  - Generation seconds: `/generation-seconds/purchase`, `/user/generation-seconds`.
  - Free generations: `/user/free-gens/v2?surfaces=...`.
  - Karma: `/karma/balance`.
- [O] **MCP credits and pricing.** `/mcp-credits(/$id)` and `/mcp-pricing(/$id)` are redirect routes (`R_Mns9Sc00Zut2iq`):

  ```js
  k(e){return e===`credits`?`/me/settings/subscription`:`/pricing`}
  // query gets from=mcp; with $id it first switches to workspace $id (enterTeam flow 'mcp-<target>')
  ```

  - MCP plan set: `plan_set_key:\`mcp\``. Bundle: `mcp_all_unlim`. MCP free trial runs through the OAuth consent page.
  - Endpoints: `https://mcp.higgsfield.ai/mcp`, `https://bridge.higgsfield.ai/mcp`.

### 3.4 Unlimited modes
- [O] Per-model "unlimited" bundles:
  - Bundle types: `seedance_unlimited`, `seedance_2_unlimited`, `seedance_mini_unlimited`, `kling_3_unlimited`, `gpt_image_2_unlimited`, `nano_banana_pro_unlimited`, `all_unlim`, `free_all_unlim`, `free_trial_all_unlim`, `mcp_all_unlim`.
  - Resolution tiers: `seedance_2_720p/1080p/4k`, `nano_banana_2_2k/4k`.
- [O] Unlimited APIs:
  - Catalog and purchase: `/subscriptions/bundle/unlim-catalog`, `/subscriptions/bundle/unlim/{id}`, `/subscriptions/bundle/purchase/instant/unlim`, `/subscriptions/bundle/purchase/instant/seedance-unlimited`, `/subscriptions/bundle/all-unlim/status`.
  - Modal and history: `/unlim-bundle-modal(/shown)`, `/unlims/{history,usage}`.
  - Workspaces: `/workspaces/unlim-activations`, plus per-member unlim assignment.
  - History route: `/me/settings/unlimited-access-history`.
  - Help-center slug: "what-are-unlimited-models-and-which-plans-include-them".

### 3.5 Trials, offers, referrals, gifts, promos, upsells
- [O] **Free trial:**
  - Routes: `/payment/free-trial` (`Woan3iTqMQJDrwLL`).
  - API: `/free-trial/{start,status,convert,cancel,downgrade-plan}`.
  - A separate unlim trial uses a `checkout_url` redirect with `unlimTrialKind` and `plan_set_key` (`4iKMVphD9RjxNkXK`).
- [O] **Special and limited offers:**
  - Routes: `/special-offer` (`ZbX-BLQga9iwo1hm`), `/offer/$ref`, `/pricing/offer/`, `/seedance-2-5-retention-offer`.
  - Two-day offer: `/two-day-offer`, `/two-day-offer/purchase`, `/two-day-offer/link`, `/two-day-offer/mark-modal-viewed` (`JAmPQIaT8SLClIId`).
  - Server-driven offers: `/user/offers` (+ `/{id}/expire`, `/{id}/skip`), `/user/personal-promo` (+ `chase`, `restore`, `tasks`), `/user/credit-package-discount`, `/user/credit-package-chase`, `/credit-reset-bonus/claim`.
- [O] **Upsell engine:**
  - `/upgrade-nudges?workspace_id=` returns `{nudges, has_unseen, context:{can_upgrade, plan_tier}}`. Related: `/upgrade-nudges/seen`, `/upgrade-nudges/signals`.
  - Upsell offer triggers (debug page `qZA3oqd6g9YpKE10`): `day_0`, `credits_50` (50% credits used), `pricing_view` (closed pricing). Example bundle: `team_monthly_to_scale_upgrade_bundle`.
  - Add-on, upgrade and annualization bundles include `plus_monthly_addon_stack`, `ultra_3k_to_9k_monthly_upgrade`, `pro_monthly_annualization`, `starter_200_monthly_to_plus_v49_upgrade_bundle`.
  - Debug routes: `/debug/upsell`, `/user/upsell-experiment/debug`.
- [O] **Plan gating from backend errors** (`8ZEVr5jnm8lc1gd-`): `Li={minimum_basic_plan_required:'basic', job_minimum_pro_plan_required:'pro', job_ultimate_plan_required:'plus', job_minimum_creator_plan_required:'ultra', cron_job_limit_reached:'ultra'}`. Each code maps to the minimum plan shown in the upgrade modal.
  - Other gating codes: `insufficient_access`, `upgrade_required`, `workspace_subscription_inactive`, `rate_limit_reached`.
  - `/user/features` returns booleans such as `has_seedream_batch_gens` and `has_nb_bonus_seedream_free_gens`.
- [O] **Referrals:**
  - Native program: `/referral` (GET/POST/PATCH), `/referral/claim`, `/referral-campaigns/{links,state,gifts,gifts/{id}/claim,redeem,referee}`, `/user/referral-touches`. UI at `/me/settings/referrals` (`YTrl7f_S6orslrb4`).
  - Affiliates use **FirstPromoter**: `Qm=\`fsqfd3yy\`` (cid), `https://cdn.firstpromoter.com/fpr.js`, `fpr('init',{cid})`, with cookies `_fprom_ref` and `_fprom_tid`.
- [O] **Gifts:**
  - Routes: `/gift`, `/me/settings/gift` (`1fi0JqygpgGi_DE5`).
  - API: `/gifts/packages`, `/gifts/packages/instant`, `/gifts/batch`, `/gifts/batch/preview`, `/gifts/batch/pricing`, `/gifts/status`, `/gifts/concurrent-boost/instant`.
  - Checkout uses a Stripe redirect: `payment_method:\`stripe_redirect\``, `product:\`gift\``.
- [O] **Promo codes:** `POST /promotion/code` (`Lhv8uJnx9re7krcq`). Result types include `extra_credits` and `free_plan`. The error `promo_code_checkout_in_progress` also exists. UI at `/me/settings/promo`.

---

## 4. Analytics, telemetry, consent, experiments

- [O] **PostHog is the analytics and error-tracking backend:**
  - Key `tg=\`phc_nAcCHDBUspNpjMXoEt7RUffSwfjsVsYAPVwEeHAfsWEd\``, first-party proxied host `ng=\`https://higgsfield.ai/api/i\``.
  - Every chunk injects `_posthogChunkIds` for stack symbolication. Exceptions are captured as `$exception`.
  - The SDK lives in `KsvGwZngVXNFynU-` and includes PostHog's Sentry-integration fields.
- [O] **Amplitude tracking plan (Ampli) is routed to PostHog.** The main bundle has Ampli-generated event classes (`this.event_type=\`apps_page_open\``, …, `upsellClicked`, `upgradeOfferUpgradeClick`). Its transport is PostHog: `track(e){...return{promise:Sg.capture(n,{...r},i)}}`, where `Sg` is the PostHog wrapper.
  - The cookie notice still lists Amplitude `AMP_*` and `AMP_MKTG_*` cookies.
  - [I] Amplitude was the earlier vendor, or is loaded elsewhere. [O] No Amplitude SDK or endpoint (`api2.amplitude.com`) is in the bundles.
- [O] **Sentry:** no Sentry SDK and no DSN. The only hits are PostHog's `SentryIntegration` and leftover `sentry:{rendererSection:...}` config keys.
- [O] **Datadog:** none. `dd.higgsfield.ai` is a **DataDome** endpoint (see §1.2). No `datadoghq` or RUM code was found.
- [O] **Google Analytics 4**, loaded in `index.html`: `G-THH13P18SS` through `window.__hfLoadGtag`, gated by `ga-disable-...`. Click IDs (gclid, fbclid, ttclid, msclkid and others) are stripped or normalized by an inline script.
- [O] **Consent is managed by Securiti.ai** (`jCvphhIoPfzXpCEq`):
  - Hosts: `Hm=\`https://cdn-prod.securiti.ai\``, `Um=\`https://app.securiti.ai\``. IDs: `Bm=\`d5cd9017-5f8d-424c-bcf6-60e2f7c90d2f\``, `Vm=\`4fbe0ff0-b1cb-41ad-be6b-389229e23efa\``.
  - Categories: "Analytics & Customization", "Performance & Functionality", "Advertising".
  - Callbacks used: `onGpcDetected`, `onConsentGiven`, `onGCMConsentGiven` (Google Consent Mode).
  - A consent decision switches analytics between `full` and `no-consent`, then logs `{decision, cmp:'securiti'}`.
  - Server-side consents: `/user/consents/accept`, `/user/settings/{media,audio,character-sheets,supercomputer-llm}-consent`.
  - The cookie inventory is at `/cookie-notice` (`iMf2NACEVp2Vgrtp`).
- [O] **Feature flags and experiments use GrowthBook:**
  - `apiHost:\`https://cdn.growthbook.io\`,clientKey:\`sdk-xvw0BRhZqdyIJWy\`,decryptionKey:\`ZowSD058cjcD8tyBJ1qWIA==\``, with `LocalStorageStickyBucketService({prefix:'gb_sticky_'})` and `autoAttributesPlugin`.
  - Attributes: env, country, deviceId (`$$__device-id`), userId, experiment (`free_video_test_t1`).
  - GrowthBook initializes only after performance or analytics consent.
- [O] Example experiment and flag keys: `pricing-ab-test` (pricing_v1/pricing_v2), `pricing-pro-hide`, `multi-step-mobile-checkout`, `biometric-consent-new`, `business-unlim-card-section`, `business-unlim-enterprise-section`, `cs4-mode-island`, `zh-i18n-ab`, `keyframe-access`, `wan26-audio-access`, `soul-canvas`, `soul-image-reference`, `layers-nano-banana-2`, `success-url`.
  - Static local model flags: `{"kling-o1":!0,"cinematic-studio":!0,"soul-v2":!0,"kling-v3-and-o3":!0, canvas:null, supercomputer:null, ...}`.
  - Server flags come from `/user/features`.
- [O] Flagsmith appears only inside the vendored Dyte / Cloudflare Realtime SDK (`ZECI8s_dwDxymZdy`). Higgsfield does not use it directly.

---

## 5. Unknowns and limits
- [U] User-facing copy, including plan descriptions and prices, cannot be read: it lives in message catalogs and in remote `pricing.higgsfield.ai` config that was not fetched.
- [U] The endpoints of `fnf-device-auth.higgsfield.ai` are not known. The web `/device` page is a static deprecation notice.
- [U] The exact seat limits for Team and Scale are not known. They come from constants (`n.max`, `r.max`) in another module that was not resolved.
- [U] Whether Amplitude is still loaded by a tag manager or server-side is unknown. The bundles contain only Ampli wrappers that send to PostHog.
- [U] Backend enforcement of credits and gating is not visible. Only the client's handling of error codes is.
