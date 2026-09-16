(function(){
  'use strict';
  var KEY='sound-menu-admin-v1';
  var CATEGORY_LABELS={
    cafe:{ar:'الكافيه والمطعم',en:'Café & restaurant'},
    ps5:{ar:'البلي',en:'PlayStation'},
    pc:{ar:'الحاسبات',en:'Gaming PCs'},
    cinema:{ar:'السينما',en:'Cinema'},
    billiards:{ar:'البلياردو والسنوكر',en:'Billiards & snooker'},
    vr:{ar:'الواقع الافتراضي',en:'Virtual reality'}
  };
  function read(){
    try{
      var value=JSON.parse(localStorage.getItem(KEY)||'{}');
      return value&&typeof value==='object'?value:{};
    }catch(e){return {}}
  }
  function format(value,lang){
    return Number(value||0).toLocaleString(lang==='ar'?'ar-IQ':'en-US');
  }
  function priceAfterDiscount(price,discount){
    return Math.max(0,Math.round(Number(price||0)*(100-Math.min(100,Math.max(0,Number(discount||0))))/100));
  }
  function applyItemOverrides(data){
    var items=data.items||{};
    document.querySelectorAll('[data-menu-id]').forEach(function(row){
      var id=row.getAttribute('data-menu-id');
      var item=items[id]||{};
      var dd=row.querySelector('dd');
      var priceNode=dd&&dd.querySelector('b');
      if(!dd||!priceNode)return;
      var base=Number(item.price||dd.getAttribute('data-original-price')||dd.getAttribute('data-price')||0);
      if(!dd.hasAttribute('data-original-price'))dd.setAttribute('data-original-price',dd.getAttribute('data-price')||String(base));
      var discount=Math.min(100,Math.max(0,Number(item.discount||0)));
      var finalPrice=priceAfterDiscount(base,discount);
      row.classList.toggle('is-admin-hidden',item.hidden===true);
      row.classList.toggle('has-discount',discount>0);
      row.querySelectorAll('.old-price,.discount-badge').forEach(function(node){node.remove()});
      dd.setAttribute('data-price',String(finalPrice));
      priceNode.setAttribute('data-ar',format(finalPrice,'ar'));
      priceNode.setAttribute('data-en',format(finalPrice,'en'));
      priceNode.textContent=format(finalPrice,document.documentElement.lang);
      if(discount>0){
        var old=document.createElement('del');
        old.className='old-price';
        old.setAttribute('data-ar',format(base,'ar'));
        old.setAttribute('data-en',format(base,'en'));
        old.textContent=format(base,document.documentElement.lang);
        dd.insertBefore(old,priceNode);
        var badge=document.createElement('span');
        badge.className='discount-badge';
        badge.setAttribute('data-ar','خصم '+format(discount,'ar')+'٪');
        badge.setAttribute('data-en',format(discount,'en')+'% off');
        badge.textContent=document.documentElement.lang==='ar'?badge.getAttribute('data-ar'):badge.getAttribute('data-en');
        dd.appendChild(badge);
      }
    });
  }
  function ensureOfferSection(){
    var section=document.getElementById('admin-offers');
    if(section)return section;
    section=document.createElement('section');
    section.className='custom-offers';
    section.id='admin-offers';
    section.setAttribute('aria-labelledby','admin-offers-title');
    section.innerHTML='<div class="section-heading"><h2 id="admin-offers-title" data-ar="العروض الحالية" data-en="Current offers">العروض الحالية</h2></div><div class="offer-grid"></div>';
    var location=document.getElementById('location');
    location.parentNode.insertBefore(section,location);
    return section;
  }
  function renderOffers(data){
    var section=ensureOfferSection();
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
      link.innerHTML='<span data-ar="العروض" data-en="Offers">العروض</span>';
      nav.insertBefore(link,nav.firstChild);
    }
    offers.forEach(function(offer){
      var price=Number(offer.price||0);
      var discount=Math.min(100,Math.max(0,Number(offer.discount||0)));
      var finalPrice=priceAfterDiscount(price,discount);
      var article=document.createElement('article');
      article.className='offer-card';
      var image=offer.imageUrl?'<img src="'+escapeAttribute(offer.imageUrl)+'" alt="'+escapeAttribute(offer.title||'عرض ساوند')+'" loading="lazy" decoding="async">':'';
      var discountMarkup=discount?'<span class="discount-badge" data-ar="خصم '+format(discount,'ar')+'٪" data-en="'+format(discount,'en')+'% off">خصم '+format(discount,'ar')+'٪</span>':'';
      var oldMarkup=discount?'<del data-ar="'+format(price,'ar')+'" data-en="'+format(price,'en')+'">'+format(price,'ar')+'</del>':'';
      article.innerHTML=image+'<div class="offer-card-body"><div class="offer-card-top"><div><h3>'+escapeHtml(offer.title||'عرض ساوند')+'</h3><p>'+escapeHtml(offer.description||CATEGORY_LABELS[offer.category]?.ar||'')+'</p></div>'+discountMarkup+'</div><div class="offer-price"><div>'+oldMarkup+'<b data-ar="'+format(finalPrice,'ar')+'" data-en="'+format(finalPrice,'en')+'">'+format(finalPrice,'ar')+'</b> <span data-ar="د.ع" data-en="IQD">د.ع</span></div><small data-ar="السعر الحالي" data-en="Current price">السعر الحالي</small></div></div>';
      grid.appendChild(article);
    });
  }
  function escapeHtml(value){
    return String(value||'').replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]});
  }
  function escapeAttribute(value){return escapeHtml(value).replace(/\u0060/g,'&#096;')}
  var data=read();
  applyItemOverrides(data);
  renderOffers(data);
})();

