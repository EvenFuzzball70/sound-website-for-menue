(function(){
  'use strict';

  var SESSION_KEY='sound-admin-key-v2';
  var LEGACY_KEY='sound-menu-admin-v1';
  var categories=[
    {id:'ps5',title:'البلي',items:[{id:'ps5-hour',name:'الساعة',price:5000},{id:'ps5-four',name:'رباعي',price:8000}]},
    {id:'pc',title:'الحاسبات',items:[{id:'pc-elite',name:'أيليت',price:2500},{id:'pc-master',name:'الماستر',price:3500}]},
    {id:'cinema',title:'السينما',items:[{id:'cinema-4',name:'٢ إلى ٤ أشخاص',price:10000},{id:'cinema-10',name:'٢ إلى ١٠ أشخاص',price:30000}]},
    {id:'billiards',title:'البلياردو والسنوكر',items:[{id:'billiards-zone',name:'البليارد زون',price:6000},{id:'snooker-zone',name:'السنوكر زون',price:15000}]},
    {id:'vr',title:'الواقع الافتراضي',items:[{id:'vr-hour',name:'الساعة',price:20000}]}
  ];
  var categoryNames={cafe:'الكافيه والمطعم',ps5:'البلي',pc:'الحاسبات',cinema:'السينما',billiards:'البلياردو والسنوكر',vr:'الواقع الافتراضي'};
  var data={version:2,updatedAt:null,items:{},offers:[]};
  var dirty=false;

  function byId(id){return document.getElementById(id)}
  function own(object,key){return Object.prototype.hasOwnProperty.call(object,key)}
  function format(value){return Number(value||0).toLocaleString('ar-IQ')}
  function esc(value){return String(value||'').replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]})}
  function normalize(value){value=value&&typeof value==='object'?value:{};return{version:2,updatedAt:value.updatedAt||null,items:value.items&&typeof value.items==='object'?value.items:{},offers:Array.isArray(value.offers)?value.offers:[]}}
  function adminKey(){return sessionStorage.getItem(SESSION_KEY)||''}

  function toast(message,error){
    var node=byId('toast');
    node.textContent=message;
    node.classList.toggle('error',!!error);
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(function(){node.classList.remove('show')},2400);
  }

  async function api(path,options){
    options=options||{};
    var headers=new Headers(options.headers||{});
    if(options.body&&!headers.has('content-type'))headers.set('content-type','application/json');
    if(path==='/api/menu'&&options.method&&options.method!=='GET')headers.set('x-sound-key',adminKey());
    var response=await fetch(path,Object.assign({},options,{headers:headers,cache:'no-store'}));
    var payload=null;
    try{payload=await response.json()}catch(e){}
    if(response.status===401){
      sessionStorage.removeItem(SESSION_KEY);
      if(byId('adminView'))byId('adminView').classList.add('hidden');
      if(byId('loginView'))byId('loginView').classList.remove('hidden');
      throw new Error('unauthorized');
    }
    if(!response.ok)throw new Error(payload&&payload.error||'request_failed');
    return payload;
  }

  async function saveRemote(message){
    var saved=await api('/api/menu',{method:'PUT',body:JSON.stringify(data)});
    data=normalize(saved);
    dirty=false;
    byId('saveStatus').textContent='تم الحفظ للجميع الآن';
    if(message!==false)toast(message||'تم تحديث المنيو لكل الزبائن');
  }

  async function loadRemote(){
    data=normalize(await api('/api/menu',{method:'GET'}));
    if(!data.updatedAt){
      try{
        var legacy=normalize(JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}'));
        if(Object.keys(legacy.items).length||legacy.offers.length){
          data=legacy;
          await saveRemote(false);
          localStorage.removeItem(LEGACY_KEY);
          toast('تم نقل تعديلات الجهاز القديمة إلى المنيو المشترك');
        }
      }catch(e){}
    }
    renderItems();
    renderOffers();
  }

  function showAdmin(){
    byId('loginView').classList.add('hidden');
    byId('adminView').classList.remove('hidden');
    byId('saveStatus').textContent='جاري تحميل المنيو المشترك…';
    loadRemote().then(function(){byId('saveStatus').textContent='كل شيء محفوظ للجميع'}).catch(function(error){if(error.message!=='unauthorized')toast('تعذر تحميل المنيو المشترك',true)});
  }

  byId('loginForm').addEventListener('submit',async function(event){
    event.preventDefault();
    var button=event.submitter;
    var error=byId('loginError');
    var key=byId('password').value;
    button.disabled=true;
    button.textContent='جاري الدخول…';
    error.textContent='';
    try{
      var response=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:key}),cache:'no-store'});
      if(!response.ok){error.textContent='كلمة المرور غير صحيحة.';return}
      sessionStorage.setItem(SESSION_KEY,key);
      byId('password').value='';
      showAdmin();
    }catch(e){error.textContent='تعذر الاتصال بالخادم. حاول مرة ثانية.'}
    finally{button.disabled=false;button.textContent='دخول'}
  });

  byId('togglePassword').addEventListener('click',function(){
    var input=byId('password');
    input.type=input.type==='password'?'text':'password';
  });
  byId('logout').addEventListener('click',function(){sessionStorage.removeItem(SESSION_KEY);location.reload()});

  document.querySelectorAll('.tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('.tab').forEach(function(item){item.setAttribute('aria-selected',String(item===tab))});
      document.querySelectorAll('.panel').forEach(function(panel){panel.classList.toggle('active',panel.id==='panel-'+tab.dataset.tab)});
      byId('saveBar').classList.toggle('hidden',tab.dataset.tab!=='prices');
    });
  });

  function markDirty(){dirty=true;byId('saveStatus').textContent='عندك تغييرات غير محفوظة'}

  function renderItems(){
    var root=byId('menuGroups');
    root.textContent='';
    categories.forEach(function(category,index){
      var details=document.createElement('details');
      details.className='group';
      if(index===0)details.open=true;
      details.innerHTML='<summary>'+category.title+'</summary><div class="group-items"></div>';
      var list=details.querySelector('.group-items');
      category.items.forEach(function(item){
        var saved=data.items[item.id]||{};
        var price=own(saved,'price')?Number(saved.price):item.price;
        var row=document.createElement('div');
        row.className='item-row';
        row.dataset.itemId=item.id;
        row.dataset.defaultPrice=String(item.price);
        row.innerHTML='<div class="item-name"><strong>'+item.name+'</strong><small>السعر الأصلي: '+format(item.price)+' د.ع</small></div><div class="field"><label>السعر الحالي</label><input class="item-price" type="number" min="0" step="250" inputmode="numeric" value="'+price+'"></div><div class="field"><label>الخصم ٪</label><input class="item-discount" type="number" min="0" max="100" inputmode="numeric" value="'+Number(saved.discount||0)+'"></div><label class="switchrow"><input class="item-hidden" type="checkbox" '+(saved.hidden?'checked':'')+'>إخفاء</label>';
        row.querySelectorAll('input').forEach(function(input){input.addEventListener('input',markDirty);input.addEventListener('change',markDirty)});
        list.appendChild(row);
      });
      root.appendChild(details);
    });
  }

  byId('savePrices').addEventListener('click',async function(){
    document.querySelectorAll('.item-row').forEach(function(row){
      data.items[row.dataset.itemId]={
        price:Math.max(0,Number(row.querySelector('.item-price').value||0)),
        discount:Math.min(100,Math.max(0,Number(row.querySelector('.item-discount').value||0))),
        hidden:row.querySelector('.item-hidden').checked
      };
    });
    var button=this;
    button.disabled=true;
    button.textContent='جاري الحفظ…';
    try{await saveRemote()}catch(e){if(e.message!=='unauthorized')toast('فشل الحفظ. حاول مرة ثانية.',true)}
    finally{button.disabled=false;button.textContent='حفظ الأسعار'}
  });

  function renderOffers(){
    var root=byId('offerList');
    root.textContent='';
    if(!data.offers.length){root.innerHTML='<div class="empty">ماكو عروض مضافة حالياً.<br>أضف أول عرض من النموذج.</div>';return}
    data.offers.forEach(function(offer){
      var entry=document.createElement('div');
      entry.className='offer-entry';
      entry.innerHTML='<div><h3>'+esc(offer.title)+'</h3><p>'+esc(categoryNames[offer.category]||'')+' · '+format(offer.price)+' د.ع'+(offer.discount?' · خصم '+format(offer.discount)+'٪':'')+(offer.hidden?' · مخفي':'')+'</p></div><div class="mini-actions"><button type="button" data-edit aria-label="تعديل">✎</button><button class="delete" type="button" data-delete aria-label="حذف">⌫</button></div>';
      entry.querySelector('[data-edit]').addEventListener('click',function(){loadOffer(offer)});
      entry.querySelector('[data-delete]').addEventListener('click',async function(){
        if(!confirm('متأكد تريد تحذف هذا العرض؟'))return;
        data.offers=data.offers.filter(function(item){return item.id!==offer.id});
        try{await saveRemote();renderOffers();resetOfferForm()}catch(e){if(e.message!=='unauthorized')toast('فشل حذف العرض',true)}
      });
      root.appendChild(entry);
    });
  }

  function loadOffer(offer){
    byId('offerId').value=offer.id;
    byId('offerTitle').value=offer.title||'';
    byId('offerCategory').value=offer.category||'cafe';
    byId('offerPrice').value=Number(offer.price||0);
    byId('offerDiscount').value=Number(offer.discount||0);
    byId('offerImage').value=offer.imageUrl||'';
    byId('offerDescription').value=offer.description||'';
    byId('offerHidden').checked=!!offer.hidden;
    byId('offerFormTitle').textContent='تعديل العرض';
    byId('saveOffer').textContent='حفظ التعديل';
    byId('cancelEdit').classList.remove('hidden');
    byId('offerForm').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function resetOfferForm(){
    byId('offerForm').reset();
    byId('offerId').value='';
    byId('offerDiscount').value='0';
    byId('offerFormTitle').textContent='إضافة عرض جديد';
    byId('saveOffer').textContent='حفظ العرض';
    byId('cancelEdit').classList.add('hidden');
  }
  byId('cancelEdit').addEventListener('click',resetOfferForm);

  byId('offerForm').addEventListener('submit',async function(event){
    event.preventDefault();
    var id=byId('offerId').value||('offer-'+Date.now());
    var offer={
      id:id,
      title:byId('offerTitle').value.trim(),
      category:byId('offerCategory').value,
      price:Math.max(0,Number(byId('offerPrice').value||0)),
      discount:Math.min(100,Math.max(0,Number(byId('offerDiscount').value||0))),
      imageUrl:byId('offerImage').value.trim(),
      description:byId('offerDescription').value.trim(),
      hidden:byId('offerHidden').checked
    };
    var index=data.offers.findIndex(function(item){return item.id===id});
    if(index>=0)data.offers[index]=offer;else data.offers.unshift(offer);
    var button=byId('saveOffer');
    button.disabled=true;
    try{await saveRemote('تم حفظ العرض وظهر للجميع');renderOffers();resetOfferForm()}catch(e){if(e.message!=='unauthorized')toast('فشل حفظ العرض',true)}
    finally{button.disabled=false}
  });

  byId('exportData').addEventListener('click',function(){
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var link=document.createElement('a');
    link.href=url;
    link.download='sound-menu-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
    toast('تم تنزيل النسخة الاحتياطية');
  });

  byId('importData').addEventListener('change',function(){
    var input=this;
    var file=input.files&&input.files[0];
    if(!file)return;
    file.text().then(async function(text){
      data=normalize(JSON.parse(text));
      await saveRemote('تم استيراد النسخة وتحديث المنيو للجميع');
      renderItems();renderOffers();
    }).catch(function(){toast('الملف غير صالح أو تعذر حفظه',true)}).finally(function(){input.value=''});
  });

  byId('resetData').addEventListener('click',async function(){
    if(!confirm('راح تنمسح كل الأسعار المعدّلة والعروض من المنيو عند الجميع. متأكد؟'))return;
    try{
      data=normalize(await api('/api/menu',{method:'DELETE'}));
      renderItems();renderOffers();
      byId('saveStatus').textContent='رجع المنيو الأصلي للجميع';
      toast('رجعنا المنيو الأصلي للجميع');
    }catch(e){if(e.message!=='unauthorized')toast('فشل إرجاع المنيو الأصلي',true)}
  });

  window.addEventListener('beforeunload',function(event){if(dirty){event.preventDefault();event.returnValue=''}});
  if(adminKey())showAdmin();
})();
