'use client';
/* ============================================================
   THE GUIDED TOUR — the script.
   Data only: the engine navigates, arms, gates and paces.

   Each step is ONE action:
     id      stable slug (also the deep link's handle)
     where   the breadcrumb line — where in the product we are
     title   the one thing this step says
     body    the explanation (plain language, no DDD jargon)
     click   the single control to arm: { sel?, text?, within?, inner? }.
             While it is armed, it is the ONLY live thing on the page.
             Clicking it is what moves the app.
     ask     the imperative shown beside the armed control
             (for a card, ALWAYS give click a nameSel: matching a
             card's whole text lets a sibling that merely mentions
             the name win — see resolve() in the engine)
     look    something to outline when there is nothing to click
     then    a line shown once the page has cleared, after the click
     ensure  a control to click on entry ONLY when `click` cannot be
             found — repairs deep links into a step whose target
             appears after something is opened
     allow   extra selectors that stay interactive in the cleared
             phase — for the canvases, where the invitation is to
             play with the layout rather than press one button
     nav     the page this step's control lives on. Applied on entry
             as a corrector: usually the visitor's own click already
             got us here.
     settle  ms to wait before looking (async canvases)
   ============================================================ */

const CLAIMS = { v: 'org', sub: 'meridian', dom: 'DOM-CLAIMS' };
const PROD = { v: 'prod', pf: 'DOM-CLAIMS', prod: 'PROD-CLAIMSCORE' };
const RAIL = '.asc-rail';
const BCRAIL = '.bc-rail';
const PHASE_SEG = ['.env-seg'];          // the six lifecycle segments
/* Verified against the rendered JSX: the flow canvas's expand button carries NO
   class (attribute selector only, and its label flips to "Collapse" once open),
   and the Tree/Org toggle comes from the vendored @flowai/canvas — it renders
   nothing when a canvas offers a single layout. Allowing the whole embed covers
   expand, layout and hover in one selector. */
const EXPAND_FLOW = '.cyn-flow-embed button[aria-label="Expand"]';
const CANVAS = '.cyn-flow-embed';

export const TOUR_STEPS = [
  /* ---------- the enterprise ---------- */
  {
    id: 'welcome',
    where: 'Meridian Auto Insurance',
    title: 'A guided walk through the demo',
    body: <>This is a working model of how one enterprise organises itself and builds software — an auto insurer called Meridian. We will start at the top and end at a live go-forward decision, following one product all the way down.<br /><br />Everything is navigated from the <b>panel on the left</b>, and it changes depending on where you are.</>,
    then: 'While the tour is running the page is yours to read and scroll, but only the highlighted control responds — so you cannot get lost.',
    nav: { v: 'org', sub: 'meridian' },
    look: { sel: [RAIL] },
  },
  {
    id: 'domains',
    where: 'Organization',
    title: 'Domains are the parts of the business',
    body: <>A <b>domain</b> is a slice of the business that owns its own outcome — claims, pricing, distribution, billing. It holds the budget, the teams and the decisions for that slice.<br /><br />Domains are one of two axes. The other is <b>chapters</b>: communities of a single craft — engineering, product, design, data — that span every domain. People deliver inside a domain team and grow inside a chapter.</>,
    ask: 'Click “Domains” in the left panel.',
    then: 'Meridian has six domains. Claims is the one modelled all the way down in this demo.',
    nav: { v: 'org', sub: 'meridian' },
    click: { text: 'Domains', within: RAIL },
  },
  {
    id: 'open-claims',
    where: 'Organization › Domains',
    title: 'Open the Claims domain',
    body: <>Pick a domain and everything narrows to it: its structure, its funding, the business areas it breaks into and the products it ships.</>,
    ask: 'Click the Claims domain card.',
    nav: { v: 'org', sub: 'domains' },
    click: { sel: ['.ovw-domcard'], nameSel: '.ovw-dc-top b', text: 'Claims' },
  },
  {
    id: 'claims-domain',
    where: 'Claims',
    title: 'Inside a domain',
    body: <>The left panel now describes <b>Claims</b>. Structure is the teams, Funding &amp; review is the money and the quarterly decision, Subdomains are the business areas, and the two maps show how those areas talk to each other.</>,
    nav: CLAIMS,
    look: { sel: [RAIL] },
  },
  {
    id: 'portfolio',
    where: 'Claims',
    title: 'The product portfolio',
    body: <>A domain delivers through <b>products</b>. This is what Claims ships, with the lifecycle phase each product has reached.</>,
    ask: 'Click “Product portfolio”.',
    nav: CLAIMS,
    click: { text: 'Product portfolio', within: RAIL },
  },
  {
    id: 'open-product',
    where: 'Claims › Product portfolio',
    title: 'Open ClaimsCore',
    body: <><b>ClaimsCore</b> is the claims modernisation product, and the one worked through end to end here. Opening it leaves the organisation view and enters the product itself.</>,
    ask: 'Click “open the product page →” on the ClaimsCore card.',
    nav: { ...CLAIMS, dtab: 'portfolio' },
    click: { sel: ['.mer-prod'], nameSel: '.mer-prod-top b', text: 'ClaimsCore', inner: '.mer-gatelink' },
  },

  /* ---------- the product ---------- */
  {
    id: 'phases',
    where: 'ClaimsCore',
    title: 'A product moves through six phases',
    body: <><b>Envision</b> frames the problem. <b>Discover</b> learns what users need. <b>Design</b> decides the shape. <b>Build</b> makes it real. <b>Operate</b> runs it. <b>Realize</b> asks whether it was worth it.</>,
    then: 'Each phase fills the left panel with its own working entries — pick the phase, then pick the entry. That is the rhythm of the whole app.',
    nav: { ...PROD, phase: 'Envision', entry: 'overview' },
    look: { sel: ['.env-lifebar'] },
  },
  {
    id: 'discover',
    where: 'ClaimsCore › Envision',
    title: 'Move to Discover',
    body: <>Discover is where the demand is written down — personas, stakeholders, journeys, use cases, requirements, policies. Everything later in the product traces back to it by id.</>,
    ask: 'Click “Discover” on the phase bar.',
    nav: { ...PROD, phase: 'Envision', entry: 'overview' },
    click: { sel: PHASE_SEG, text: 'Discover' },
  },
  {
    id: 'journeys',
    where: 'ClaimsCore › Discover',
    title: 'User journeys',
    body: <>A journey is the customer&apos;s path through a claim, told as the customer experiences it rather than as the systems see it. These are what the Design phase later storms into events.</>,
    ask: 'Click “User journeys”.',
    nav: { ...PROD, phase: 'Discover', entry: 'personas' },
    click: { text: 'User journeys', within: RAIL },
  },
  {
    id: 'design',
    where: 'ClaimsCore › Discover',
    title: 'Move to Design',
    body: <>Four entries, in the order the work actually happens: storm the business processes, decompose them into bounded contexts, map how those contexts talk, then lay the whole thing out as a system design.</>,
    ask: 'Click “Design” on the phase bar.',
    nav: { ...PROD, phase: 'Discover', entry: 'journeys' },
    click: { sel: PHASE_SEG, text: 'Design' },
  },
  {
    id: 'business-processes',
    where: 'ClaimsCore › Design',
    title: 'Business processes',
    body: <>Each business process is stormed as a timeline of things that happen. The event cards are the raw material everything else in Design is derived from.</>,
    ask: 'Click “Business processes”.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts' },
    click: { text: 'Business processes', within: RAIL },
  },
  {
    id: 'pick-process',
    where: 'Design › Business processes',
    title: 'Open one process',
    body: <>“Have my claim handled” is the spine of the whole product — first notice of loss through to the money leaving.</>,
    ask: 'Click “Have my claim handled”.',
    nav: { ...PROD, phase: 'Design', entry: 'journeys' },
    click: { sel: ['.mer-sub'], nameSel: 'h3', text: 'Have my claim handled' },
    settle: 400,
  },
  {
    id: 'expand-storm',
    where: 'Design › Business processes',
    title: 'Give the diagram the whole page',
    body: <>These diagrams are meant to be read at full size. Expanded, you can change how it is laid out and inspect any single card.</>,
    ask: 'Click the expand button on the diagram.',
    then: 'The canvas is live for this step: switch the layout between Tree and Org, hover a card to see what it holds, and press Esc or collapse when you are done.',
    nav: { ...PROD, phase: 'Design', entry: 'journeys' },
    click: { sel: [EXPAND_FLOW] },
    /* the canvas exists only once a process is open: normally step 13's click
       did that, but a deep link or Back lands here with nothing open */
    ensure: { sel: ['.mer-sub'], nameSel: 'h3', text: 'Have my claim handled' },
    allow: [CANVAS],
    settle: 1200,
  },
  {
    id: 'contexts',
    where: 'ClaimsCore › Design',
    title: 'Bounded contexts — the boxes the work splits into',
    body: <>A <b>bounded context</b> is a part of the business with one consistent language and one team that owns it. Claims splits into seven. Inside one, a word means exactly one thing.</>,
    ask: 'Click “Bounded contexts”.',
    nav: { ...PROD, phase: 'Design', entry: 'journeys' },
    click: { text: 'Bounded contexts', within: RAIL },
  },
  {
    id: 'open-adjud',
    where: 'Design › Bounded contexts',
    title: 'Open Claim adjudication',
    body: <>The most complete box in the demo — the one where a claim is actually decided.</>,
    ask: 'Click the Claim adjudication card.',
    then: 'Its left panel is everything a team needs to build it: the life story of a claim file, the data it owns, its rules, its tests, its handoffs and its open questions.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts' },
    click: { sel: ['.ddd-ctx'], nameSel: '.ddd-ctx-nm', text: 'Claim adjudication' },
  },
  {
    id: 'agents',
    where: 'Design › Claim adjudication',
    title: 'Every box has agents',
    body: <>The <b>domain agent</b> knows this box&apos;s model and answers questions about it.</>,
    ask: 'Click “Agents” in the left panel.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'flow' },
    click: { text: 'Agents', within: BCRAIL },
    settle: 300,
  },
  {
    id: 'ops-agent',
    where: 'Claim adjudication › Agents',
    title: 'And an agent that does the work',
    body: <>The <b>operations agent</b> runs the box: named skills, explicit permissions, and evaluations that say whether it can be trusted. This is where the knowledge graph stops being documentation and starts being something software uses.</>,
    ask: 'Click “Operations agent”.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'agent' },
    click: { sel: ['.dd-iseg-btn'], text: 'Operations agent' },
    settle: 300,
  },
  {
    id: 'kg',
    where: 'Claim adjudication',
    title: 'The whole box as a graph',
    body: <>Every element on those pages is a node with a real id, and every link is a typed fact — so an agent can answer by walking the graph instead of guessing.</>,
    ask: 'Click “Knowledge graph”.',
    then: 'The explorer is live for this step: click a node to see what it connects to, filter by type, and use a node&apos;s id to jump to the page that defines it.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'agent' },
    click: { text: 'Knowledge graph', within: BCRAIL },
    allow: ['.asc-graph-body', '.asc-graph-fsbtn'],
    settle: 500,
  },
  {
    id: 'back-to-contexts',
    where: 'Claim adjudication',
    title: 'Step back out of the box',
    body: <>Each box has this same shape, filled to the depth its team has reached. The back link at the top of the panel returns to all seven.</>,
    ask: 'Click “Bounded contexts” at the top of the left panel.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts', ctx: 'CTX-ADJUD', tab: 'kg' },
    click: { sel: ['.bc-rail-back'] },
  },
  {
    id: 'context-map',
    where: 'ClaimsCore › Design',
    title: 'The context map — how the boxes talk',
    body: <>One picture of all seven boxes and the agreements between them. Every arrow is a contract with a name, a shape and a promise; no box reaches into another&apos;s data.</>,
    ask: 'Click “Context map”.',
    then: 'Live for this step: expand it, switch the layout, and double-click a box to jump straight into it.',
    nav: { ...PROD, phase: 'Design', entry: 'contexts' },
    click: { text: 'Context map', within: RAIL },
    allow: [CANVAS],
    settle: 600,
  },
  {
    id: 'system-design',
    where: 'ClaimsCore › Design',
    title: 'System design',
    body: <>The same model laid out as a system: the surfaces, the stores, the streams and the outside parties. Design decides this shape — Build then commits to it.</>,
    ask: 'Click “System design”.',
    nav: { ...PROD, phase: 'Design', entry: 'contextmap' },
    click: { text: 'System design', within: RAIL },
    allow: [CANVAS],
    settle: 600,
  },

  /* ---------- Build ---------- */
  {
    id: 'build',
    where: 'ClaimsCore › Design',
    title: 'Move to Build',
    body: <>Build turns the model into things that deploy — on a platform the platform team owns, with components, resources, tests and evals.</>,
    ask: 'Click “Build” on the phase bar.',
    nav: { ...PROD, phase: 'Design', entry: 'arch' },
    click: { sel: PHASE_SEG, text: 'Build' },
  },
  {
    id: 'components',
    where: 'ClaimsCore › Build',
    title: 'Components are the things that actually deploy',
    body: <>Boxes and components are deliberately not one-to-one: a box is never split across two components, but one component may carry several whole boxes. Modelling boundaries and operational boundaries are allowed to differ.</>,
    ask: 'Click “Components”.',
    nav: { ...PROD, phase: 'Build', entry: 'platform' },
    click: { text: 'Components', within: RAIL },
  },
  {
    id: 'open-component',
    where: 'Build › Components',
    title: 'Open one component',
    body: <>Each component has its version per environment, its runtime, its build artifact and its links out to code, image, pipeline and logs.</>,
    ask: 'Click any component card.',
    then: 'Its tabs are live for this step: Deployment, Resources, Environment variables and Secrets.',
    nav: { ...PROD, phase: 'Build', entry: 'components' },
    click: { sel: ['.ddd-cmp-card'] },
    allow: ['.ddd-subtabs', '.ddd-crumbhead'],
    settle: 400,
  },
  {
    id: 'tests',
    where: 'ClaimsCore › Build',
    title: 'Tests verify the software',
    body: <>Acceptance tests by use case, and per-box component suites — checking that the deterministic behaviour matches what Discover asked for.</>,
    ask: 'Click “Tests”.',
    nav: { ...PROD, phase: 'Build', entry: 'components' },
    click: { text: 'Tests', within: RAIL },
    allow: ['.tstx-group'],
  },
  {
    id: 'evals',
    where: 'ClaimsCore › Build',
    title: 'Evals measure the agents',
    body: <>A different question, so a different place: transcripts, scores, and whether a skill is fit to promote. Software gets tested; agents get judged.</>,
    ask: 'Click “Evals”.',
    nav: { ...PROD, phase: 'Build', entry: 'tests' },
    click: { text: 'Evals', within: RAIL },
    allow: ['.tstx-group'],
  },

  /* ---------- Operate ---------- */
  {
    id: 'operate',
    where: 'ClaimsCore › Build',
    title: 'Move to Operate',
    body: <>Running it: service levels and fleet health, the incidents when something breaks, the approvals that gate anything consequential, and the runbooks that say how to respond.</>,
    ask: 'Click “Operate” on the phase bar.',
    nav: { ...PROD, phase: 'Build', entry: 'evals' },
    click: { sel: PHASE_SEG, text: 'Operate' },
  },
  {
    id: 'incidents',
    where: 'ClaimsCore › Operate',
    title: 'Incidents',
    body: <>Each incident carries its severity, what it touched, its timeline and the remediation someone applied — and applying one is a recorded act, not a silent one.</>,
    ask: 'Click “Incidents”.',
    then: 'The list is live for this step — open one and read its timeline.',
    nav: { ...PROD, phase: 'Operate', entry: 'fleet' },
    click: { text: 'Incidents', within: RAIL },
    allow: ['.tstx-group'],
  },
  {
    id: 'approvals',
    where: 'ClaimsCore › Operate',
    title: 'Approvals',
    body: <>The governance gate. Every consequential change is requested, decided by a named person on stated evidence, and kept — superseded versions stay in the record rather than being overwritten.</>,
    ask: 'Click “Approvals”.',
    nav: { ...PROD, phase: 'Operate', entry: 'incidents' },
    click: { text: 'Approvals', within: RAIL },
    allow: ['.tstx-group'],
  },
  {
    id: 'runbooks',
    where: 'ClaimsCore › Operate',
    title: 'Runbooks are agent skills',
    body: <>A runbook is a trigger, a body and a toolset — which is exactly what a skill is. Each one names its executor, whether a deployed agent or a human.</>,
    ask: 'Click “Runbooks”.',
    nav: { ...PROD, phase: 'Operate', entry: 'approvals' },
    click: { text: 'Runbooks', within: RAIL },
    allow: ['.tstx-group'],
  },

  /* ---------- Realize ---------- */
  {
    id: 'realize',
    where: 'ClaimsCore › Operate',
    title: 'Move to Realize',
    body: <>The phase most products skip: did it work, measured against what was promised at the start.</>,
    ask: 'Click “Realize” on the phase bar.',
    nav: { ...PROD, phase: 'Operate', entry: 'runbooks' },
    click: { sel: PHASE_SEG, text: 'Realize' },
  },
  {
    id: 'value',
    where: 'ClaimsCore › Realize',
    title: 'Value realized',
    body: <>What the product actually returned, set against the business case from Envision — the same numbers and the same ids, now measured instead of forecast, lever by lever.</>,
    ask: 'Click “Value realized”.',
    nav: { ...PROD, phase: 'Realize', entry: 'outcomes' },
    click: { text: 'Value realized', within: RAIL },
  },
  {
    id: 'decision',
    where: 'ClaimsCore › Realize',
    title: 'The go-forward decision',
    body: <>Sustain, scale, pivot or retire — decided by named people on the evidence above, with the learning feeding straight back into Envision.</>,
    ask: 'Click “Go-forward decision”.',
    nav: { ...PROD, phase: 'Realize', entry: 'value' },
    click: { text: 'Go-forward decision', within: RAIL },
  },
  {
    id: 'end',
    where: 'That is the loop',
    title: 'Now have a look around on your own',
    body: <>One continuous record, from the shape of the organisation down to a deployed component and back up to the decision about whether it paid off.<br /><br />Press <b>Finish</b> and the whole app becomes clickable again — every phase, every box and every map is yours to wander. The tour stays in this corner if you want to run it again.</>,
    nav: { ...PROD, phase: 'Realize', entry: 'decision' },
  },
];

export default TOUR_STEPS;
