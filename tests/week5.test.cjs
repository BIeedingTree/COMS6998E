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
  const calls = { generated: [], inserted: [], writes: [], refreshed: [], tables: [], signOut: [], reads: [], rpcs: [] };
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: options.authError ?? null }),
      exchangeCodeForSession: async () => ({ error: options.exchangeError ?? null }),
      signOut: async settings => { calls.signOut.push(settings); return { error: null }; },
    },
    async rpc(name, args = {}) {
      calls.rpcs.push({ name, args });
      if (options.rpcError) return { data: null, error: options.rpcError };
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
          assert.equal(operation, 'delete');
          calls.writes.push({ operation, filters });
          if (options.deleteError) return Promise.resolve({ data: null, error: options.deleteError }).then(resolve);
          const removed = options.hiddenByRls ? [] : rows.filter(matches);
          for (const row of removed) rows.splice(rows.indexOf(row), 1);
          return Promise.resolve({ data: removed, error: null }).then(resolve);
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
    '@/lib/supabase/server': { createClient: async () => client },
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
    vm.runInNewContext(js, { exports, require: localRequire, URL, process: { env: { GEMINI_API_KEY: options.noKey ? undefined : 'test-only' } } }, { filename: file });
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
for (const options of [{deleteError:{code:'42501'}},{hiddenByRls:true},{readError:{code:'42501'}}]) test('denied or invisible delete is never reported as success: '+JSON.stringify(options), async()=>{
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
  assert.deepEqual(env.calls.refreshed, ['/', '/community']);
});
for (const options of [{captions:[{id:'7',user_id:'someone-else',is_public:true}]},{captions:[]},{rpcError:{code:'42501'}}]) test('non-owner/missing/denied ownership cannot publish '+JSON.stringify(options),async()=>{
  const env=setup(options);const result=await env.actions.setDraftPublication({},form({caption_id:'7',is_public:'true'}));assert.ok(result.error);assert.equal(env.calls.writes.length,0);
});
for (const options of [{hiddenByRls:true},{writeError:{code:'42501'}}]) test('publication failure does not report success '+JSON.stringify(options),async()=>{
  const env=setup(options);assert.ok((await env.actions.setDraftPublication({},form({caption_id:'7',is_public:'false'}))).error);assert.equal(env.calls.refreshed.length,0);
});
for (const fields of [{caption_id:'7',is_public:'yes'},{caption_id:'0',is_public:'true'},{caption_id:'-7',is_public:'false'}]) test('publication input validation '+JSON.stringify(fields),async()=>{
  const env=setup();assert.ok((await env.actions.setDraftPublication({},form(fields))).error);assert.equal(env.calls.rpcs.length,0);
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
 const tree=await env.load(path.join(root,'app/page.tsx')).default();const cards=findElements(tree,n=>n.type?.name==='MessageCard');
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
