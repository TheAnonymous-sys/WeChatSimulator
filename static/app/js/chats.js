(function(){
  "use strict";
  var STORAGE_KEY="wechat_simulator_conversations_v1";
  var defaults={
    settings:{time:"10:08",battery:82,network:"5G",showSearch:true},
    conversations:[
      {id:"c1",name:"林然",message:"晚点回来，记得先吃饭。",time:"10:08",unread:2,pinned:true,muted:false,draft:"",avatar:""},
      {id:"c2",name:"木木",message:"[图片]",time:"09:42",unread:0,pinned:false,muted:false,draft:"",avatar:""},
      {id:"c3",name:"文件传输助手",message:"研究资料.zip",time:"昨天",unread:0,pinned:false,muted:true,draft:"",avatar:""},
      {id:"c4",name:"课题讨论群",message:"导师：下午把新版发群里",time:"星期一",unread:8,pinned:false,muted:true,draft:"草稿",avatar:""}
    ]
  };
  var state=loadState();
  var editors=document.getElementById("conversationEditors");
  var list=document.getElementById("conversationList");
  var template=document.getElementById("conversationEditorTemplate");

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function loadState(){
    try{var saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&saved.settings&&Array.isArray(saved.conversations))return saved;}catch(e){}
    return clone(defaults);
  }
  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function uid(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  function escapeHtml(value){return String(value||"").replace(/[&<>'"]/g,function(char){return{"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char];});}
  function defaultAvatar(name,index){
    var colors=[["#77c59a","#2f8f60"],["#7ca6dc","#4b6fa8"],["#dda26b","#b8723c"],["#a993d3","#7057a4"]];
    var color=colors[index%colors.length];
    return '<div class="conversation-avatar default-avatar" style="background:linear-gradient(135deg,'+color[0]+','+color[1]+')">'+escapeHtml((name||"聊").slice(0,1))+'</div>';
  }
  function render(){
    applySettings();renderEditors();renderPreview();saveState();
  }
  function applySettings(){
    document.getElementById("phoneTime").value=state.settings.time;
    document.getElementById("battery").value=state.settings.battery;
    document.getElementById("network").value=state.settings.network;
    document.getElementById("showSearch").checked=state.settings.showSearch;
    document.getElementById("previewTime").textContent=state.settings.time||"10:08";
    document.getElementById("previewNetwork").textContent=state.settings.network;
    document.getElementById("batteryFill").style.width=Math.max(0,Math.min(100,Number(state.settings.battery)||0))+"%";
    document.getElementById("searchRow").style.display=state.settings.showSearch?"block":"none";
  }
  function renderPreview(){
    var total=0;
    list.innerHTML=state.conversations.map(function(item,index){
      var unread=Math.max(0,Math.min(99,Number(item.unread)||0));total+=unread;
      var avatar=item.avatar?'<img class="conversation-avatar" src="'+item.avatar+'" alt="">':defaultAvatar(item.name,index);
      var badge=unread?(item.muted?'<span class="unread-badge unread-dot"></span>':'<span class="unread-badge">'+(unread>99?"99+":unread)+'</span>'):"";
      var draft=item.draft?'<span class="draft">['+escapeHtml(item.draft)+'] </span>':"";
      return '<div class="conversation-row '+(item.pinned?"pinned":"")+'" data-index="'+index+'"><div class="conversation-avatar-wrap">'+avatar+badge+'</div><div class="conversation-main"><div class="conversation-top"><span class="conversation-name">'+escapeHtml(item.name||"未命名会话")+'</span><span class="conversation-time">'+escapeHtml(item.time)+'</span></div><div class="conversation-bottom"><span class="conversation-message">'+draft+escapeHtml(item.message)+'</span>'+(item.muted?'<span class="mute-icon"></span>':"")+'</div></div></div>';
    }).join("");
    document.getElementById("totalUnread").textContent=total?String(Math.min(total,99))+(total>99?"+":""):"";
  }
  function renderEditors(){
    editors.innerHTML="";
    state.conversations.forEach(function(item,index){
      var fragment=template.content.cloneNode(true);var card=fragment.querySelector(".conversation-editor");card.dataset.id=item.id;
      fragment.querySelector(".card-title").textContent=item.name||"未命名会话";
      var mini=fragment.querySelector(".avatar-mini");
      if(item.avatar)mini.style.backgroundImage='url("'+item.avatar.replace(/"/g,"%22")+'")';
      var image=fragment.querySelector(".avatar-upload img");image.src=item.avatar||makeAvatarData(item.name,index);
      setValue(fragment,".field-name",item.name);setValue(fragment,".field-time",item.time);setValue(fragment,".field-message",item.message);setValue(fragment,".field-unread",item.unread);setValue(fragment,".field-draft",item.draft);
      fragment.querySelector(".field-pinned").checked=!!item.pinned;fragment.querySelector(".field-muted").checked=!!item.muted;
      bindCard(fragment,item,index);editors.appendChild(fragment);
    });
  }
  function setValue(root,selector,value){root.querySelector(selector).value=value==null?"":value;}
  function updateItem(id,key,value){var item=state.conversations.find(function(row){return row.id===id;});if(!item)return;item[key]=value;renderPreview();saveState();var card=editors.querySelector('[data-id="'+id+'"]');if(card&&key==="name")card.querySelector(".card-title").textContent=value||"未命名会话";}
  function bindCard(root,item,index){
    var card=root.querySelector(".conversation-editor");
    [[".field-name","name"],[".field-time","time"],[".field-message","message"],[".field-draft","draft"]].forEach(function(pair){root.querySelector(pair[0]).addEventListener("input",function(e){updateItem(item.id,pair[1],e.target.value);});});
    root.querySelector(".field-unread").addEventListener("input",function(e){updateItem(item.id,"unread",Math.max(0,Math.min(99,Number(e.target.value)||0)));});
    root.querySelector(".field-pinned").addEventListener("change",function(e){updateItem(item.id,"pinned",e.target.checked);});
    root.querySelector(".field-muted").addEventListener("change",function(e){updateItem(item.id,"muted",e.target.checked);});
    root.querySelector(".collapse-button").addEventListener("click",function(){card.classList.toggle("collapsed");});
    root.querySelector(".delete-conversation").addEventListener("click",function(){if(state.conversations.length===1)return alert("至少保留一个会话");state.conversations=state.conversations.filter(function(row){return row.id!==item.id;});render();});
    root.querySelector(".move-up").addEventListener("click",function(){move(index,-1);});root.querySelector(".move-down").addEventListener("click",function(){move(index,1);});
    root.querySelector(".clear-avatar").addEventListener("click",function(){updateItem(item.id,"avatar","");renderEditors();});
    root.querySelector(".field-avatar").addEventListener("change",function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(){resizeImage(reader.result,320,function(data){updateItem(item.id,"avatar",data);renderEditors();});};reader.readAsDataURL(file);});
  }
  function move(index,delta){var target=index+delta;if(target<0||target>=state.conversations.length)return;var moved=state.conversations.splice(index,1)[0];state.conversations.splice(target,0,moved);render();}
  function resizeImage(source,size,done){var image=new Image();image.onload=function(){var canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;var context=canvas.getContext("2d");var side=Math.min(image.width,image.height);context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,size,size);done(canvas.toDataURL("image/jpeg",.86));};image.src=source;}
  function makeAvatarData(name,index){var canvas=document.createElement("canvas");canvas.width=160;canvas.height=160;var ctx=canvas.getContext("2d");var colors=[["#77c59a","#2f8f60"],["#7ca6dc","#4b6fa8"],["#dda26b","#b8723c"],["#a993d3","#7057a4"]][index%4];var gradient=ctx.createLinearGradient(0,0,160,160);gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,160,160);ctx.fillStyle="#fff";ctx.font="500 64px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText((name||"聊").slice(0,1),80,84);return canvas.toDataURL("image/png");}
  document.getElementById("phoneTime").addEventListener("input",function(e){state.settings.time=e.target.value;applySettings();saveState();});
  document.getElementById("battery").addEventListener("input",function(e){state.settings.battery=Math.max(0,Math.min(100,Number(e.target.value)||0));applySettings();saveState();});
  document.getElementById("network").addEventListener("change",function(e){state.settings.network=e.target.value;applySettings();saveState();});
  document.getElementById("showSearch").addEventListener("change",function(e){state.settings.showSearch=e.target.checked;applySettings();saveState();});
  document.getElementById("addConversation").addEventListener("click",function(){state.conversations.push({id:uid(),name:"新会话",message:"请输入消息摘要",time:state.settings.time,unread:0,pinned:false,muted:false,draft:"",avatar:""});render();setTimeout(function(){editors.lastElementChild.scrollIntoView({behavior:"smooth",block:"center"});},0);});
  document.getElementById("resetAll").addEventListener("click",function(){if(confirm("恢复示例内容？当前编辑的数据会被覆盖。")){state=clone(defaults);render();}});
  list.addEventListener("click",function(e){var row=e.target.closest(".conversation-row");if(!row)return;var item=state.conversations[Number(row.dataset.index)];localStorage.setItem("wechat_simulator_selected_conversation",JSON.stringify(item));window.location.href="../index.html?title="+encodeURIComponent(item.name||"");});
  document.getElementById("saveImage").addEventListener("click",function(){
    var phone=document.getElementById("phonePreview");var tip=document.getElementById("saveTip");
    if(typeof html2canvas!=="function"){tip.textContent="截图组件加载失败，请联网刷新后重试";return;}
    tip.textContent="正在生成图片…";phone.classList.add("exporting");
    html2canvas(phone,{scale:3,useCORS:true,backgroundColor:"#ededed"}).then(function(canvas){var link=document.createElement("a");link.download="微信会话列表.png";link.href=canvas.toDataURL("image/png");link.click();tip.textContent="图片已生成";}).catch(function(){tip.textContent="生成失败，请重试";}).finally(function(){phone.classList.remove("exporting");});
  });
  render();
})();
