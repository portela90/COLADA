// Permisos por app: usuario «solo Almacén» no entra en Coladas, y el administrador lo elige en «Mi usuario».
// Se simula Supabase con un cliente falso (sin internet) para probar la pantalla de acceso real (comun/supabase-web.js).
const { test, expect } = require('@playwright/test');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FAKE = `(function(){window.__upd=[];const U=window.__USERS;const ME=window.__ME;
  const run=q=>{if(q._t==='usuarios'){if(q._op==='update'){window.__upd.push({id:q._f.user_id,v:q._val});const u=U.find(x=>x.user_id===q._f.user_id);Object.assign(u,q._val);return{data:null,error:null};}
      if(q._one)return{data:U.find(x=>x.user_id===q._f.user_id)||null,error:null};return{data:U,error:null};}
    if(q._t==='docs')return{data:q._one?null:[],error:null,count:5};return{data:q._one?null:[],error:null};};
  const mk=t=>{const q={_t:t,_f:{},_op:'select'};['select','in','order','limit','gte','lte','neq','is','range','filter','match','not','or'].forEach(m=>q[m]=()=>q);
    q.eq=(k,v)=>{q._f[k]=v;return q;};q.update=v=>{q._op='update';q._val=v;return q;};q.insert=v=>{q._op='insert';q._val=v;return q;};q.upsert=v=>{q._op='upsert';q._val=v;return q;};q.delete=()=>{q._op='delete';return q;};
    q.maybeSingle=()=>{q._one=true;return q;};q.single=()=>{q._one=true;return q;};q.then=(a,b)=>Promise.resolve(run(q)).then(a,b);return q;};
  const ch={on(){return ch;},subscribe(){return ch;},unsubscribe(){}};
  window.supabase={createClient:()=>({from:mk,rpc:async()=>({data:null,error:null}),channel:()=>ch,removeChannel(){},
    storage:{from:()=>({createSignedUrl:async()=>({data:null}),upload:async()=>({data:{},error:null}),remove:async()=>({})})},
    functions:{invoke:async()=>({data:null,error:null})},
    auth:{getSession:async()=>({data:{session:{user:{id:ME,email:'x@x'},access_token:'t'}}}),signOut:async()=>({}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};})();`;
const USERS = [{ user_id: 'cris', email: 'cristian@x', nombre: 'Cristian', activo: true, admin: true, consulta: false, coladas: true, creado: '1' },
  { user_id: 'bea', email: 'bea@x', nombre: 'Bea', activo: true, admin: false, consulta: false, coladas: false, creado: '2' },
  { user_id: 'marta', email: 'marta@x', nombre: 'Marta', activo: false, admin: false, consulta: false, coladas: true, creado: '3' }];
async function prepara(page, me) {
  await page.route('**/supabase.min.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE }));
  await page.route(/^https?:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await page.addInitScript(([u, m]) => { window.__USERS = u; window.__ME = m; }, [USERS, me]);
}
test('un usuario «solo Almacén» no entra en Coladas', async ({ page }) => {
  await prepara(page, 'bea');
  await page.goto('file://' + path.join(ROOT, 'index.html')); await page.waitForTimeout(1500);
  await expect(page.locator('.lg-ov')).toContainText('Sin acceso a Coladas');
  await expect(page.locator('.lg-ov')).toContainText('tiene acceso al Almacén, pero no a Coladas');
});
test('el administrador elige el acceso de cada usuario', async ({ page }) => {
  await prepara(page, 'cris');
  await page.goto('file://' + path.join(ROOT, 'almacen.html')); await page.waitForTimeout(1500);
  await page.locator('#usr-btn').click(); await page.locator('.usr-fila', { hasText: 'Mi usuario' }).click(); await page.waitForTimeout(400);
  const bea = page.locator('select[aria-label="Acceso de Bea"]'), marta = page.locator('select[aria-label="Acceso de Marta"]');
  await expect(bea).toHaveValue('alm'); await expect(marta).toHaveValue('no');
  await marta.selectOption('alm'); await page.waitForTimeout(300);
  const up = await page.evaluate(() => window.__upd);
  expect(up[0]).toEqual({ id: 'marta', v: { activo: true, consulta: false, coladas: false, admin: false } });
  await expect(page.locator('select[aria-label="Acceso de Cristian"]')).toBeDisabled();
});
