(function(){
  var b=document.querySelector('.navbtn'), n=document.querySelector('nav');
  if(b&&n){
    b.addEventListener('click',function(){
      var open=n.classList.toggle('navopen');
      b.setAttribute('aria-expanded',open?'true':'false');
    });
    n.addEventListener('click',function(e){ if(e.target.tagName==='A') n.classList.remove('navopen'); });
    document.addEventListener('click',function(e){ if(!n.contains(e.target)) n.classList.remove('navopen'); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') n.classList.remove('navopen'); });
  }
  var t=document.getElementById('themebtn');
  if(t) t.addEventListener('click',function(){
    var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    try{ localStorage.setItem('mws-theme',next); }catch(e){}
  });
  var links=[].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  var targets=links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
  function sync(){
    var y=window.scrollY+96,best=-1;
    targets.forEach(function(t,i){ if(t&&t.offsetTop<=y) best=i; });
    links.forEach(function(a,i){ a.classList.toggle('on',i===best); });
  }
  var tick=false;
  window.addEventListener('scroll',function(){
    if(tick) return; tick=true;
    requestAnimationFrame(function(){ sync(); tick=false; });
  });
  sync();
})();
