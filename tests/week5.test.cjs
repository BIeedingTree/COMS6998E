/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness loads isolated server modules. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const eligible = { id: 'student', email: 'student@columbia.edu', email_confirmed_at: '2026-01-01' };
const form = fields => { const data = new FormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value); return data; };
function setup(options = {}) {
  const user = Object.hasOwn(options, 'user') ? options.user : eligible;
  const rows = options.rows ?? [];
  const captions = options.captions ?? [{ id: '7', user_id: 'student', is_public: true, category: 'other' }];
  const calls = { generated: [], inserted: [], writes: [], refreshed: [], tables: [], signOut: [], reads: [], rpcs: [], serverErrors: [] };
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: options.authError ?? null }),
      exchangeCodeForSession: async () => ({ error: options.exchangeError ?? null }),
      signOut: async settings => { calls.signOut.push(settings); return { error: null }; },
    },
    async rpc(name, args = {}) {
      calls.rpcs.push({ name, args });
      if (options.rpcError) return { data: null, error: options.rpcError };
      if (name === 'get_my_draft_prompts') return { data: captions.filter(c => c.user_id === user?.id).map(c => ({ id: c.id, prompt: c.prompt ?? null })), error: options.promptError ?? null };
      if (name === 'get_community_requests') {
        const { originalRequest } = load(path.join(root, 'lib/drafts.ts'));
        return { data: captions.filter(c => c.is_public && c.user_id && args.p_caption_ids.includes(String(c.id)))
          .map(c => ({ id: c.id, original_request: originalRequest(c.prompt) }))
          .filter(c => c.original_request), error: options.communityRequestError ?? null };
      }
      if (name === 'get_my_drafts') return { data: captions.filter(c => c.user_id === user?.id && (!args.p_draft_id || String(c.id) === args.p_draft_id)), error: null };
      assert.equal(name, 'get_community_rating_counts');
      return { data: captions.filter(c => c.is_public && args.p_caption_ids.includes(String(c.id))).map(c => ({ caption_id: c.id, positive_count: rows.filter(v => v.caption_id === c.id && v.vote === 1).length, negative_count: rows.filter(v => v.caption_id === c.id && v.vote === -1).length })), error: null };
    },
    from(table) {
      calls.tables.push(table);
      const filters = []; let operation = 'read'; let patch; let fields;
      const source = table === 'captions' ? captions : rows;
      const matches = row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(String(row[key])) : String(row[key]) === String(value));
      const projected = row => fields ? Object.fromEntries(fields.split(',').map(key => key.trim()).map(key => [key, row[key]])) : row;
      const query = {
        select: value => { fields = value; calls.reads.push({ table, fields: value, filters }); return query; },
        eq: (key, value) => { filters.push([key, value]); return query; },
        in: (key, value) => { filters.push([key, value]); return query; },
        order: () => query,
        update: value => { patch = value; operation = 'update'; return query; },
        async maybeSingle() {
          const row = source.find(matches);
          if (operation === 'update') {
            calls.writes.push({ operation, patch, filters });
            if (options.writeError) return { data: null, error: options.writeError };
            if (row && !options.hiddenByRls) Object.assign(row, patch);
            return { data: options.hiddenByRls ? null : row, error: null };
          }
          return { data: row ? projected(row) : null, error: options.readError ?? null };
        },
        single: async () => ({ data: options.profile ?? { first_name: 'A', last_name: 'Student' }, error: null }),
        delete: () => { operation = 'delete'; return query; },
        then(resolve) {
          if (operation === 'read') return Promise.resolve({ data: source.filter(matches).map(projected), error: options.readError ?? null }).then(resolve);
          if (operation === 'update') {
            calls.writes.push({ operation, patch, filters });
            if (options.writeError) return Promise.resolve({ data: null, error: options.writeError }).then(resolve);
            if (!options.hiddenByRls) for (const row of source.filter(matches)) Object.assign(row, patch);
            return Promise.resolve({ data: null, error: null }).then(resolve);
          }
          assert.equal(operation, 'delete');
          calls.writes.push({ operation, filters });
          if (options.deleteError) return Promise.resolve({ data: null, error: options.deleteError }).then(resolve);
          if (options.deleteAlreadyRemoved) {
            for (const row of rows.filter(matches)) rows.splice(rows.indexOf(row), 1);
          }
          const removed = options.hiddenByRls ? [] : rows.filter(matches);
          for (const row of removed) rows.splice(rows.indexOf(row), 1);
          return Promise.resolve({ data: fields ? removed.map(projected) : null, error: null }).then(resolve);
        },
        upsert: async (row, config) => {
          calls.writes.push({ operation: 'upsert', row, config });
          if (options.writeError) return { error: options.writeError };
          const existing = rows.find(r => r.caption_id === row.caption_id && r.user_id === row.user_id);
          if (existing) Object.assign(existing, row); else rows.push({ ...row });
          return { error: null };
        },
        insert: row => {
          calls.inserted.push(row);
          return { select: () => ({ single: async () => ({ data: options.writeError ? null : { id: '123' }, error: options.writeError ?? null }) }) };
        },
      };
      return query;
    },
  };
  const cache = new Map();
  const mocks = {
    '@/lib/supabase/server': { createClient: async () => options.databaseClient ?? client },
    'next/navigation': { redirect: url => { throw new Error('REDIRECT:' + url); } },
    'next/server': { NextResponse: { redirect: url => ({ url }) } },
    'next/cache': { revalidatePath: url => calls.refreshed.push(url) },
    '@google/genai': { GoogleGenAI: class { models = { generateContent: async input => { calls.generated.push(input); if (options.apiError) throw Error('private details'); return { text: options.output ?? JSON.stringify({ subject: null, message: 'Hi,\n\nCould I have two more days? Thank you.' }) }; } }; } },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const localRequire = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/')) return load(['.ts', '.tsx'].map(ext => path.join(root, id.slice(2) + ext)).find(fs.existsSync));
      return require(id);
    };
    vm.runInNewContext(js, { exports, require: localRequire, URL, console: { error: (...args) => calls.serverErrors.push(args) }, process: { env: { GEMINI_API_KEY: options.noKey ? undefined : 'test-only' } } }, { filename: file });
    return exports;
  }
  return { calls, rows, captions, load, actions: load(path.join(root, 'app/actions.ts')) };
}
for (const email of ['a@columbia.edu', 'a@barnard.edu', 'A@BARNARD.EDU']) test('verified eligibility: ' + email, () => {
  const env = setup(); assert.equal(env.load(path.join(root, 'lib/auth/eligibility.ts')).isEligibleUser({ ...eligible, email }), true);
});
for (const email of ['a@gmail.com', 'a@columbia.edu.evil.com', 'a@notcolumbia.edu', 'a@sub.barnard.edu', 'a@@barnard.edu', '', 'a@barnard.edu ']) test('reject domain: ' + email, () => {
  const env = setup(); assert.equal(env.load(path.join(root, 'lib/auth/eligibility.ts')).isEligibleUser({ ...eligible, email }), false);
});
test('reject unverified email', () => { const env = setup(); assert.equal(env.load(path.join(root, 'lib/auth/eligibility.ts')).isEligibleUser({ ...eligible, email_confirmed_at: null }), false); });
for (const user of [null, { ...eligible, email: 'x@gmail.com' }]) for (const action of ['generateCaption', 'voteOnCaption', 'setDraftPublication']) test('server blocks ' + action + ' for ' + (user?.email ?? 'logged out'), async () => {
  const env = setup({ user }); await assert.rejects(() => env.actions[action]({}, form({ situation: 'Hello', caption_id: '1', vote: '1' })), /REDIRECT:\/login/); assert.equal(env.calls.tables.length, 0); assert.equal(env.calls.generated.length, 0);
});
for (const file of ['app/page.tsx', 'app/community/page.tsx', 'app/profile/page.tsx']) test('page is server protected: ' + file, async () => {
  const env = setup({ user: { ...eligible, email: 'outsider@gmail.com' } });
  await assert.rejects(() => env.load(path.join(root, file)).default({ searchParams: Promise.resolve({}) }), /reason=eligibility/);
});
for (const [before, clicked, after] of [[null,1,1],[1,1,null],[null,-1,-1],[-1,-1,null],[1,-1,-1],[-1,1,1]]) test(`vote ${before} + ${clicked} => ${after}`, async () => {
  const env = setup({ rows: before === null ? [] : [{ caption_id: '7', user_id: 'student', vote: before }] });
  const result = await env.actions.voteOnCaption({}, form({ caption_id: '7', vote: String(clicked), user_id: 'forged' }));
  assert.ok(result.message); assert.equal(env.rows.length, after === null ? 0 : 1); assert.equal(env.rows[0]?.vote ?? null, after); assert.deepEqual(env.calls.refreshed, ['/community']);
  if (after !== null) { assert.equal(env.rows[0].user_id, 'student'); assert.equal(env.calls.writes[0].config.onConflict, 'caption_id,user_id'); }
});
test('toggle removes only this user and caption', async () => {
  const env = setup({ rows: [{caption_id:'7',user_id:'student',vote:1},{caption_id:'7',user_id:'other',vote:1},{caption_id:'8',user_id:'student',vote:1}] });
  await env.actions.voteOnCaption({},form({caption_id:'7',vote:'1',user_id:'other'})); assert.equal(env.rows.length,2); assert.ok(env.rows.some(r=>r.user_id==='other')); assert.ok(env.rows.some(r=>r.caption_id==='8'));
});
for (const options of [{deleteError:{code:'42501'}},{readError:{code:'42501'}}]) test('failed vote read/delete is never reported as success: '+JSON.stringify(options), async()=>{
  const env=setup({...options,rows:[{caption_id:'7',user_id:'student',vote:1}]});const result=await env.actions.voteOnCaption({},form({caption_id:'7',vote:'1'}));assert.ok(result.error);assert.equal(env.rows.length,1);assert.equal(env.calls.refreshed.length,0);
});
for(const fields of [{caption_id:'1;DROP',vote:'1'},{caption_id:'9223372036854775808',vote:'1'},{caption_id:'7',vote:'0'}])test('invalid vote rejected '+JSON.stringify(fields),async()=>{const env=setup();assert.ok((await env.actions.voteOnCaption({},form(fields))).error);assert.equal(env.calls.writes.length,0)});
test('Barnard generation saves exact prompt, final message, server user, and draft ID',async()=>{
 const env=setup({user:{...eligible,email:'a@barnard.edu'}});const result=await env.actions.generateCaption({},form({situation:' Ask for two more days ',recipient:'Professor',tone:'Polite',user_id:'forged'}));assert.equal(result.draftId,'123');const saved=env.calls.inserted[0];assert.equal(saved.prompt,env.calls.generated[0].contents);assert.match(saved.prompt,/Situation:\nAsk for two more days/);assert.match(saved.prompt,/Recipient:\nProfessor/);assert.match(saved.prompt,/Desired tone:\nPolite/);assert.equal(saved.user_id,'student');assert.equal(saved.is_public,false);assert.equal(saved.published_at,null);assert.equal(saved.subject,null);assert.equal(saved.message_type,'message');assert.equal(saved.category,'other');assert.equal(env.calls.generated[0].config.responseMimeType,'application/json');assert.equal(saved.caption_text,'Hi,\n\nCould I have two more days? Thank you.');
});
for (const fields of [{situation:''},{situation:'x'.repeat(1001)},{situation:'Hello',tone:'invented'},{situation:'Hello',recipient:'invented'}])test('invalid composer input rejected '+Object.keys(fields).join(','),async()=>{const env=setup();assert.ok((await env.actions.generateCaption({},form(fields))).error);assert.equal(env.calls.generated.length,0)});
for(const options of [{noKey:true},{apiError:true},{output:' '},{output:'x'.repeat(2001)},{writeError:{code:'42501'}}])test('generation failure handled '+Object.keys(options).join(','),async()=>{const env=setup(options);const result=await env.actions.generateCaption({},form({situation:'Hello'}));assert.ok(result.error);assert.ok(!result.error.includes('private'));assert.equal(env.calls.refreshed.length,0)});
for(const email of ['a@columbia.edu','a@barnard.edu','a@gmail.com'])test('OAuth callback eligibility '+email,async()=>{const env=setup({user:{...eligible,email}});const response=await env.load(path.join(root,'app/auth/callback/route.ts')).GET({url:'https://app.example/auth/callback?code=test'});assert.equal(response.url,email.endsWith('@gmail.com')?'https://app.example/login?reason=eligibility':'https://app.example/');assert.equal(env.calls.signOut.length,email.endsWith('@gmail.com')?1:0)});
test('OAuth callback handles missing code',async()=>{const env=setup();assert.equal((await env.load(path.join(root,'app/auth/callback/route.ts')).GET({url:'https://app.example/auth/callback'})).url,'https://app.example/login?reason=auth')});

for (const isPublic of [true, false]) test('owner can set publication to ' + isPublic + ' on the same row', async () => {
  const env = setup({ captions: [{ id: '7', user_id: 'student', is_public: !isPublic }], rows: [{ caption_id: '7', user_id: 'other', vote: 1 }] });
  const result = await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: String(isPublic), user_id: 'forged' }));
  assert.ok(result.message); assert.equal(env.captions.length, 1); assert.equal(env.calls.inserted.length, 0);
  assert.equal(env.captions[0].is_public, isPublic); assert.equal(env.rows.length, 1);
  assert.equal(!!env.captions[0].published_at, isPublic);
  assert.deepEqual(Object.keys(env.calls.writes[0].patch).sort(), ['is_public','published_at']);
  assert.deepEqual(env.calls.writes[0].filters, [['id', '7']]);
  assert.deepEqual(env.calls.refreshed, ['/', '/community']);
});
test('publish and unpublish persist in My Drafts and Community reads', async () => {
  const env = setup({ captions: [{ id: '7', user_id: 'student', caption_text: 'Test draft', created_at: '2026-10-15', subject: null, message_type: 'message', category: 'academic', is_public: false, published_at: null }] });
  const home = () => env.load(path.join(root, 'app/page.tsx')).default({ searchParams: Promise.resolve({}) });
  const community = () => env.load(path.join(root, 'app/community/page.tsx')).default({ searchParams: Promise.resolve({}) });
  const cards = tree => findElements(tree, node => node.type?.name === 'MessageCard');

  assert.equal(cards(await community()).length, 0);
  assert.ok((await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'true' }))).message);
  assert.equal(cards(await home())[0].props.message.is_public, true);
  assert.equal(cards(await community())[0].props.message.id, '7');

  assert.ok((await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'false' }))).message);
  assert.equal(cards(await home())[0].props.message.is_public, false);
  assert.equal(cards(await community()).length, 0);
  assert.equal(env.captions[0].published_at, null);
});
for (const options of [{captions:[{id:'7',user_id:'someone-else',is_public:true}]},{captions:[]},{rpcError:{code:'42501'}}]) test('non-owner/missing/denied ownership cannot publish '+JSON.stringify(options),async()=>{
  const env=setup(options);const result=await env.actions.setDraftPublication({},form({caption_id:'7',is_public:'true'}));assert.ok(result.error);assert.equal(env.calls.writes.length,0);
});
for (const options of [{writeError:{code:'42501',message:'permission denied for column community_request',details:'test-only',hint:'test-only'}}]) test('publication failure does not report success '+JSON.stringify(options),async()=>{
  const env=setup(options);const result=await env.actions.setDraftPublication({},form({caption_id:'7',is_public:'false'}));assert.ok(result.error);assert.ok(!result.error.includes(options.writeError.message));assert.equal(env.calls.refreshed.length,0);
  assert.equal(env.calls.serverErrors[0][0], '[setCaptionPublic] Update failed');
  assert.equal(env.calls.serverErrors[0][1].code, '42501');
  assert.equal(env.calls.serverErrors[0][1].requestedPublicState, false);
});
for (const fields of [{is_public:'true'},{caption_id:'7',is_public:'yes'},{caption_id:'0',is_public:'true'},{caption_id:'-7',is_public:'false'}]) test('publication input validation '+JSON.stringify(fields),async()=>{
  const env=setup();assert.ok((await env.actions.setDraftPublication({},form(fields))).error);assert.equal(env.calls.rpcs.length,0);assert.equal(env.calls.serverErrors[0][0],'[setCaptionPublic] Invalid publish request');
});
for (const captions of [[],[{id:'7',user_id:'student',is_public:false}],[{id:'7',user_id:'other',is_public:false}]]) test('private/missing draft cannot be rated '+JSON.stringify(captions),async()=>{
  const env=setup({captions});assert.ok((await env.actions.voteOnCaption({},form({caption_id:'7',vote:'1'}))).error);assert.equal(env.calls.writes.length,0);assert.ok(!env.calls.tables.includes('caption_votes'));
});
test('email saves subject/body/type/category with exact structured prompt, ignoring publication/owner forgery',async()=>{
  const env=setup({output:JSON.stringify({subject:'  Extension request  ',message:'Hello Professor,\n\nCould I have two more days?'})});
  assert.ok((await env.actions.generateCaption({},form({situation:'Ask for time',message_type:'email',category:'academic',is_public:'true',user_id:'other'}))).draftId);
  const row=env.calls.inserted[0];assert.equal(row.subject,'Extension request');assert.equal(row.message_type,'email');assert.equal(row.category,'academic');assert.equal(row.is_public,false);assert.equal(row.user_id,'student');assert.equal(row.prompt,env.calls.generated[0].contents);assert.equal(env.calls.generated[0].config.responseJsonSchema.properties.subject.type,'string');
});
for(const output of ['bad json','[]','null','{"subject":null,"message":"Hello"}','{"subject":"","message":"Hello"}','{"subject":"Title","message":""}',JSON.stringify({subject:'x'.repeat(201),message:'Hello'}),JSON.stringify({subject:'Two\nlines',message:'Hello'}),JSON.stringify({subject:'Hello',message:'x'.repeat(2001)})])test('invalid structured email is not saved: '+output.slice(0,45),async()=>{
 const env=setup({output});assert.ok((await env.actions.generateCaption({},form({situation:'Hello',message_type:'email',category:'academic'}))).error);assert.equal(env.calls.inserted.length,0);
});
for (const message_type of ['message','other']) test('non-email requires a null subject: '+message_type,async()=>{
  const env=setup({output:'{"subject":"Invented title","message":"Hello"}'});assert.ok((await env.actions.generateCaption({},form({situation:'Hello',message_type}))).error);assert.equal(env.calls.inserted.length,0);
});
for (const fields of [{message_type:'sms'},{category:'private'}]) test('invalid metadata rejected '+JSON.stringify(fields),async()=>{
  const env=setup();assert.ok((await env.actions.generateCaption({},form({situation:'Hello',...fields}))).error);assert.equal(env.calls.generated.length,0);
});
for (const [before,clicked,after,positive,negative] of [[null,1,1,3,3],[1,1,null,1,3],[null,-1,-1,2,4],[-1,-1,null,2,2],[1,-1,-1,1,4],[-1,1,1,3,2]]) test('optimistic counts '+before+' => '+after,()=>{
  const env=setup();const next=env.load(path.join(root,'lib/drafts.ts')).optimisticRating({selected:before,positive:2,negative:3},before === clicked ? null : clicked);
  assert.equal(next.selected,after);assert.equal(next.positive,positive);assert.equal(next.negative,negative);
});
test('stale counts never become negative',()=>{const env=setup();const next=env.load(path.join(root,'lib/drafts.ts')).optimisticRating({selected:1,positive:0,negative:0},null);assert.equal(next.positive,0)});
test('email Copy includes subject and paragraph breaks; non-email does not invent a subject',()=>{
 const env=setup();const {draftCopyText}=env.load(path.join(root,'lib/drafts.ts'));
 assert.equal(draftCopyText({message_type:'email',subject:'Hello',caption_text:'First\n\nSecond'}),'Subject: Hello\n\nFirst\n\nSecond');
 assert.equal(draftCopyText({message_type:'message',subject:null,caption_text:'Hello'}),'Hello');
});
function findElements(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => findElements(child,predicate));
  return [...(predicate(node)?[node]:[]),...findElements(node.props?.children,predicate)];
}
test('My Drafts uses only the owner lookup; cards have sharing but no voting props',async()=>{
 const env=setup({captions:[{id:'7',user_id:'student',is_public:false},{id:'8',user_id:'student',is_public:true},{id:'9',user_id:'other',is_public:true}]});
 const tree=await env.load(path.join(root,'app/page.tsx')).default({searchParams:Promise.resolve({})});const cards=findElements(tree,n=>n.type?.name==='MessageCard');
 assert.deepEqual(cards.map(n=>n.props.message.id),['7','8']);assert.ok(cards.every(n=>n.props.mode==='private'&&!Object.hasOwn(n.props,'selectedVote')));assert.deepEqual(env.calls.tables,[]);assert.equal(env.calls.rpcs[0].name,'get_my_drafts');
});
test('Community filters published category; requests only safe fields and aggregate/own votes',async()=>{
 const env=setup({captions:[{id:'7',user_id:'student',prompt:'SECRET',is_public:true,category:'academic'},{id:'8',user_id:'other',prompt:'SECRET',is_public:false,category:'academic'},{id:'9',user_id:'other',is_public:true,category:'social'}],rows:[{caption_id:'7',user_id:'student',vote:1},{caption_id:'7',user_id:'other',vote:-1}]});
 const tree=await env.load(path.join(root,'app/community/page.tsx')).default({searchParams:Promise.resolve({category:'academic'})});const cards=findElements(tree,n=>n.type?.name==='MessageCard');
 assert.equal(cards.length,1);const card=cards[0].props;assert.equal(card.message.id,'7');assert.equal(card.message.prompt,undefined);assert.equal(card.message.user_id,undefined);assert.equal(card.selectedVote,1);assert.equal(card.counts.positive,1);assert.equal(card.counts.negative,1);
 assert.ok(env.calls.reads.every(r=>!r.fields.includes('prompt')&&!r.fields.includes('user_id')));assert.ok(env.calls.reads.find(r=>r.table==='caption_votes').filters.some(([key,value])=>key==='user_id'&&value==='student'));
});
test('Members route is removed',()=>assert.equal(fs.existsSync(path.join(root,'app/members/page.tsx')),false));

test('optimistic desired rating is stable when refreshed server props arrive',()=>{const env=setup();const next=env.load(path.join(root,'lib/drafts.ts')).optimisticRating({selected:1,positive:19,negative:3},1);assert.equal(next.selected,1);assert.equal(next.positive,19);assert.equal(next.negative,3)});

test('removal accepts a successful empty response when another request already removed the vote', async () => {
  const env = setup({ deleteAlreadyRemoved: true, rows: [{ caption_id: '7', user_id: 'student', vote: 1 }] });
  const result = await env.actions.voteOnCaption({}, form({ caption_id: '7', vote: '1' }));
  assert.equal(result.message, 'Vote removed.');
  assert.equal(env.rows.length, 0);
  assert.deepEqual(env.calls.refreshed, ['/community']);
});

test('actual delete error fields are logged server-side and not exposed to the UI', async () => {
  const error = { code: '42501', message: 'permission denied for table caption_votes', details: 'diagnostic detail', hint: 'diagnostic hint' };
  const env = setup({ deleteError: error, rows: [{ caption_id: '7', user_id: 'student', vote: 1 }] });
  const result = await env.actions.voteOnCaption({}, form({ caption_id: '7', vote: '1' }));
  assert.ok(result.error);
  assert.ok(!result.error.includes(error.message));
  assert.equal(env.calls.serverErrors.length, 1);
  const [label, logged] = env.calls.serverErrors[0];
  assert.equal(label, '[voteOnCaption] Delete failed');
  assert.deepEqual(JSON.parse(JSON.stringify(logged)), error);
  assert.equal(env.rows.length, 1);
  assert.equal(env.calls.refreshed.length, 0);
});

test('real Supabase SDK sends a minimal owner-scoped DELETE and handles HTTP 204', async () => {
  const { createClient } = require('@supabase/supabase-js');
  const requests = [];
  const client = createClient('https://database.example', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ url, method: init.method, headers: new Headers(init.headers) });
      if (init.method === 'DELETE') return new Response(null, { status: 204 });
      const data = url.pathname.endsWith('/captions') ? [{ id: '7' }] : [{ vote: 1 }];
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  client.auth.getUser = async () => ({ data: { user: eligible }, error: null });
  const env = setup({ databaseClient: client });
  const result = await env.actions.voteOnCaption({}, form({ caption_id: '7', vote: '1', user_id: 'forged' }));
  assert.equal(result.message, 'Vote removed.');
  const deletes = requests.filter(request => request.method === 'DELETE');
  assert.equal(deletes.length, 1);
  assert.equal(deletes[0].url.pathname, '/rest/v1/caption_votes');
  assert.deepEqual([...deletes[0].url.searchParams.entries()], [['caption_id', 'eq.7'], ['user_id', 'eq.student']]);
  assert.ok(!(deletes[0].headers.get('Prefer') ?? '').includes('return=representation'));
  assert.ok(!(deletes[0].headers.get('Accept') ?? '').includes('vnd.pgrst.object'));
  assert.deepEqual(env.calls.refreshed, ['/community']);
});

test('real Supabase SDK publishes and unpublishes with only permitted fields and accepts HTTP 204', async () => {
  const { createClient } = require('@supabase/supabase-js');
  const requests = [];
  const client = createClient('https://database.example', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ url, method: init.method, headers: new Headers(init.headers), body: init.body });
      if (url.pathname.endsWith('/rpc/get_my_drafts')) return new Response(JSON.stringify([{ id: '7' }]), { headers: { 'Content-Type': 'application/json' } });
      if (init.method === 'PATCH') return new Response(null, { status: 204 });
      throw Error('Unexpected request: ' + url.pathname);
    } },
  });
  client.auth.getUser = async () => ({ data: { user: eligible }, error: null });
  const env = setup({ databaseClient: client });
  const published = await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'true', user_id: 'forged', community_request: 'FORGED' }));
  assert.equal(published.message, 'Posted anonymously to Community.');
  const unpublished = await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'false', user_id: 'forged' }));
  assert.equal(unpublished.message, 'Removed from Community. Your draft is still saved here.');
  const patches = requests.filter(request => request.method === 'PATCH');
  assert.equal(patches.length, 2);
  for (const patch of patches) {
    assert.equal(patch.url.pathname, '/rest/v1/captions');
    assert.deepEqual([...patch.url.searchParams.entries()], [['id', 'eq.7']]);
    assert.deepEqual(Object.keys(JSON.parse(patch.body)).sort(), ['is_public', 'published_at']);
    assert.ok(!(patch.headers.get('Prefer') ?? '').includes('return=representation'));
  }
  assert.equal(JSON.parse(patches[0].body).is_public, true);
  assert.ok(JSON.parse(patches[0].body).published_at);
  assert.equal(JSON.parse(patches[1].body).is_public, false);
  assert.equal(JSON.parse(patches[1].body).published_at, null);
  assert.deepEqual(env.calls.refreshed, ['/', '/community', '/', '/community']);
});


test('private request lookup is owner-scoped and does not prevent drafts loading on failure', async () => {
  for (const promptError of [null, { code: 'PGRST202' }]) {
    const env = setup({ promptError, captions: [
      { id: '7', user_id: 'student', prompt: 'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.\n\nSituation:\nAsk for an extension.\n\nRecipient:\nProfessor\n\nDesired tone:\nPolite' },
      { id: '8', user_id: 'other', prompt: 'Other user secret' },
    ] });
    const tree = await env.load(path.join(root, 'app/page.tsx')).default({searchParams:Promise.resolve({})});
    const nodes = [];
    function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children); }
    visit(tree);
    const cards = nodes.filter(node => node.props?.mode === 'private');
    assert.equal(cards.length, 1);
    assert.equal(cards[0].props.originalRequest, promptError ? null : 'Ask for an extension.');
    assert.equal(env.calls.rpcs.filter(call => call.name === 'get_my_draft_prompts').length, 1);
    assert.deepEqual(env.calls.tables, []);
  }
});

test('original request parsing preserves multiline user text without displaying model instructions', () => {
  const { originalRequest } = setup().load(path.join(root, 'lib/drafts.ts'));
  const start = 'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.';
  assert.equal(originalRequest(start + '\nSituation:\nLine one\n\nRecipient:\npart of my input\nLine two\n\nRecipient:\nFriend\n\nDesired tone:\nWarm'), 'Line one\n\nRecipient:\npart of my input\nLine two');
  for (const prompt of [undefined, null, '', 'Old humor instructions', start]) assert.equal(originalRequest(prompt), null);
});

test('Community card renders the shared original request in its disclosure', () => {
  const env = setup();
  const Card = env.load(path.join(root, 'components/MessageCard.tsx')).default;
  const tree = Card({ mode: 'community', originalRequest: 'SHARED REQUEST', message: { id: '7', caption_text: 'Public draft', category: 'academic', message_type: 'message', published_at: null }, counts: null, votingAvailable: false });
  assert.ok(JSON.stringify(tree).includes('SHARED REQUEST'));
  assert.ok(JSON.stringify(tree).includes('Original request'));
});

test('avatar selection rejects unsupported, empty and oversized files', () => {
  const { avatarValidationError } = setup().load(path.join(root, 'lib/profile.ts'));
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) assert.equal(avatarValidationError({type, size: 1024}), null);
  for (const file of [{type:'image/svg+xml',size:100}, {type:'text/plain',size:100}, {type:'image/png',size:0}, {type:'image/png',size:5*1024*1024+1}]) assert.ok(avatarValidationError(file));
});

const savedRequestPrompt = 'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.\nSituation:\nAsk for two more days.\n\nRecipient:\nProfessor\n\nDesired tone:\nPolite';

test('publishing changes only visibility and timestamp, ignoring forged request and user fields', async () => {
  const env = setup({ captions: [{ id: '7', user_id: 'student', is_public: false, prompt: savedRequestPrompt, caption_text: 'Saved draft' }, { id: '8', user_id: 'other', prompt: 'OTHER USER SECRET' }] });
  const result = await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'true', share_original_request: 'true', community_request: 'FORGED', user_id: 'other' }));
  assert.ok(result.message);
  assert.equal(env.captions[0].community_request, undefined);
  assert.equal(env.captions[0].prompt, savedRequestPrompt);
  assert.equal(env.captions[0].caption_text, 'Saved draft');
  assert.equal(env.captions[0].user_id, 'student');
  assert.equal(env.captions[1].community_request, undefined);
  assert.ok(!env.calls.rpcs.some(call => call.name === 'get_my_draft_prompts'));
});

test('publishing no longer depends on original-request lookup', async () => {
  const env = setup({ captions: [{ id: '7', user_id: 'student', is_public: false, prompt: savedRequestPrompt }] });
  assert.ok((await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'true' }))).message);
  assert.ok(!env.calls.rpcs.some(c => c.name === 'get_my_draft_prompts'));
});

test('request lookup failure does not block publication', async () => {
  const env = setup({ promptError: { code: 'PGRST202' }, captions: [{ id: '7', user_id: 'student', is_public: false }] });
  assert.ok((await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'true', share_original_request: 'true' }))).message);
  assert.equal(env.calls.writes.length, 1);
  assert.ok(!env.calls.rpcs.some(c => c.name === 'get_my_draft_prompts'));
});

test('unpublishing changes only visibility and timestamp', async () => {
  const env = setup({ promptError: { code: 'PGRST202' }, captions: [{ id: '7', user_id: 'student', is_public: true, community_request: 'Ask for two more days.', prompt: savedRequestPrompt }] });
  assert.ok((await env.actions.setDraftPublication({}, form({ caption_id: '7', is_public: 'false' }))).message);
  assert.equal(env.captions[0].community_request, 'Ask for two more days.');
  assert.equal(env.captions[0].prompt, savedRequestPrompt);
  assert.ok(!env.calls.rpcs.some(c => c.name === 'get_my_draft_prompts'));
});

for (const communityRequestError of [null, { code: 'PGRST202' }]) test('Community receives only shared requests and survives lookup failure ' + Boolean(communityRequestError), async () => {
  const env = setup({ user: { ...eligible, id: 'barnard-reader', email: 'reader@barnard.edu' }, communityRequestError, captions: [
    { id: '7', user_id: 'student', is_public: true, category: 'academic', prompt: savedRequestPrompt },
    { id: '8', user_id: 'student', is_public: false, category: 'academic', prompt: savedRequestPrompt.replace('Ask for two more days.', 'PRIVATE SITUATION') },
    { id: '9', user_id: 'student', is_public: true, category: 'academic', prompt: 'OLD PRIVATE PROMPT' },
  ] });
  const tree = await env.load(path.join(root, 'app/community/page.tsx')).default({ searchParams: Promise.resolve({ category: 'academic' }) });
  const cards = findElements(tree, node => node.type?.name === 'MessageCard');
  assert.equal(cards.length, 2);
  assert.equal(cards[0].props.originalRequest, communityRequestError ? null : 'Ask for two more days.');
  assert.equal(cards[1].props.originalRequest, null);
  assert.equal(cards[0].props.votingAvailable, true);
  assert.ok(!JSON.stringify(cards.map(card => card.props)).includes('PRIVATE SITUATION'));
  assert.ok(!JSON.stringify(cards.map(card => card.props)).includes('OLD PRIVATE PROMPT'));
  assert.deepEqual(Array.from(env.calls.rpcs.find(c => c.name === 'get_community_requests').args.p_caption_ids), ['7', '9']);
  assert.equal(env.calls.serverErrors.length, communityRequestError ? 1 : 0);
  if (communityRequestError) {
    assert.equal(env.calls.serverErrors[0][0], '[Community] Original-request lookup failed');
    assert.equal(env.calls.serverErrors[0][1].code, communityRequestError.code);
  }
});

test('Community request RPC is limited to eligible readers and published prompts', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/week5-community-requests.sql'), 'utf8');
  assert.match(sql, /security definer/i);
  assert.match(sql, /week5_is_eligible_student\(\)/);
  assert.match(sql, /and c\.is_public/);
  assert.match(sql, /and c\.id = any\(p_caption_ids\)/);
  assert.match(sql, /grant execute on function public\.get_community_requests\(bigint\[\]\) to authenticated/);
  assert.doesNotMatch(sql, /grant select\s*\([^)]*prompt/i);
  assert.doesNotMatch(sql, /community_request\b/);
});

test('My Drafts category links filter only owner drafts and preserve the active category', async () => {
  const env = setup({ captions: [
    { id: '7', user_id: 'student', category: 'academic', is_public: false },
    { id: '8', user_id: 'student', category: 'social', is_public: false },
    { id: '9', user_id: 'other', category: 'academic', is_public: true },
  ] });
  const tree = await env.load(path.join(root, 'app/page.tsx')).default({ searchParams: Promise.resolve({ category: 'academic' }) });
  const cards = findElements(tree, node => node.type?.name === 'MessageCard');
  assert.deepEqual(cards.map(card => card.props.message.id), ['7']);
  assert.equal(cards[0].props.mode, 'private');
  const filters = findElements(tree, node => node.props?.['aria-label'] === 'Filter My Drafts by category')[0];
  const academic = findElements(filters, node => node.props?.href === '/?category=academic')[0];
  assert.equal(academic.props['aria-current'], 'page');
  assert.equal(findElements(tree, node => node.type?.name === 'MessageComposer')[0].props.filtered, true);
  assert.ok(env.calls.rpcs.some(call => call.name === 'get_my_drafts'));
  assert.ok(!env.calls.rpcs.some(call => call.name === 'get_community_rating_counts'));
});

test('invalid My Drafts category falls back to all owner drafts', async () => {
  const env = setup({ captions: [
    { id: '7', user_id: 'student', category: 'academic', is_public: false },
    { id: '8', user_id: 'student', category: 'social', is_public: false },
  ] });
  const tree = await env.load(path.join(root, 'app/page.tsx')).default({ searchParams: Promise.resolve({ category: ['academic', 'social'] }) });
  const cards = findElements(tree, node => node.type?.name === 'MessageCard');
  assert.deepEqual(cards.map(card => card.props.message.id), ['7', '8']);
  assert.equal(findElements(tree, node => node.type?.name === 'MessageComposer')[0].props.filtered, false);
});

test('templates follow recipient and category selections', () => {
  const { templatesFor } = setup().load(path.join(root, 'lib/message-templates.ts'));
  const { RECIPIENTS } = setup().load(path.join(root, 'lib/message-options.ts'));
  assert.equal(templatesFor('other', '').length, 6);
  for (const recipient of RECIPIENTS) {
    const matches = templatesFor('other', recipient);
    assert.ok(matches.length > 0, `${recipient} should have a template`);
    assert.ok(matches.every(template => template.recipient === recipient));
  }
  assert.ok(templatesFor('academic', 'Professor').every(template => template.category === 'academic' && template.recipient === 'Professor'));
  assert.equal(templatesFor('academic', 'Roommate').length, 0);
  assert.ok(templatesFor('housing', '').every(template => template.category === 'housing'));
});
