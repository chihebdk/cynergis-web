'use client';
/* ============================================================
   THE GUIDED TOUR — the script.
   Data only: the engine navigates, highlights and paces.

   Each step:
     id      stable slug (also the deep link's readable handle)
     where   the breadcrumb line — where in the product we are
     title   the one thing this step says
     body    the explanation (plain language, no DDD jargon)
     doIt    the invitation to click something (optional). Clicking
             is never required: every step navigates itself, so a
             visitor who only presses "Next step" still sees it all.
     nav     the app state this step needs (same shape the UI pushes)
     text    anchor by VISIBLE TEXT — survives rails gaining entries
     sel     anchor by selector; an array is tried in order
     within  scope the anchor search to this container
     settle  ms to wait before looking (async canvases)
   ============================================================ */

const CLAIMS = { v: 'org', sub: 'meridian', dom: 'DOM-CLAIMS' };
const PROD = { v: 'prod', pf: 'DOM-CLAIMS', prod: 'PROD-CLAIMSCORE' };
const RAIL = '.asc-rail';
/* Verified against the rendered JSX. Two facts shaped these: the flow canvas's
   expand button carries NO class (attribute selector only, and its label flips
   to "Collapse" once open), and the Tree/Org toggle is rendered by the vendored
   @flowai/canvas package — it returns null when a canvas offers a single
   layout, so every step that points at it lists a fallback. */
const EXPAND_FLOW = '.cyn-flow-embed button[aria-label="Expand"]';
const EXPAND_GRAPH = '.asc-graph-fsbtn';
const LAYOUT = '.flowai-layout-toggle';

export const TOUR_STEPS = [
  /* ---------- the enterprise: how the place is organised ---------- */
  {
    id: 'welcome',
    where: 'Meridian Auto Insurance',
    title: 'A short walk through the demo',
    body: <>This is a working model of how one enterprise organises itself and builds software — an auto insurer called Meridian. We will start at the top of the organisation and end at a live go-forward decision, following one product the whole way.<br /><br />Everything is navigated from the <b>panel on the left</b>. It changes depending on where you are.</>,
    doIt: 'Click anything you like as we go — the tour never takes the wheel away from you. Press "Next step" when you are ready.',
    nav: { v: 'org', sub: 'meridian' },
    sel: [RAIL],
  },
  {
    id: 'domains',
    where: 'Organization',
    title: 'Domains are the parts of the business',
    body: <>A <b>domain</b> is a slice of the business that owns its own outcome — claims, pricing, distribution, billing. It holds the budget, the teams and the decisions for that slice. Domains are how the work is <i>divided</i>.<br /><br />Meridian has six. Claims is the one we have modelled all the way down.</>,
    doIt: 'Click "Domains" and look through the list.',
    nav: { v: 'org', sub: 'domains' },
    text: 'Domains',
    within: RAIL,
  },
  {
    id: 'chapters',
    where: 'Organization',
    title: 'Chapters are the crafts the people belong to',
    body: <>A <b>chapter</b> is a community of a single craft — engineering, product, design, data — that spans every domain. People deliver inside a domain team but grow inside a chapter.<br /><br />Two axes, then: domains deliver value, chapters develop the people.</>,
    doIt: 'Click "Chapters" to see the rosters, then come back.',
    nav: { v: 'org', sub: 'chapters' },
    text: 'Chapters',
    within: RAIL,
  },
  {
    id: 'open-claims',
    where: 'Organization › Domains',
    title: 'Start from a domain — open Claims',
    body: <>Pick the domain you want to understand and everything narrows to it: its structure, its funding, its subdomains and the products it ships.<br /><br />We are going into <b>Claims</b>.</>,
    doIt: 'Click the Claims domain.',
    nav: { v: 'org', sub: 'domains' },
    sel: ['.ovw-domcard'],
    text: 'Claims',
  },

  /* ---------- the domain: from org chart to a product ---------- */
  {
    id: 'claims-domain',
    where: 'Claims',
    title: 'Inside a domain',
    body: <>The left panel has changed: it now describes <b>Claims</b>. Structure is the teams, Funding &amp; review is the money and the quarterly decision, Subdomains are the business areas the domain breaks into, and the two maps show how those areas talk to each other.</>,
    doIt: 'Click a few of these — Structure, Subdomains, Context map — then carry on.',
    nav: CLAIMS,
    sel: [RAIL],
  },
  {
    id: 'portfolio',
    where: 'Claims',
    title: 'The product portfolio',
    body: <>A domain delivers through <b>products</b>. This is the list of what Claims ships, with the lifecycle phase each product has reached.</>,
    doIt: 'Click "Product portfolio".',
    nav: { ...CLAIMS, dtab: 'portfolio' },
    text: 'Product portfolio',
    within: RAIL,
  },
  {
    id: 'open-product',
    where: 'Claims › Product portfolio',
    title: 'Open ClaimsCore',
    body: <><b>ClaimsCore</b> is the claims modernisation product, and the one that is worked through end to end in this demo. Opening it leaves the organisation view and enters the product itself.</>,
    doIt: 'Click "open the product page →" on the ClaimsCore card.',
    nav: { ...CLAIMS, dtab: 'portfolio' },
    sel: ['.mer-prod'],
    text: 'ClaimsCore',
  },

  /* ---------- the product: six phases ---------- */
  {
    id: 'phases',
    where: 'ClaimsCore',
    title: 'A product moves through six phases',
    body: <><b>Envision</b> frames the problem. <b>Discover</b> learns what users need. <b>Design</b> decides the shape of the solution. <b>Build</b> makes it real. <b>Operate</b> runs it. <b>Realize</b> asks whether it was worth it.<br /><br />Nothing to click here — just notice that the whole lifecycle is one continuous record, not six disconnected documents.</>,
    nav: { ...PROD, phase: 'Envision', entry: 'overview' },
    sel: ['.env-lifebar'],
  },
  {
    id: 'phase-rail',
    where: 'ClaimsCore › Envision',
    title: 'The left panel is always the way in',
    body: <>Each phase fills the left panel with its own working entries. In Envision those are the problem, the value hypothesis, the sizing, the success metrics and the exit decision.<br /><br />That is the rhythm of the whole app: <b>pick the phase, then pick the entry on the left</b>.</>,
    doIt: 'Click through a couple of Envision entries.',
    nav: { ...PROD, phase: 'Envision', entry: 'overview' },
    sel: [RAIL],
  },

  /* ---------- Discover ---------- */
  {
    id: 'discover',
    where: 'ClaimsCore › Discover',
    title: 'Discover — who we are building for',
    body: <>Personas, stakeholders, journeys, use cases, requirements and policies. This phase is where the demand is written down, and everything later in the product traces back to it by id.</>,
    doIt: 'Click a few entries on the left — Personas, Use cases, Functional requirements.',
    nav: { ...PROD, phase: 'Discover', entry: 'personas' },
    sel: [RAIL],
  },
  {
    id: 'journeys',
    where: 'ClaimsCore › Discover',
    title: 'User journeys',
    body: <>A journey is the customer's path through a claim, told as the customer experiences it — not as the systems see it. These journeys are what the Design phase later storms into events.</>,
    doIt: 'Click "User journeys", then open one and read it through.',
    nav: { ...PROD, phase: 'Discover', entry: 'journeys' },
    text: 'User journeys',
    within: RAIL,
  },

  /* ---------- Design ---------- */
  {
    id: 'design',
    where: 'ClaimsCore › Design',
    title: 'Design — deciding the shape',
    body: <>Four entries, in the order the work actually happens: storm the <b>business processes</b>, decompose them into <b>bounded contexts</b>, map how those contexts talk on the <b>context map</b>, then lay the whole thing out as a <b>system design</b>.</>,
    doIt: 'Click between Bounded contexts, Context map and System design to get a feel for them.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts' },
    sel: [RAIL],
  },
  {
    id: 'business-process',
    where: 'ClaimsCore › Design',
    title: 'Business processes',
    body: <>Each business process is stormed as a timeline of things that happen — the orange cards are events, and they are the raw material everything else is derived from.</>,
    doIt: 'Open "Have my claim handled".',
    nav: { ...PROD, phase: 'Design', entry: 'journeys' },
    text: 'Have my claim handled',
    settle: 400,
  },
  {
    id: 'canvas',
    where: 'ClaimsCore › Design › Business processes',
    title: 'Expand the canvas and move around it',
    body: <>The diagram can take the whole page, which is how you would actually read it. Inside it you can switch the layout and inspect any single card.</>,
    doIt: 'Expand the diagram to full page, switch the layout between Tree and Org, then hover a node to see what it holds.',
    nav: { ...PROD, phase: 'Design', entry: 'journeys' },
    /* the canvas exists only once a process is open — open it, so a visitor who
       only presses "Next step" still gets the diagram */
    preClick: { sel: ['.mer-sub'], text: 'Have my claim handled' },
    sel: [EXPAND_FLOW, LAYOUT, '.cyn-flow-embed'],
    settle: 1200,
  },
  {
    id: 'contexts',
    where: 'ClaimsCore › Design',
    title: 'Bounded contexts — the boxes the work splits into',
    body: <>A <b>bounded context</b> is a part of the business with one consistent language and one team that owns it. Claims splits into seven: intake, adjudication, repair, payments, total loss, recovery and accident benefits.<br /><br />The walls matter: inside one, a word means exactly one thing.</>,
    doIt: 'Click "Bounded contexts", then open Claim adjudication.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts' },
    text: 'Claim adjudication',
  },
  {
    id: 'adjudication',
    where: 'Design › Claim adjudication',
    title: 'Inside one box',
    body: <>This is the most complete box in the demo. Its left panel holds everything a team needs to build it: the life story of a claim file, the data it owns, its rules, its tests, its handoffs and its open questions.<br /><br />The event flow is the picture; the entries on the left are the detail behind it.</>,
    doIt: 'Try the layout switch on the diagram, and open a couple of entries on the left.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'flow' },
    sel: [EXPAND_FLOW, LAYOUT, '.bc-rail'],
    settle: 700,
  },
  {
    id: 'agents',
    where: 'Design › Claim adjudication › Agents',
    title: 'Every box has agents',
    body: <>Two kinds. The <b>domain agent</b> knows this box's model and answers questions about it. The <b>operations agent</b> does the running work — with named skills, explicit permissions and evaluations that say whether it can be trusted.<br /><br />This is where the knowledge graph stops being documentation and starts being something software uses.</>,
    doIt: 'Read the domain agent, then switch to the operations agent.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'agent' },
    sel: ['.coa-switch', '.coa'],
    settle: 300,
  },
  {
    id: 'knowledge-graph',
    where: 'Design › Claim adjudication › Knowledge graph',
    title: 'The whole box as a graph',
    body: <>Every element on those pages is a node with a real id, and every link is a typed fact — so the agent can answer by walking the graph instead of guessing. Click a node to see what it connects to, and use its id to jump to the page where it is defined.</>,
    doIt: 'Click a node, then follow it back to the page that defines it.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'kg' },
    sel: [EXPAND_GRAPH, '.asc-gnode', '.kg-stats'],
    settle: 900,
  },
  {
    id: 'context-map',
    where: 'ClaimsCore › Design › Context map',
    title: 'The context map — how the boxes talk',
    body: <>One picture of all seven boxes and the agreements between them. Every arrow is a contract with a name, a shape and a promise; no box reaches into another's data.</>,
    doIt: 'Expand it, switch the layout, and double-click a box to jump into it.',
    nav: { ...PROD, phase: 'Design', entry: 'contextmap' },
    sel: [EXPAND_FLOW, LAYOUT, '.cyn-flow-embed'],
    settle: 900,
  },
  {
    id: 'system-design',
    where: 'ClaimsCore › Design › System design',
    title: 'System design',
    body: <>The same model laid out as a system: the surfaces, the stores, the streams and the outside parties. Design decides this shape — Build then commits to it.</>,
    doIt: 'Move between the layouts here too.',
    nav: { ...PROD, phase: 'Design', entry: 'arch' },
    sel: [EXPAND_FLOW, LAYOUT, '.cyn-flow-embed'],
    settle: 900,
  },

  /* ---------- Build ---------- */
  {
    id: 'build-components',
    where: 'ClaimsCore › Build › Components',
    title: 'Build — the things that actually deploy',
    body: <>A <b>component</b> is a deployable unit. Note that boxes and components are not one-to-one: a box is never split across two components, but one component may carry several whole boxes. Modelling boundaries and operational boundaries are allowed to differ.</>,
    doIt: 'Open a component, then walk its tabs: Deployment, Resources, Environment variables and Secrets.',
    nav: { ...PROD, phase: 'Build', entry: 'components' },
    sel: ['.ddd-cmp-card', '.asc-section'],
    settle: 400,
  },
  {
    id: 'build-quality',
    where: 'ClaimsCore › Build',
    title: 'Tests verify the software, evals measure the agents',
    body: <>Two different questions, so two different places. <b>Tests</b> check that the deterministic behaviour matches what Discover asked for. <b>Evals</b> judge the agents — transcripts, scores and whether a skill is fit to promote.</>,
    doIt: 'Open Tests, then Evals.',
    nav: { ...PROD, phase: 'Build', entry: 'tests' },
    text: 'Tests',
    within: RAIL,
  },

  /* ---------- Operate ---------- */
  {
    id: 'operate',
    where: 'ClaimsCore › Operate',
    title: 'Operate — running it',
    body: <>Service levels and fleet health, the <b>incidents</b> when something breaks, the <b>approvals</b> that gate anything consequential, and the <b>runbooks</b> that say how to respond. Acts here are recorded, not silent.</>,
    doIt: 'Click Incidents, then Approvals, then Runbooks.',
    nav: { ...PROD, phase: 'Operate', entry: 'incidents' },
    sel: [RAIL],   // the step is about the rail entries it names, not one row
  },

  /* ---------- Realize ---------- */
  {
    id: 'value',
    where: 'ClaimsCore › Realize',
    title: 'Value realized',
    body: <>What the product actually returned, set against what Envision promised. The same numbers, the same ids, now measured instead of forecast.</>,
    doIt: 'Open "Value realized" and compare it with the outcomes against targets.',
    nav: { ...PROD, phase: 'Realize', entry: 'value' },
    text: 'Value realized',
    within: RAIL,
  },
  {
    id: 'decision',
    where: 'ClaimsCore › Realize',
    title: 'The go-forward decision — and that is the loop',
    body: <>Sustain, scale, pivot or retire, decided by named people on the evidence above — and the learning feeds straight back into Envision.<br /><br />That is the whole idea: one continuous record from the shape of the organisation down to a deployed component and back up to the decision about whether it paid off.<br /><br />Thanks for walking through it. You can restart the tour any time from the button in the corner.</>,
    nav: { ...PROD, phase: 'Realize', entry: 'decision' },
    text: 'Go-forward decision',
    within: RAIL,
  },
];

export default TOUR_STEPS;
