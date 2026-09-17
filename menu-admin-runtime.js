(function(){
  'use strict';
  var CATEGORY_LABELS={cafe:{ar:'الكافيه والمطعم',en:'Café & restaurant'},ps5:{ar:'البلي',en:'PlayStation'},pc:{ar:'الحاسبات',en:'Gaming PCs'},cinema:{ar:'السينما',en:'Cinema'},billiards:{ar:'البلياردو والسنوكر',en:'Billiards & snooker'},vr:{ar:'الواقع الافتراضي',en:'Virtual reality'}};
  var latest={version:2,updatedAt:null,items:{},offers:[]};

  function own(object,key){return Object.prototype.hasOwnProperty.call(object,key)}
  function lang(){return document.documentElement.lang==='en'?'en':'ar'}
  function format(value,language){return Number(value||0).toLocaleString(language==='ar'?'ar-IQ':'en-US')}
  function priceAfterDiscount(price,discount){return Math.max(0,Math.round(Number(price||0)*(100-Math.min(100,Math.max(0,Number(discount||0))))/100))}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]})}
  function escapeAttribute(value){return escapeHtml(value).replace(/`/g,'&#096;')}

  function applyItemOverrides(data){
    var items=data.items||{};
    document.querySelectorAll('[data-menu-id]').forEach(function(row){
      var item=items[row.getAttribute('data-menu-id')]||{};
      var dd=row.querySelector('dd');
      var priceNode=dd&&dd.querySelector('b');
      if(!dd||!priceNode)return;
      if(!dd.hasAttribute('data-original-price'))dd.setAttribute('data-original-price',dd.getAttribute('data-price')||'0');
      var original=Number(dd.getAttribute('data-original-price')||0);
      var base=own(item,'price')?Number(item.price):original;
      var discount=Math.min(100,Math.max(0,Number(item.discount||0)));
      var finalPrice=priceAfterDiscount(base,discount);
      row.classList.toggle('is-admin-hidden',item.hidden===true);
      row.classList.toggle('has-discount',discount>0);
      row.querySelectorAll('.old-price,.discount-badge').forEach(function(node){node.remove()});
      dd.setAttribute('data-price',String(finalPrice));
      priceNode.setAttribute('data-ar',format(finalPrice,'ar'));
      priceNode.setAttribute('data-en',format(finalPrice,'en'));
      priceNode.textContent=format(finalPrice,lang());
      if(discount>0){
        var old=document.createElement('del');
        old.className='old-price';
        old.setAttribute('data-ar',format(base,'ar'));
        old.setAttribute('data-en',format(base,'en'));
        old.textContent=format(base,lang());
        dd.insertBefore(old,priceNode);
        var badge=document.createElement('span');
        badge.className='discount-badge';
        badge.setAttribute('data-ar','خصم '+format(discount,'ar')+'٪');
        badge.setAttribute('data-en',format(discount,'en')+'% off');
        badge.textContent=lang()==='ar'?badge.getAttribute('data-ar'):badge.getAttribute('data-en');
        dd.appendChild(badge);
      }
    });
  }

  function ensureOfferSection(){
    var section=document.getElementById('admin-offers');
    if(section)return section;
    var location=document.getElementById('location');
    if(!location||!location.parentNode)return null;
    section=document.createElement('section');
    section.className='custom-offers';
    section.id='admin-offers';
    section.setAttribute('aria-labelledby','admin-offers-title');
    section.innerHTML='<div class="section-heading"><h2 id="admin-offers-title" data-ar="العروض الحالية" data-en="Current offers">العروض الحالية</h2></div><div class="offer-grid"></div>';
    location.parentNode.insertBefore(section,location);
    return section;
  }

  function renderOffers(data){
    var section=ensureOfferSection();
    if(!section)return;
    var grid=section.querySelector('.offer-grid');
    var offers=(data.offers||[]).filter(function(offer){return offer&&!offer.hidden});
    grid.textContent='';
    section.hidden=offers.length===0;
    document.querySelectorAll('[data-admin-offers-link]').forEach(function(link){link.remove()});
    if(!offers.length)return;
    var nav=document.querySelector('.section-nav');
    if(nav){
      var link=document.createElement('a');
      link.href='#admin-offers';
      link.setAttribute('data-admin-offers-link','');
      link.innerHTML='<span data-ar="العروض" data-en="Offers">'+(lang()==='ar'?'العروض':'Offers')+'</span>';
      nav.insertBefore(link,nav.firstChild);
    }
    offers.forEach(function(offer){
      var language=lang();
      var price=Number(offer.price||0);
      var discount=Math.min(100,Math.max(0,Number(offer.discount||0)));
      var finalPrice=priceAfterDiscount(price,discount);
      var article=document.createElement('article');
      article.className='offer-card';
      var image=offer.imageUrl?'<img src="'+escapeAttribute(offer.imageUrl)+'" alt="'+escapeAttribute(offer.title||'عرض ساوند')+'" loading="lazy" decoding="async">':'';
      var discountMarkup=discount?'<span class="discount-badge" data-ar="خصم '+format(discount,'ar')+'٪" data-en="'+format(discount,'en')+'% off">'+(language==='ar'?'خصم '+format(discount,'ar')+'٪':format(discount,'en')+'% off')+'</span>':'';
      var oldMarkup=discount?'<del data-ar="'+format(price,'ar')+'" data-en="'+format(price,'en')+'">'+format(price,language)+'</del>':'';
      var category=CATEGORY_LABELS[offer.category]||{ar:'',en:''};
      var description=offer.description||category[language]||'';
      article.innerHTML=image+'<div class="offer-card-body"><div class="offer-card-top"><div><h3>'+escapeHtml(offer.title||'عرض ساوند')+'</h3><p>'+escapeHtml(description)+'</p></div>'+discountMarkup+'</div><div class="offer-price"><div>'+oldMarkup+'<b data-ar="'+format(finalPrice,'ar')+'" data-en="'+format(finalPrice,'en')+'">'+format(finalPrice,language)+'</b> <span data-ar="د.ع" data-en="IQD">'+(language==='ar'?'د.ع':'IQD')+'</span></div><small data-ar="السعر الحالي" data-en="Current price">'+(language==='ar'?'السعر الحالي':'Current price')+'</small></div></div>';
      grid.appendChild(article);
    });
  }

  function apply(){applyItemOverrides(latest);renderOffers(latest)}

  async function refresh(){
    try{
      var response=await fetch('/api/menu',{cache:'no-store'});
      if(!response.ok)return;
      var incoming=await response.json();
      latest=incoming&&typeof incoming==='object'?incoming:latest;
      apply();
    }catch(e){}
  }

  refresh();
  window.addEventListener('pageshow',refresh);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
  setInterval(function(){if(!document.hidden)refresh()},20000);
  new MutationObserver(function(mutations){
    if(mutations.some(function(mutation){return mutation.attributeName==='lang'}))apply();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
