(function(){
  "use strict";
  function applySelectedConversation(){
    var params=new URLSearchParams(window.location.search);
    if(!params.has("title"))return;
    var vm=document.getElementById("vueApp");
    vm=vm&&vm.__vue__;
    if(!vm){setTimeout(applySelectedConversation,80);return;}
    var selected=null;
    try{selected=JSON.parse(localStorage.getItem("wechat_simulator_selected_conversation"));}catch(e){}
    var title=params.get("title")||(selected&&selected.name);
    if(title)vm.$set(vm.setting,"title",title);
    if(selected&&vm.users&&vm.users.length>1){
      vm.$set(vm.users[1],"name",selected.name||vm.users[1].name);
      if(selected.avatar)vm.$set(vm.users[1],"image",selected.avatar);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applySelectedConversation);
  else applySelectedConversation();
})();
