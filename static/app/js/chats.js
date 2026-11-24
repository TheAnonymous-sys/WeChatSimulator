(function () {
  "use strict";
  var STORAGE_KEY = "wechat_simulator_conversations_v4";
  var defaults = {
    settings: { time: "14:56", battery: 82, network: "5G", displayScale: "standard", showWindows: true, activeTab: "chats" },
    conversations: [
      { id: "c1", name: "林然", message: "晚点回来，记得先吃饭。", time: "10:45", unread: 0, pinned: true, muted: false, draft: "", avatar: "" },
      { id: "c2", name: "木木", message: "[图片]", time: "10:37", unread: 0, pinned: true, muted: false, draft: "", avatar: "" },
      { id: "c3", name: "课题讨论群", message: "张慧娟：大家开会啦", time: "14:56", unread: 2, pinned: false, muted: false, draft: "", avatar: "" },
      { id: "c4", name: "公众号", message: "今日更新：欢迎查看新内容", time: "14:53", unread: 0, pinned: false, muted: false, draft: "", avatar: "" },
      { id: "c5", name: "计算组", message: "张慧娟：进会议了", time: "14:49", unread: 0, pinned: false, muted: false, draft: "", avatar: "" }
    ]
  };
  var state = loadState();
  var navigation = [];
  var contextConversationId = "";
  var pressTimer = 0;
  var editors = document.getElementById("conversationEditors");
  var list = document.getElementById("conversationList");
  var template = document.getElementById("conversationEditorTemplate");
  var phone = document.getElementById("phonePreview");

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.settings && Array.isArray(saved.conversations)) {
        saved.settings = Object.assign({}, defaults.settings, saved.settings);
        return saved;
      }
    } catch (error) {}
    return clone(defaults);
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character];
    });
  }
  function orderedConversations() {
    return state.conversations.map(function (item, index) { return { item: item, index: index }; })
      .sort(function (a, b) { return Number(!!b.item.pinned) - Number(!!a.item.pinned) || a.index - b.index; })
      .map(function (entry) { return entry.item; });
  }
  function defaultAvatar(name, index, className) {
    var colors = [["#77c59a", "#2f8f60"], ["#7ca6dc", "#4b6fa8"], ["#dda26b", "#b8723c"], ["#a993d3", "#7057a4"]];
    var color = colors[index % colors.length];
    return '<div class="' + (className || "conversation-avatar") + ' default-avatar" style="background:linear-gradient(135deg,' + color[0] + ',' + color[1] + ')">' + escapeHtml((name || "聊").slice(0, 1)) + "</div>";
  }
  function render() { applySettings(); renderEditors(); renderPreview(); saveState(); }
  function applySettings() {
    document.getElementById("phoneTime").value = state.settings.time;
    document.getElementById("battery").value = state.settings.battery;
    document.getElementById("network").value = state.settings.network;
    document.getElementById("displayScale").value = state.settings.displayScale;
    document.getElementById("showWindows").checked = state.settings.showWindows;
    document.getElementById("previewTime").textContent = state.settings.time || "10:08";
    document.getElementById("previewNetwork").textContent = state.settings.network;
    document.getElementById("batteryText").textContent = Math.max(0, Math.min(100, Number(state.settings.battery) || 0)) + "%";
    document.getElementById("desktopLogin").style.display = state.settings.showWindows ? "flex" : "none";
    phone.classList.toggle("standard", state.settings.displayScale === "standard");
    if (!navigation.length) showPrimary(state.settings.activeTab || "chats", false);
  }
  function renderPreview() {
    var total = 0;
    list.innerHTML = orderedConversations().map(function (item, index) {
      var unread = Math.max(0, Math.min(99, Number(item.unread) || 0));
      if (!item.muted) total += unread;
      var avatar = item.avatar ? '<img class="conversation-avatar" src="' + item.avatar + '" alt="">' : defaultAvatar(item.name, index);
      var badge = unread ? (item.muted ? '<span class="unread-badge unread-dot"></span>' : '<span class="unread-badge">' + (unread > 99 ? "99+" : unread) + "</span>") : "";
      var draft = item.draft ? '<span class="draft">[' + escapeHtml(item.draft) + "] </span>" : "";
      return '<div class="conversation-row tappable ' + (item.pinned ? "pinned" : "") + '" data-id="' + escapeHtml(item.id) + '"><div class="conversation-avatar-wrap">' + avatar + badge + '</div><div class="conversation-main"><div class="conversation-top"><span class="conversation-name">' + escapeHtml(item.name || "未命名会话") + '</span><span class="conversation-time">' + escapeHtml(item.time) + '</span></div><div class="conversation-bottom"><span class="conversation-message">' + draft + escapeHtml(item.message) + "</span>" + (item.muted ? '<span class="mute-icon"></span>' : "") + "</div></div></div>";
    }).join("");
    document.getElementById("totalUnread").textContent = total ? String(Math.min(total, 99)) + (total > 99 ? "+" : "") : "";
    if (!navigation.length) updatePrimaryHeader(total);
  }
  function updatePrimaryHeader(total) {
    var tab = state.settings.activeTab || "chats";
    var titles = { chats: "微信", contacts: "通讯录", discover: "发现", me: "" };
    var left = document.getElementById("headerLeft");
    document.getElementById("headerTitle").textContent = tab === "chats" && total ? "微信(" + total + ")" : titles[tab];
    left.className = "header-icon more-dots";
    left.textContent = "••";
    left.setAttribute("aria-label", "更多");
    left.style.visibility = tab === "chats" ? "visible" : "hidden";
    document.querySelector(".header-right").style.visibility = tab === "me" ? "hidden" : "visible";
    phone.classList.toggle("me-active", tab === "me");
  }
  function showPrimary(tab, shouldSave) {
    if (!document.querySelector('[data-screen="' + tab + '"]')) tab = "chats";
    navigation = [];
    state.settings.activeTab = tab;
    document.querySelectorAll(".secondary-screen").forEach(function (screen) { screen.classList.remove("active"); });
    document.querySelectorAll(".app-screen").forEach(function (screen) { screen.classList.toggle("active", screen.dataset.screen === tab); });
    document.querySelectorAll(".tab").forEach(function (button) { button.classList.toggle("active", button.dataset.tab === tab); });
    document.getElementById("tabBar").classList.remove("hidden");
    document.getElementById("wechatContent").scrollTop = 0;
    var total = state.conversations.reduce(function (sum, item) { return sum + (item.muted ? 0 : (Number(item.unread) || 0)); }, 0);
    updatePrimaryHeader(total);
    closeTransientOverlays();
    if (shouldSave !== false) saveState();
  }
  function routeTitle(route, payload) {
    if (route === "chat") return payload.name || "聊天";
    if (route === "contact-profile") return "详细资料";
    if (route === "moments") return "朋友圈";
    if (route === "settings") return "设置";
    if (route === "my-profile") return "个人信息";
    return payload.title || "";
  }
  function openRoute(route, payload) {
    payload = payload || {};
    var screen = document.querySelector('[data-route="' + route + '"]');
    if (!screen) return;
    navigation.push({ route: route, payload: payload });
    document.querySelectorAll(".app-screen,.secondary-screen").forEach(function (item) { item.classList.remove("active"); });
    screen.classList.add("active");
    document.getElementById("tabBar").classList.add("hidden");
    phone.classList.remove("me-active");
    var left = document.getElementById("headerLeft");
    left.className = "header-icon back-button";
    left.textContent = "‹";
    left.setAttribute("aria-label", "返回");
    left.style.visibility = "visible";
    document.getElementById("headerTitle").textContent = routeTitle(route, payload);
    document.querySelector(".header-right").style.visibility = route === "chat" ? "visible" : "hidden";
    document.getElementById("openSearch").style.display = "none";
    document.getElementById("openPlus").style.display = route === "chat" ? "block" : "none";
    document.getElementById("wechatContent").scrollTop = 0;
    hydrateRoute(route, payload);
    closeTransientOverlays();
  }
  function hydrateRoute(route, payload) {
    if (route === "chat") {
      var item = state.conversations.find(function (entry) { return entry.id === payload.id; }) || payload;
      var avatar = item.avatar ? '<img class="bubble-avatar" src="' + item.avatar + '" alt="">' : defaultAvatar(item.name, 0, "bubble-avatar");
      document.getElementById("chatThread").innerHTML = '<div class="chat-time-label">' + escapeHtml(item.time || "刚刚") + '</div><div class="message-row incoming">' + avatar + '<div class="message-bubble">' + escapeHtml(item.message || "你好") + '</div></div><div class="message-row outgoing"><div class="message-bubble">好的，我看到了。</div><span class="bubble-avatar default-avatar">林</span></div>';
      if (item.id) { item.unread = 0; renderPreview(); saveState(); }
    }
    if (route === "contact-profile") {
      document.getElementById("contactProfileName").textContent = payload.name || "林然";
      document.getElementById("contactProfileAvatar").textContent = (payload.name || "林").slice(0, 1);
      document.getElementById("sendToContact").dataset.contactName = payload.name || "林然";
    }
    if (route === "placeholder") document.getElementById("placeholderCopy").textContent = (payload.title || "该功能") + "页面将在后续补全";
  }
  function goBack() {
    if (!navigation.length) return;
    navigation.pop();
    if (!navigation.length) {
      document.getElementById("openSearch").style.display = "block";
      document.getElementById("openPlus").style.display = "block";
      showPrimary(state.settings.activeTab || "chats", false);
      return;
    }
    var previous = navigation[navigation.length - 1];
    navigation.pop();
    openRoute(previous.route, previous.payload);
  }
  function renderEditors() {
    editors.innerHTML = "";
    state.conversations.forEach(function (item, index) {
      var fragment = template.content.cloneNode(true);
      var card = fragment.querySelector(".conversation-editor"); card.dataset.id = item.id;
      fragment.querySelector(".card-title").textContent = item.name || "未命名会话";
      var mini = fragment.querySelector(".avatar-mini"); if (item.avatar) mini.style.backgroundImage = 'url("' + item.avatar.replace(/"/g, "%22") + '")';
      fragment.querySelector(".avatar-upload img").src = item.avatar || makeAvatarData(item.name, index);
      setValue(fragment, ".field-name", item.name); setValue(fragment, ".field-time", item.time); setValue(fragment, ".field-message", item.message); setValue(fragment, ".field-unread", item.unread); setValue(fragment, ".field-draft", item.draft);
      fragment.querySelector(".field-pinned").checked = !!item.pinned; fragment.querySelector(".field-muted").checked = !!item.muted;
      bindCard(fragment, item, index); editors.appendChild(fragment);
    });
  }
  function setValue(root, selector, value) { root.querySelector(selector).value = value == null ? "" : value; }
  function updateItem(id, key, value) { var item = state.conversations.find(function (row) { return row.id === id; }); if (!item) return; item[key] = value; renderPreview(); saveState(); var card = editors.querySelector('[data-id="' + id + '"]'); if (card && key === "name") card.querySelector(".card-title").textContent = value || "未命名会话"; }
  function bindCard(root, item, index) {
    var card = root.querySelector(".conversation-editor");
    [[".field-name", "name"], [".field-time", "time"], [".field-message", "message"], [".field-draft", "draft"]].forEach(function (pair) { root.querySelector(pair[0]).addEventListener("input", function (event) { updateItem(item.id, pair[1], event.target.value); }); });
    root.querySelector(".field-unread").addEventListener("input", function (event) { updateItem(item.id, "unread", Math.max(0, Math.min(99, Number(event.target.value) || 0))); });
    root.querySelector(".field-pinned").addEventListener("change", function (event) { updateItem(item.id, "pinned", event.target.checked); });
    root.querySelector(".field-muted").addEventListener("change", function (event) { updateItem(item.id, "muted", event.target.checked); });
    root.querySelector(".collapse-button").addEventListener("click", function () { card.classList.toggle("collapsed"); });
    root.querySelector(".delete-conversation").addEventListener("click", function () { if (state.conversations.length === 1) return alert("至少保留一个会话"); state.conversations = state.conversations.filter(function (row) { return row.id !== item.id; }); render(); });
    root.querySelector(".move-up").addEventListener("click", function () { move(index, -1); }); root.querySelector(".move-down").addEventListener("click", function () { move(index, 1); });
    root.querySelector(".clear-avatar").addEventListener("click", function () { updateItem(item.id, "avatar", ""); renderEditors(); });
    root.querySelector(".field-avatar").addEventListener("change", function (event) { var file = event.target.files && event.target.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function () { resizeImage(reader.result, 320, function (data) { updateItem(item.id, "avatar", data); renderEditors(); }); }; reader.readAsDataURL(file); });
  }
  function move(index, delta) { var target = index + delta; if (target < 0 || target >= state.conversations.length) return; var moved = state.conversations.splice(index, 1)[0]; state.conversations.splice(target, 0, moved); render(); }
  function resizeImage(source, size, done) { var image = new Image(); image.onload = function () { var canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size; var context = canvas.getContext("2d"); var side = Math.min(image.width, image.height); context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size); done(canvas.toDataURL("image/jpeg", .86)); }; image.src = source; }
  function makeAvatarData(name, index) { var canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 160; var ctx = canvas.getContext("2d"); var colors = [["#77c59a", "#2f8f60"], ["#7ca6dc", "#4b6fa8"], ["#dda26b", "#b8723c"], ["#a993d3", "#7057a4"]][index % 4]; var gradient = ctx.createLinearGradient(0, 0, 160, 160); gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 160, 160); ctx.fillStyle = "#fff"; ctx.font = "500 64px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((name || "聊").slice(0, 1), 80, 84); return canvas.toDataURL("image/png"); }

  function openSearch() { closeTransientOverlays(); var overlay = document.getElementById("searchOverlay"); overlay.classList.add("active"); overlay.setAttribute("aria-hidden", "false"); setTimeout(function () { document.getElementById("searchInput").focus(); }, 60); }
  function closeSearch() { var overlay = document.getElementById("searchOverlay"); overlay.classList.remove("active"); overlay.setAttribute("aria-hidden", "true"); document.getElementById("searchInput").value = ""; document.getElementById("searchResults").innerHTML = ""; }
  function togglePlus() { closeSearch(); var menu = document.getElementById("plusMenu"); var open = !menu.classList.contains("active"); closeTransientOverlays(); menu.classList.toggle("active", open); document.getElementById("overlayShade").classList.toggle("active", open); }
  function closeTransientOverlays() { document.getElementById("plusMenu").classList.remove("active"); document.getElementById("contextMenu").classList.remove("active"); document.getElementById("overlayShade").classList.remove("active"); }
  function openContext(id, row) { contextConversationId = id; closeTransientOverlays(); var item = state.conversations.find(function (entry) { return entry.id === id; }); if (!item) return; var menu = document.getElementById("contextMenu"); menu.querySelector('[data-context="pin"]').textContent = item.pinned ? "取消置顶" : "置顶该聊天"; menu.querySelector('[data-context="mute"]').textContent = item.muted ? "开启消息提醒" : "消息免打扰"; menu.classList.add("active"); document.getElementById("overlayShade").classList.add("active"); row.classList.add("pressed"); setTimeout(function () { row.classList.remove("pressed"); }, 180); }

  document.getElementById("phoneTime").addEventListener("input", function (event) { state.settings.time = event.target.value; applySettings(); saveState(); });
  document.getElementById("battery").addEventListener("input", function (event) { state.settings.battery = event.target.value; applySettings(); saveState(); });
  document.getElementById("network").addEventListener("change", function (event) { state.settings.network = event.target.value; applySettings(); saveState(); });
  document.getElementById("displayScale").addEventListener("change", function (event) { state.settings.displayScale = event.target.value; applySettings(); saveState(); });
  document.getElementById("showWindows").addEventListener("change", function (event) { state.settings.showWindows = event.target.checked; applySettings(); saveState(); });
  document.getElementById("addConversation").addEventListener("click", function () { state.conversations.push({ id: uid(), name: "新会话", message: "请输入消息摘要", time: state.settings.time, unread: 0, pinned: false, muted: false, draft: "", avatar: "" }); render(); setTimeout(function () { editors.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" }); }, 0); });
  document.getElementById("resetAll").addEventListener("click", function () { if (confirm("恢复示例内容？当前编辑的数据会被覆盖。")) { state = clone(defaults); navigation = []; render(); } });
  document.querySelectorAll(".tab").forEach(function (button) { button.addEventListener("click", function () { document.getElementById("openSearch").style.display = "block"; document.getElementById("openPlus").style.display = "block"; showPrimary(button.dataset.tab, true); }); });
  document.getElementById("headerLeft").addEventListener("click", function () { if (navigation.length) goBack(); });
  document.getElementById("openSearch").addEventListener("click", openSearch); document.getElementById("closeSearch").addEventListener("click", closeSearch); document.getElementById("openPlus").addEventListener("click", togglePlus); document.getElementById("overlayShade").addEventListener("click", closeTransientOverlays);
  document.getElementById("searchInput").addEventListener("input", function (event) { var query = event.target.value.trim().toLowerCase(); var results = query ? orderedConversations().filter(function (item) { return (item.name + " " + item.message).toLowerCase().indexOf(query) >= 0; }) : []; document.getElementById("searchResults").innerHTML = results.map(function (item) { return '<button type="button" data-search-id="' + escapeHtml(item.id) + '"><span class="default-avatar">' + escapeHtml(item.name.slice(0, 1)) + '</span><b>' + escapeHtml(item.name) + '</b></button>'; }).join("") || (query ? "<p>无结果</p>" : ""); });
  document.getElementById("searchResults").addEventListener("click", function (event) { var button = event.target.closest("[data-search-id]"); if (!button) return; var item = state.conversations.find(function (entry) { return entry.id === button.dataset.searchId; }); closeSearch(); if (item) openRoute("chat", item); });
  document.getElementById("sendToContact").addEventListener("click", function (event) { var name = event.currentTarget.dataset.contactName || "林然"; var existing = state.conversations.find(function (entry) { return entry.name === name; }); openRoute("chat", existing || { name: name, message: "你好", time: "刚刚" }); });
  list.addEventListener("click", function (event) { var row = event.target.closest(".conversation-row"); if (!row) return; var item = state.conversations.find(function (entry) { return entry.id === row.dataset.id; }); if (item) openRoute("chat", item); });
  list.addEventListener("contextmenu", function (event) { var row = event.target.closest(".conversation-row"); if (!row) return; event.preventDefault(); openContext(row.dataset.id, row); });
  list.addEventListener("pointerdown", function (event) { var row = event.target.closest(".conversation-row"); if (!row) return; pressTimer = window.setTimeout(function () { openContext(row.dataset.id, row); }, 560); });
  ["pointerup", "pointercancel", "pointermove"].forEach(function (type) { list.addEventListener(type, function () { window.clearTimeout(pressTimer); }); });
  document.getElementById("contextMenu").addEventListener("click", function (event) { var button = event.target.closest("[data-context]"); var item = state.conversations.find(function (entry) { return entry.id === contextConversationId; }); if (!button || !item) return; if (button.dataset.context === "pin") item.pinned = !item.pinned; if (button.dataset.context === "unread") item.unread = item.unread ? 0 : 1; if (button.dataset.context === "mute") item.muted = !item.muted; closeTransientOverlays(); render(); });
  phone.addEventListener("click", function (event) { var contact = event.target.closest("[data-contact]"); var route = event.target.closest("[data-route-link]"); var placeholder = event.target.closest("[data-placeholder]"); if (contact) openRoute("contact-profile", { name: contact.dataset.contact }); if (route) openRoute(route.dataset.routeLink, {}); if (placeholder && !placeholder.closest("#plusMenu")) openRoute("placeholder", { title: placeholder.dataset.placeholder }); });
  document.getElementById("plusMenu").addEventListener("click", function (event) { var button = event.target.closest("[data-placeholder]"); if (!button) return; closeTransientOverlays(); openRoute("placeholder", { title: button.dataset.placeholder }); });
  document.getElementById("saveImage").addEventListener("click", function () { var tip = document.getElementById("saveTip"); if (typeof html2canvas !== "function") { tip.textContent = "截图组件加载失败，请联网刷新后重试"; return; } tip.textContent = "正在生成图片…"; phone.classList.add("exporting"); html2canvas(phone, { scale: 3, useCORS: true, backgroundColor: "#ededed" }).then(function (canvas) { var link = document.createElement("a"); link.download = (document.getElementById("headerTitle").textContent || "微信页面") + ".png"; link.href = canvas.toDataURL("image/png"); link.click(); tip.textContent = "图片已生成"; }).catch(function () { tip.textContent = "生成失败，请重试"; }).finally(function () { phone.classList.remove("exporting"); }); });
  render();
})();
