(function () {
  const WORKSPACE_ROUTES = [
    "dashboard.html",
    "scene-task.html",
    "material-library.html",
    "lora-assets.html",
    "api-control.html"
  ];

  const ACCOUNT_ROUTES = [
    "member-center.html",
    "settings.html",
    "marketing.html"
  ];

  const PAGE_INDEX = {
    "dashboard.html": 0,
    "scene-task.html": 1,
    "material-library.html": 2,
    "lora-assets.html": 3,
    "api-control.html": 4
  };

  const RESULT_ARCHIVE_ROUTE = "material-library.html";
  const ASSISTANT_POSITION_KEY = "platform:assistantPosition";

  const ASSISTANT_ACTIONS = {
    cutout: {
      label: "商品抠图",
      prompt: "帮我做商品抠图。",
      toast: "已记录“商品抠图”轻处理需求。"
    },
    clean: {
      label: "清理背景",
      prompt: "帮我清理背景。",
      toast: "已记录“清理背景”轻处理需求。"
    },
    enhance: {
      label: "提高清晰度",
      prompt: "帮我提升图片清晰度。",
      toast: "已记录“提高清晰度”轻处理需求。"
    },
    edge: {
      label: "边缘优化",
      prompt: "帮我优化边缘细节。",
      toast: "已记录“边缘优化”轻处理需求。"
    },
    repair: {
      label: "修复当前结果",
      prompt: "帮我修复当前结果细节。",
      toast: ""
    }
  };

  let floatingAssistant = null;
  let accountPopover = null;

  function currentPage() {
    return decodeURIComponent(window.location.pathname.split("/").pop() || "marketing.html");
  }

  function isAssistantPage(page) {
    return (page || currentPage()) === "assistant.html";
  }

  function isAssistantNavItem(node) {
    if (!node) return false;
    const href = node.getAttribute("href") || "";
    const text = (node.textContent || "").replace(/\s+/g, "");
    return href.indexOf("assistant.html") !== -1 || text.indexOf("智能助手") !== -1;
  }

  function assistantFallbackRoute() {
    const mock = getMock();
    const lastPage = mock ? mock.getLastPage() : "";
    if (lastPage && !isAssistantPage(lastPage)) return lastPage;
    return "dashboard.html";
  }

  function readAssistantPosition() {
    try {
      const raw = window.localStorage.getItem(ASSISTANT_POSITION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeAssistantPosition(position) {
    if (!position) return;
    try {
      window.localStorage.setItem(ASSISTANT_POSITION_KEY, JSON.stringify(position));
    } catch (error) {
      return;
    }
  }

  function getMock() {
    return window.platformMock || null;
  }

  function getTaskCatalog() {
    const mock = getMock();
    return mock ? mock.getTaskCatalog() : {};
  }

  function getTaskList() {
    const catalog = getTaskCatalog();
    return Object.keys(catalog).map(function (key) {
      return catalog[key];
    });
  }

  function getTaskMeta(taskKey) {
    const mock = getMock();
    return mock ? mock.getTaskMeta(taskKey) : null;
  }

  function getTaskState() {
    const mock = getMock();
    return mock ? mock.getTaskState() : null;
  }

  function findTaskKeyByName(name) {
    const tasks = getTaskList();
    for (let i = 0; i < tasks.length; i += 1) {
      if (tasks[i].name === name) return tasks[i].key;
    }
    return tasks[0] ? tasks[0].key : null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatFileSize(bytes) {
    if (!bytes) return "";
    const size = Number(bytes);
    if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + " MB";
    return Math.max(1, Math.round(size / 1024)) + " KB";
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatTimeLabel(timestamp) {
    if (!timestamp) return "刚刚";
    const value = new Date(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const prefix =
      timestamp >= startOfToday
        ? "今天"
        : timestamp >= startOfYesterday
          ? "昨天"
          : pad(value.getMonth() + 1) + "-" + pad(value.getDate());
    return prefix + " " + pad(value.getHours()) + ":" + pad(value.getMinutes());
  }

  function statusText(status, progress) {
    if (status === "uploaded") return "已上传";
    if (status === "configured") return "待生成";
    if (status === "generating") return "生成中 " + (progress || 0) + "%";
    if (status === "completed") return "已完成";
    if (status === "failed") return "失败";
    return "待创建";
  }

  function showToast(message) {
    if (!message) return;

    let host = document.getElementById("appToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "appToastHost";
      host.style.position = "fixed";
      host.style.right = "24px";
      host.style.bottom = "24px";
      host.style.zIndex = "9999";
      host.style.display = "grid";
      host.style.gap = "10px";
      document.body.appendChild(host);
    }

    const assistantHost = document.getElementById("floatingAssistantHost");
    if (assistantHost) {
      const assistantBottom = parseInt(window.getComputedStyle(assistantHost).bottom, 10) || 24;
      host.style.bottom = assistantBottom + 88 + "px";
    } else {
      host.style.bottom = "24px";
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.minWidth = "220px";
    toast.style.maxWidth = "360px";
    toast.style.padding = "12px 14px";
    toast.style.borderRadius = "14px";
    toast.style.background = "rgba(15,23,42,.92)";
    toast.style.color = "#fff";
    toast.style.fontSize = "12px";
    toast.style.lineHeight = "1.6";
    toast.style.boxShadow = "0 18px 36px rgba(15,23,42,.24)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity .18s ease, transform .18s ease";

    host.appendChild(toast);
    window.requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    window.setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      window.setTimeout(function () {
        toast.remove();
      }, 180);
    }, 2400);
  }

  function go(route, delay) {
    if (!route) return;
    if (route === "assistant.html") {
      window.setTimeout(function () {
        openAssistantWidget();
      }, delay || 0);
      return;
    }
    const mock = getMock();
    if (mock) mock.setLastPage(route);
    window.setTimeout(function () {
      document.body.classList.add("page-leaving");
      window.location.href = route;
    }, delay || 0);
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = text;
    });
  }

  function bindClick(selector, route, delay, beforeGo) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.addEventListener("click", function () {
        if (beforeGo && beforeGo(node) === false) return;
        if (route) go(route, delay);
      });
    });
  }

  function normalizeBranding() {
    setText(".brand strong, .brand-text strong", "AI 电商多模态设计平台");
    setText(".brand span, .brand-text span", "商用素材工作台");
    setText(".nav-title", "工作区");

    document.querySelectorAll(".sidebar .nav-title").forEach(function (node, index) {
      node.textContent = index === 0 ? "工作区" : "账户";
    });

    document.querySelectorAll(".quota-pill, .quota, .plan-tag").forEach(function (node) {
      if (!node.textContent || !node.textContent.trim()) {
        node.textContent = "专业版 · 剩余额度 6,580 点";
      }
    });

    const avatar = document.querySelector(".avatar");
    if (avatar) avatar.setAttribute("title", "用户头像");
  }

  function applyShellClasses() {
    const page = currentPage();

    document.querySelectorAll(".hero, .page-hero, .page-header").forEach(function (node) {
      node.classList.add("shell-main-card");
    });

    document.querySelectorAll(".right-rail .rail-card, .right .rail-card, .assistant-panel, .side-card, .right-card, .metric-card, .cap-card, .key-card").forEach(function (node) {
      node.classList.add("shell-main-card");
    });

    if (page === "scene-task.html") {
      document.querySelectorAll(".right-rail, .right").forEach(function (node) {
        node.classList.add("shell-right-rail");
      });
    }
  }

  function getAssistantContext() {
    const page = currentPage();
    const state = getTaskState();
    const task = state ? getTaskMeta(state.selectedTaskKey) : null;
    const status = state ? statusText(state.status, state.progress) : "待开始";
    const contextMap = {
      "dashboard.html": {
        title: "高频图片处理入口",
        intro: "适合先用快捷动作处理抠图、背景、清晰度，再继续进入主链路。"
      },
      "upload.html": {
        title: "上传前先把素材处理干净",
        intro: "如果原图边缘不稳或背景复杂，先轻处理再上传，后续生成会更稳。"
      },
      "scene-config.html": {
        title: "配置前确认素材状态",
        intro: "如果当前素材还不够干净，先做轻处理，再继续场景配置。"
      },
      "scene-task.html": {
        title: "任务生成中也能补轻处理",
        intro: "适合处理主体抠图、背景清理和边缘优化这类高频动作。"
      },
      "result.html": {
        title: "结果可先修，再导出或归档",
        intro: "如果结果只差一点细节，优先走轻处理，不必立刻重生。"
      },
      "history.html": {
        title: "历史任务也能继续修",
        intro: "复用历史素材前，先做轻处理能减少重新配置和重复试错。"
      },
      "material-library.html": {
        title: "素材复用前先做轻处理",
        intro: "对准备用于复用的素材先做清理，能提高后续任务的一次可用率。"
      },
      "lora-assets.html": {
        title: "训练前先稳定素材质量",
        intro: "LoRA 资产更依赖素材一致性，先处理边缘和背景更稳。"
      },
      "api-control.html": {
        title: "助手以产品动作形态存在",
        intro: "这里不再单独开页面，统一用悬浮助手承接低频对话和高频处理。"
      },
      "member-center.html": {
        title: "额度和套餐之外也能直接唤起助手",
        intro: "需要处理图片时，不用切页，直接用悬浮助手即可。"
      },
      "settings.html": {
        title: "设置页也保留统一助手入口",
        intro: "无需离开当前页，就能发起轻处理动作或做低频对话。"
      }
    };

    return {
      page: page,
      taskName: task ? task.name : "当前任务",
      status: status,
      title: (contextMap[page] || contextMap["dashboard.html"]).title,
      intro: (contextMap[page] || contextMap["dashboard.html"]).intro,
      quickActions: page === "result.html"
        ? ["repair", "edge", "clean", "enhance"]
        : ["cutout", "clean", "enhance", "edge"]
    };
  }

  function buildAssistantReply(prompt, context) {
    const content = String(prompt || "").toLowerCase();
    const taskLabel = context && context.taskName ? context.taskName : "当前任务";
    const nextStep = context && context.page === "result.html"
      ? "处理完后回到结果区继续导出或归档。"
      : context && context.page === "upload.html"
        ? "处理完后直接继续上传和配置。"
        : "处理完后继续当前主链路即可。";

    if (content.indexOf("抠图") !== -1 || content.indexOf("去背") !== -1) {
      return "这类需求适合先做主体抠图，再视情况补边缘优化。当前关联任务是“" + taskLabel + "”。" + nextStep;
    }
    if (content.indexOf("背景") !== -1 || content.indexOf("去背景") !== -1 || content.indexOf("清理") !== -1) {
      return "建议先清理背景，再检查主体边缘是否需要二次修整。这样更适合“" + taskLabel + "”的继续交付。" + nextStep;
    }
    if (content.indexOf("清晰") !== -1 || content.indexOf("模糊") !== -1 || content.indexOf("增强") !== -1) {
      return "这更适合走清晰度增强动作，先提细节，再决定是否继续生成或直接导出。" + nextStep;
    }
    if (content.indexOf("边缘") !== -1 || content.indexOf("发丝") !== -1 || content.indexOf("毛边") !== -1) {
      return "建议直接走边缘优化，重点处理主体轮廓、透明边和细碎毛边。" + nextStep;
    }
    if (content.indexOf("修复") !== -1 || content.indexOf("结果") !== -1) {
      return "如果只是局部问题，优先修复比整轮重生更省。你可以先用“修复当前结果”或“边缘优化”。";
    }
    return "高频图片处理优先点上面的快捷动作，复杂需求再对话描述。我会按“" + taskLabel + "”这个上下文给你建议。";
  }

  function mountFloatingAssistant() {
    if (floatingAssistant) return floatingAssistant;
    if (!document.body || document.body.getAttribute("data-shell-layout") !== "platform") return null;

    const host = document.createElement("div");
    host.id = "floatingAssistantHost";
    host.className = "assistant-fab-host";
    host.innerHTML =
      '<section class="floating-assistant-panel" aria-live="polite">' +
      '<div class="assistant-panel-head">' +
      '<div>' +
      '<span class="assistant-panel-tag">智能助手</span>' +
      '<strong id="assistantPanelTitle">高频图片处理入口</strong>' +
      '<p id="assistantPanelIntro">适合先用快捷动作处理抠图、背景、清晰度，再继续进入主链路。</p>' +
      '</div>' +
      '<button class="assistant-close" id="assistantCloseBtn" type="button" aria-label="关闭助手">×</button>' +
      '</div>' +
      '<div class="assistant-meta">' +
      '<span class="assistant-meta-pill" id="assistantTaskMeta">当前任务</span>' +
      '<span class="assistant-meta-pill" id="assistantStatusMeta">待开始</span>' +
      '</div>' +
      '<section class="assistant-workbench">' +
      '<div class="assistant-section-title"><strong>图片处理</strong><span>主要入口</span></div>' +
      '<div class="assistant-upload-card">' +
      '<input id="assistantImageInput" type="file" accept="image/*" hidden />' +
      '<div class="assistant-upload-copy">' +
      '<strong>先上传一张待处理图片</strong>' +
      '<p id="assistantUploadMeta">上传后可直接点击抠图、清理背景、清晰度增强等动作。</p>' +
      '</div>' +
      '<div class="assistant-upload-actions">' +
      '<button class="assistant-upload-btn" id="assistantUploadBtn" type="button">上传图片</button>' +
      '<button class="assistant-upload-link" id="assistantGoUploadBtn" type="button">进入上传页</button>' +
      '</div>' +
      '<div class="assistant-upload-preview assistant-upload-empty" id="assistantUploadPreview">尚未选择图片</div>' +
      '</div>' +
      '<div class="assistant-action-grid" id="assistantActionGrid"></div>' +
      '</section>' +
      '<section class="assistant-chat-section">' +
      '<div class="assistant-section-title"><strong>低频对话</strong><span>次要入口</span></div>' +
      '<div class="assistant-chat" id="assistantChatBox"></div>' +
      '<div class="assistant-input-row">' +
      '<input id="assistantQuickInput" type="text" placeholder="描述低频需求，例如：想先清理背景再继续生成" />' +
      '<button id="assistantSendBtn" type="button">发送</button>' +
      '</div>' +
      '<p class="assistant-note">高频动作优先点快捷按钮，复杂需求再用对话补充。</p>' +
      '</section>' +
      '</section>' +
      '<button class="assistant-fab" id="assistantFabBtn" type="button" aria-expanded="false" aria-controls="floatingAssistantHost">' +
      '<span class="assistant-fab-ring"></span>' +
      '<span class="assistant-fab-core">AI</span>' +
      '<span class="assistant-fab-tip">助手</span>' +
      '</button>';

    document.body.appendChild(host);

    const refs = {
      host: host,
      panel: host.querySelector(".floating-assistant-panel"),
      fab: document.getElementById("assistantFabBtn"),
      close: document.getElementById("assistantCloseBtn"),
      title: document.getElementById("assistantPanelTitle"),
      intro: document.getElementById("assistantPanelIntro"),
      taskMeta: document.getElementById("assistantTaskMeta"),
      statusMeta: document.getElementById("assistantStatusMeta"),
      uploadInput: document.getElementById("assistantImageInput"),
      uploadButton: document.getElementById("assistantUploadBtn"),
      uploadPageButton: document.getElementById("assistantGoUploadBtn"),
      uploadMeta: document.getElementById("assistantUploadMeta"),
      uploadPreview: document.getElementById("assistantUploadPreview"),
      actionGrid: document.getElementById("assistantActionGrid"),
      chatBox: document.getElementById("assistantChatBox"),
      input: document.getElementById("assistantQuickInput"),
      send: document.getElementById("assistantSendBtn")
    };

    const dragState = {
      pointerId: null,
      startX: 0,
      startY: 0,
      originLeft: 0,
      originTop: 0,
      moved: false,
      suppressClick: false
    };
    let localAsset = null;
    let localAssetUrl = "";

    function releaseLocalAssetUrl() {
      if (!localAssetUrl) return;
      try {
        window.URL.revokeObjectURL(localAssetUrl);
      } catch (error) {
        return;
      }
      localAssetUrl = "";
    }

    function clampHostPosition(left, top) {
      const margin = 16;
      const minTop = 84;
      const panelGap = 14;
      const fabWidth = refs.fab.offsetWidth || 68;
      const fabHeight = refs.fab.offsetHeight || 68;
      const panelWidth = refs.panel.offsetWidth || 360;
      const panelHeight = refs.panel.offsetHeight || 420;
      const isOpen = refs.host.classList.contains("open");

      const minLeft = isOpen ? Math.max(margin, panelWidth - fabWidth + margin) : margin;
      const maxLeft = Math.max(minLeft, window.innerWidth - fabWidth - margin);
      const minBubbleTop = isOpen ? panelHeight + panelGap + minTop : minTop;
      const maxBubbleTop = Math.max(minBubbleTop, window.innerHeight - fabHeight - margin);

      return {
        left: Math.max(minLeft, Math.min(left, maxLeft)),
        top: Math.max(minBubbleTop, Math.min(top, maxBubbleTop))
      };
    }

    function applyHostPosition(left, top, persist) {
      const next = clampHostPosition(left, top);
      refs.host.style.left = next.left + "px";
      refs.host.style.top = next.top + "px";
      refs.host.style.right = "auto";
      refs.host.style.bottom = "auto";
      if (persist) writeAssistantPosition(next);
      return next;
    }

    function restoreHostPosition() {
      const stored = readAssistantPosition();
      if (!stored || typeof stored.left !== "number" || typeof stored.top !== "number") return;
      applyHostPosition(stored.left, stored.top, false);
    }

    function pushMessage(role, text) {
      if (!text) return;
      const item = document.createElement("div");
      item.className = "assistant-message " + role;
      item.textContent = text;
      refs.chatBox.appendChild(item);
      refs.chatBox.scrollTop = refs.chatBox.scrollHeight;
    }

    function currentAssistantAsset() {
      if (localAsset) return localAsset;

      const state = getTaskState();
      if (!state || !state.uploaded || !state.uploadedAsset || !state.uploadedAsset.name) return null;

      return {
        name: state.uploadedAsset.name,
        sizeLabel: state.uploadedAsset.sizeLabel || "",
        previewSrc: state.uploadedAsset.previewSrc || "",
        sourceLabel: "当前流程素材"
      };
    }

    function renderAssistantAsset() {
      const asset = currentAssistantAsset();

      if (!asset) {
        refs.uploadPreview.className = "assistant-upload-preview assistant-upload-empty";
        refs.uploadPreview.textContent = "尚未选择图片";
        if (refs.uploadMeta) {
          refs.uploadMeta.textContent = "上传后可直接点击抠图、清理背景、清晰度增强等动作。";
        }
        return;
      }

      refs.uploadPreview.className = "assistant-upload-preview";
      refs.uploadPreview.innerHTML =
        (asset.previewSrc
          ? '<div class="assistant-upload-thumb"><img src="' + escapeHtml(asset.previewSrc) + '" alt="' + escapeHtml(asset.name) + '" /></div>'
          : "") +
        '<div class="assistant-upload-info">' +
        '<strong>' + escapeHtml(asset.name) + "</strong>" +
        '<span>' + escapeHtml([asset.sourceLabel || "", asset.sizeLabel || ""].filter(Boolean).join(" · ")) + "</span>" +
        "</div>";

      if (refs.uploadMeta) {
        refs.uploadMeta.textContent = "当前已有可处理图片，可直接点击下面的高频动作，必要时再继续聊天。";
      }
    }

    function runAction(actionKey) {
      const action = ASSISTANT_ACTIONS[actionKey];
      if (!action) return;
      const context = getAssistantContext();
      const asset = currentAssistantAsset();
      const prompt = asset ? action.prompt + " 当前图片：" + asset.name : action.prompt;
      pushMessage("user", prompt);
      pushMessage("ai", buildAssistantReply(prompt, context));
      if (action.toast) showToast(action.toast);
    }

    function renderContext() {
      const context = getAssistantContext();
      refs.title.textContent = context.title;
      refs.intro.textContent = context.intro;
      refs.taskMeta.textContent = context.taskName;
      refs.statusMeta.textContent = context.status;
      renderAssistantAsset();
      refs.actionGrid.innerHTML = context.quickActions.map(function (key) {
        const action = ASSISTANT_ACTIONS[key];
        return '<button type="button" class="assistant-action-chip" data-action="' + key + '">' + escapeHtml(action.label) + "</button>";
      }).join("");
      refs.chatBox.innerHTML = "";
      pushMessage("ai", context.intro);

      refs.actionGrid.querySelectorAll("[data-action]").forEach(function (node) {
        node.addEventListener("click", function () {
          runAction(node.getAttribute("data-action"));
        });
      });
    }

    function open(options) {
      renderContext();
      const rect = refs.host.getBoundingClientRect();
      refs.host.classList.add("open");
      refs.fab.setAttribute("aria-expanded", "true");
      applyHostPosition(rect.left, rect.top, true);
      refs.input.value = options && options.prompt ? options.prompt : "";
      if (options && options.actionKey && ASSISTANT_ACTIONS[options.actionKey]) {
        runAction(options.actionKey);
      } else if (options && options.prompt) {
        pushMessage("user", options.prompt);
        pushMessage("ai", buildAssistantReply(options.prompt, getAssistantContext()));
      }
    }

    function close() {
      refs.host.classList.remove("open");
      refs.fab.setAttribute("aria-expanded", "false");
      const rect = refs.host.getBoundingClientRect();
      applyHostPosition(rect.left, rect.top, true);
    }

    refs.fab.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;

      dragState.pointerId = event.pointerId;
      dragState.startX = event.clientX;
      dragState.startY = event.clientY;
      dragState.moved = false;

      const rect = refs.host.getBoundingClientRect();
      dragState.originLeft = rect.left;
      dragState.originTop = rect.top;

      refs.host.classList.add("dragging");
      applyHostPosition(rect.left, rect.top, false);
      refs.fab.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    refs.fab.addEventListener("pointermove", function (event) {
      if (dragState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && Math.abs(deltaX) + Math.abs(deltaY) < 6) return;

      dragState.moved = true;
      applyHostPosition(dragState.originLeft + deltaX, dragState.originTop + deltaY, false);
    });

    function endDrag(event) {
      if (dragState.pointerId !== event.pointerId) return;

      refs.host.classList.remove("dragging");
      try {
        refs.fab.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer release errors from interrupted drags.
      }

      if (dragState.moved) {
        const rect = refs.host.getBoundingClientRect();
        applyHostPosition(rect.left, rect.top, true);
        dragState.suppressClick = true;
      }

      dragState.pointerId = null;
    }

    refs.fab.addEventListener("pointerup", endDrag);
    refs.fab.addEventListener("pointercancel", endDrag);

    refs.fab.addEventListener("click", function () {
      if (dragState.suppressClick) {
        dragState.suppressClick = false;
        return;
      }
      if (refs.host.classList.contains("open")) {
        close();
      } else {
        open();
      }
    });

    refs.close.addEventListener("click", close);

    refs.uploadButton.addEventListener("click", function () {
      refs.uploadInput.click();
    });

    refs.uploadPageButton.addEventListener("click", function () {
      if (currentPage() !== "upload.html") {
        showToast("进入完整上传流程后，可以继续配置和生成。");
        go("upload.html", 120);
      } else {
        refs.uploadInput.click();
      }
    });

    refs.uploadInput.addEventListener("change", function () {
      const file = refs.uploadInput.files && refs.uploadInput.files[0];
      if (!file) return;

      if (!file.type || file.type.indexOf("image/") !== 0) {
        showToast("仅支持上传图片文件。");
        refs.uploadInput.value = "";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast("请控制图片在 10 MB 以内。");
        refs.uploadInput.value = "";
        return;
      }

      releaseLocalAssetUrl();
      localAssetUrl = window.URL.createObjectURL(file);
      localAsset = {
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        previewSrc: localAssetUrl,
        sourceLabel: "助手上传"
      };
      renderAssistantAsset();
      refs.uploadInput.value = "";
      showToast("图片已加入助手，可直接选择下面的处理动作。");
    });

    refs.send.addEventListener("click", function () {
      const value = refs.input.value.trim();
      if (!value) return;
      pushMessage("user", value);
      pushMessage("ai", buildAssistantReply(value, getAssistantContext()));
      refs.input.value = "";
    });

    refs.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        refs.send.click();
      }
    });

    document.addEventListener("click", function (event) {
      if (!refs.host.classList.contains("open")) return;
      if (refs.host.contains(event.target)) return;
      close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (!refs.host.style.left || !refs.host.style.top) return;
      const rect = refs.host.getBoundingClientRect();
      applyHostPosition(rect.left, rect.top, true);
    });

    restoreHostPosition();

    floatingAssistant = {
      open: open,
      close: close
    };

    return floatingAssistant;
  }

  function buildAssistantReplyBackup(prompt, context) {
    const content = String(prompt || "").toLowerCase();
    const taskLabel = context && context.taskName ? context.taskName : "\u5f53\u524d\u4efb\u52a1";
    const nextStep = context && context.page === "result.html"
      ? "\u5904\u7406\u540e\u56de\u5230\u7ed3\u679c\u533a\uff0c\u53ef\u4ee5\u7ee7\u7eed\u5bfc\u51fa\u6216\u5f52\u6863\u3002"
      : context && context.page === "upload.html"
        ? "\u5904\u7406\u540e\u53ef\u4ee5\u76f4\u63a5\u7ee7\u7eed\u4e0a\u4f20\u548c\u914d\u7f6e\u6d41\u7a0b\u3002"
        : "\u5904\u7406\u540e\u7ee7\u7eed\u5f53\u524d\u4e3b\u94fe\u8def\u5373\u53ef\u3002";

    if (content.indexOf("\u62a0\u56fe") !== -1 || content.indexOf("\u53bb\u80cc") !== -1) {
      return "\u8fd9\u7c7b\u9700\u6c42\u9002\u5408\u5148\u505a\u4e3b\u4f53\u62a0\u56fe\uff0c\u518d\u89c6\u60c5\u51b5\u8865\u8fb9\u7f18\u4f18\u5316\u3002\u5f53\u524d\u5173\u8054\u4efb\u52a1\u662f\u201c" + taskLabel + "\u201d\u3002" + nextStep;
    }
    if (content.indexOf("\u80cc\u666f") !== -1 || content.indexOf("\u6e05\u7406") !== -1) {
      return "\u5efa\u8bae\u5148\u6e05\u7406\u80cc\u666f\uff0c\u518d\u68c0\u67e5\u4e3b\u4f53\u8fb9\u7f18\u662f\u5426\u9700\u8981\u4e8c\u6b21\u4fee\u6574\u3002\u8fd9\u6837\u66f4\u9002\u5408\u201c" + taskLabel + "\u201d\u7684\u540e\u7eed\u4ea4\u4ed8\u3002" + nextStep;
    }
    if (content.indexOf("\u6e05\u6670") !== -1 || content.indexOf("\u6a21\u7cca") !== -1 || content.indexOf("\u589e\u5f3a") !== -1) {
      return "\u8fd9\u66f4\u9002\u5408\u8d70\u6e05\u6670\u5ea6\u589e\u5f3a\u52a8\u4f5c\uff0c\u5148\u63d0\u7ec6\u8282\uff0c\u518d\u51b3\u5b9a\u662f\u5426\u7ee7\u7eed\u751f\u6210\u6216\u76f4\u63a5\u5bfc\u51fa\u3002" + nextStep;
    }
    if (content.indexOf("\u8fb9\u7f18") !== -1 || content.indexOf("\u53d1\u4e1d") !== -1 || content.indexOf("\u6bdb\u8fb9") !== -1) {
      return "\u5efa\u8bae\u76f4\u63a5\u8d70\u8fb9\u7f18\u4f18\u5316\uff0c\u91cd\u70b9\u5904\u7406\u4e3b\u4f53\u8f6e\u5ed3\u3001\u900f\u660e\u8fb9\u548c\u7ec6\u788e\u6bdb\u8fb9\u3002" + nextStep;
    }
    if (content.indexOf("\u4fee\u590d") !== -1 || content.indexOf("\u7ed3\u679c") !== -1) {
      return "\u5982\u679c\u53ea\u662f\u5c40\u90e8\u95ee\u9898\uff0c\u4f18\u5148\u4fee\u590d\u6bd4\u6574\u8f6e\u91cd\u751f\u66f4\u7701\u3002\u4f60\u53ef\u4ee5\u5148\u7528\u201c\u4fee\u590d\u5f53\u524d\u56fe\u7247\u201d\u6216\u201c\u8fb9\u7f18\u4f18\u5316\u201d\u3002";
    }
    if (content.indexOf("\u4e0a\u4f20") !== -1 || content.indexOf("\u56fe\u7247") !== -1) {
      return "\u8fd9\u4e2a\u52a9\u624b\u4f18\u5148\u5904\u7406\u56fe\u7247\u3002\u5148\u4e0a\u4f20\u4e00\u5f20\u56fe\uff0c\u518d\u70b9\u9009\u4e0a\u65b9\u7684\u5feb\u6377\u5904\u7406\u52a8\u4f5c\uff0c\u804a\u5929\u7528\u6765\u8865\u5145\u590d\u6742\u8bf4\u660e\u5373\u53ef\u3002";
    }
    return "\u8fd9\u4e2a\u52a9\u624b\u4f18\u5148\u5904\u7406\u56fe\u7247\u3002\u5148\u4e0a\u4f20\u56fe\u7247\uff0c\u70b9\u4e0a\u65b9\u7684\u62a0\u56fe\u3001\u6e05\u80cc\u3001\u589e\u5f3a\u7b49\u52a8\u4f5c\uff1b\u53ea\u6709\u9047\u5230\u590d\u6742\u8981\u6c42\u65f6\uff0c\u518d\u7528\u5bf9\u8bdd\u8865\u5145\u3002\u6211\u4f1a\u6309\u201c" + taskLabel + "\u201d\u8fd9\u4e2a\u4e0a\u4e0b\u6587\u7ed9\u4f60\u5efa\u8bae\u3002";
  }

  function mountFloatingAssistantBackup() {
    if (floatingAssistant) return floatingAssistant;
    if (!document.body || document.body.getAttribute("data-shell-layout") !== "platform") return null;

    const assistantActions = {
      cutout: {
        label: "\u5546\u54c1\u62a0\u56fe",
        prompt: "\u5e2e\u6211\u505a\u5546\u54c1\u62a0\u56fe\u3002",
        toast: "\u5df2\u8bb0\u5f55\u201c\u5546\u54c1\u62a0\u56fe\u201d\u8f7b\u5904\u7406\u9700\u6c42\u3002"
      },
      clean: {
        label: "\u6e05\u7406\u80cc\u666f",
        prompt: "\u5e2e\u6211\u6e05\u7406\u80cc\u666f\u3002",
        toast: "\u5df2\u8bb0\u5f55\u201c\u6e05\u7406\u80cc\u666f\u201d\u8f7b\u5904\u7406\u9700\u6c42\u3002"
      },
      enhance: {
        label: "\u63d0\u9ad8\u6e05\u6670\u5ea6",
        prompt: "\u5e2e\u6211\u63d0\u5347\u56fe\u7247\u6e05\u6670\u5ea6\u3002",
        toast: "\u5df2\u8bb0\u5f55\u201c\u63d0\u9ad8\u6e05\u6670\u5ea6\u201d\u8f7b\u5904\u7406\u9700\u6c42\u3002"
      },
      edge: {
        label: "\u8fb9\u7f18\u4f18\u5316",
        prompt: "\u5e2e\u6211\u4f18\u5316\u8fb9\u7f18\u7ec6\u8282\u3002",
        toast: "\u5df2\u8bb0\u5f55\u201c\u8fb9\u7f18\u4f18\u5316\u201d\u8f7b\u5904\u7406\u9700\u6c42\u3002"
      },
      repair: {
        label: "\u4fee\u590d\u5f53\u524d\u56fe\u7247",
        prompt: "\u5e2e\u6211\u4fee\u590d\u5f53\u524d\u56fe\u7247\u7ec6\u8282\u3002",
        toast: ""
      }
    };

    const host = document.createElement("div");
    host.id = "floatingAssistantHost";
    host.className = "assistant-fab-host";
    host.innerHTML = `
      <section class="floating-assistant-panel" aria-live="polite">
        <div class="assistant-panel-head">
          <div>
            <span class="assistant-panel-tag">\u667a\u80fd\u52a9\u624b</span>
            <strong id="assistantPanelTitle">\u56fe\u7247\u8f7b\u5904\u7406\u5165\u53e3</strong>
            <p id="assistantPanelIntro">\u5148\u4e0a\u4f20\u56fe\u7247\uff0c\u518d\u76f4\u63a5\u70b9\u9009\u6298\u56fe\u3001\u6e05\u80cc\u3001\u589e\u5f3a\u7b49\u9ad8\u9891\u52a8\u4f5c\u3002</p>
          </div>
          <button class="assistant-close" id="assistantCloseBtn" type="button" aria-label="\u5173\u95ed\u52a9\u624b">\u00d7</button>
        </div>
        <div class="assistant-meta">
          <span class="assistant-meta-pill" id="assistantTaskMeta">\u5f53\u524d\u4efb\u52a1</span>
          <span class="assistant-meta-pill" id="assistantStatusMeta">\u5f85\u5f00\u59cb</span>
        </div>
        <section class="assistant-workbench">
          <div class="assistant-section-title">
            <strong>\u56fe\u7247\u5904\u7406</strong>
            <span>\u4e3b\u8981\u5165\u53e3</span>
          </div>
          <div class="assistant-upload-card">
            <input id="assistantImageInput" type="file" accept="image/*" hidden />
            <div class="assistant-upload-copy">
              <strong>\u5148\u4e0a\u4f20\u4e00\u5f20\u5f85\u5904\u7406\u56fe\u7247</strong>
              <p id="assistantUploadMeta">\u4e0a\u4f20\u540e\u53ef\u4ee5\u76f4\u63a5\u70b9\u9009\u62a0\u56fe\u3001\u6e05\u7406\u80cc\u666f\u3001\u6e05\u6670\u5ea6\u589e\u5f3a\u7b49\u52a8\u4f5c\u3002</p>
            </div>
            <div class="assistant-upload-actions">
              <button class="assistant-upload-btn" id="assistantUploadBtn" type="button">\u4e0a\u4f20\u56fe\u7247</button>
              <button class="assistant-upload-link" id="assistantGoUploadBtn" type="button">\u8fdb\u5165\u4e0a\u4f20\u9875</button>
            </div>
            <div class="assistant-upload-preview assistant-upload-empty" id="assistantUploadPreview">\u5c1a\u672a\u9009\u62e9\u56fe\u7247</div>
          </div>
          <div class="assistant-action-grid" id="assistantActionGrid"></div>
        </section>
        <section class="assistant-chat-section">
          <div class="assistant-section-title">
            <strong>\u4f4e\u9891\u5bf9\u8bdd</strong>
            <span>\u6b21\u8981\u5165\u53e3</span>
          </div>
          <div class="assistant-chat" id="assistantChatBox"></div>
          <div class="assistant-input-row">
            <input id="assistantQuickInput" type="text" placeholder="\u63cf\u8ff0\u590d\u6742\u9700\u6c42\uff0c\u4f8b\u5982\uff1a\u60f3\u5148\u6e05\u7406\u80cc\u666f\u518d\u7ee7\u7eed\u751f\u6210" />
            <button id="assistantSendBtn" type="button">\u53d1\u9001</button>
          </div>
          <p class="assistant-note">\u5148\u7528\u4e0a\u9762\u7684\u56fe\u7247\u52a8\u4f5c\uff0c\u53ea\u6709\u9047\u5230\u590d\u6742\u9700\u6c42\u65f6\u518d\u7528\u5bf9\u8bdd\u8865\u5145\u3002</p>
        </section>
        <button class="assistant-fab" id="assistantFabBtn" type="button" aria-expanded="false" aria-controls="floatingAssistantHost">
          <span class="assistant-fab-ring"></span>
          <span class="assistant-fab-core">AI</span>
          <span class="assistant-fab-tip">\u52a9\u624b</span>
        </button>
      </section>
    `;

    document.body.appendChild(host);

    const refs = {
      host: host,
      panel: host.querySelector(".floating-assistant-panel"),
      fab: document.getElementById("assistantFabBtn"),
      close: document.getElementById("assistantCloseBtn"),
      title: document.getElementById("assistantPanelTitle"),
      intro: document.getElementById("assistantPanelIntro"),
      taskMeta: document.getElementById("assistantTaskMeta"),
      statusMeta: document.getElementById("assistantStatusMeta"),
      uploadInput: document.getElementById("assistantImageInput"),
      uploadButton: document.getElementById("assistantUploadBtn"),
      uploadPageButton: document.getElementById("assistantGoUploadBtn"),
      uploadMeta: document.getElementById("assistantUploadMeta"),
      uploadPreview: document.getElementById("assistantUploadPreview"),
      actionGrid: document.getElementById("assistantActionGrid"),
      chatBox: document.getElementById("assistantChatBox"),
      input: document.getElementById("assistantQuickInput"),
      send: document.getElementById("assistantSendBtn")
    };

    const dragState = {
      pointerId: null,
      startX: 0,
      startY: 0,
      originLeft: 0,
      originTop: 0,
      moved: false,
      suppressClick: false
    };

    let localAsset = null;
    let localAssetUrl = "";

    function releaseLocalAssetUrl() {
      if (!localAssetUrl) return;
      try {
        window.URL.revokeObjectURL(localAssetUrl);
      } catch (error) {
        return;
      }
      localAssetUrl = "";
    }

    function clampHostPosition(left, top) {
      const margin = 16;
      const minTop = 84;
      const width = refs.host.offsetWidth || 360;
      const height = refs.host.offsetHeight || 420;
      return {
        left: Math.max(margin, Math.min(left, Math.max(margin, window.innerWidth - width - margin))),
        top: Math.max(minTop, Math.min(top, Math.max(minTop, window.innerHeight - height - margin)))
      };
    }

    function applyHostPosition(left, top, persist) {
      const next = clampHostPosition(left, top);
      refs.host.style.left = next.left + "px";
      refs.host.style.top = next.top + "px";
      refs.host.style.right = "auto";
      refs.host.style.bottom = "auto";
      if (persist) writeAssistantPosition(next);
      return next;
    }

    function restoreHostPosition() {
      const stored = readAssistantPosition();
      if (!stored || typeof stored.left !== "number" || typeof stored.top !== "number") return;
      applyHostPosition(stored.left, stored.top, false);
    }

    function pushMessage(role, text) {
      if (!text) return;
      const item = document.createElement("div");
      item.className = "assistant-message " + role;
      item.textContent = text;
      refs.chatBox.appendChild(item);
      refs.chatBox.scrollTop = refs.chatBox.scrollHeight;
    }

    function currentAssistantAsset() {
      if (localAsset) return localAsset;

      const state = getTaskState();
      if (!state) return null;

      if (currentPage() === "result.html" && Array.isArray(state.results) && state.results.length) {
        const selectedIndex = Math.max(0, Math.min(state.selectedResultIndex || 0, state.results.length - 1));
        const task = getTaskMeta(state.selectedTaskKey);
        return {
          name: (task && task.name ? task.name : "\u5f53\u524d\u4efb\u52a1") + " \u7ed3\u679c",
          sizeLabel: "\u65b9\u6848 " + (selectedIndex + 1),
          previewSrc: state.results[selectedIndex] || "",
          sourceLabel: "\u5f53\u524d\u7ed3\u679c\u56fe"
        };
      }

      if (!state.uploaded || !state.uploadedAsset || !state.uploadedAsset.name) return null;

      const task = getTaskMeta(state.selectedTaskKey);
      return {
        name: state.uploadedAsset.name,
        sizeLabel: state.uploadedAsset.sizeLabel || "",
        previewSrc: state.uploadedAsset.previewSrc || (task && task.heroImage ? task.heroImage : ""),
        sourceLabel: "\u5f53\u524d\u6d41\u7a0b\u7d20\u6750"
      };
    }

    function renderAssistantAsset() {
      const asset = currentAssistantAsset();

      refs.uploadButton.textContent = asset ? "\u66f4\u6362\u56fe\u7247" : "\u4e0a\u4f20\u56fe\u7247";
      refs.uploadPageButton.textContent = currentPage() === "upload.html"
        ? "\u4f7f\u7528\u5f53\u524d\u9875\u4e0a\u4f20"
        : "\u8fdb\u5165\u4e0a\u4f20\u9875";

      if (!asset) {
        refs.uploadPreview.className = "assistant-upload-preview assistant-upload-empty";
        refs.uploadPreview.textContent = "\u5c1a\u672a\u9009\u62e9\u56fe\u7247";
        refs.uploadMeta.textContent = "\u4e0a\u4f20\u540e\u53ef\u4ee5\u76f4\u63a5\u70b9\u9009\u62a0\u56fe\u3001\u6e05\u7406\u80cc\u666f\u3001\u6e05\u6670\u5ea6\u589e\u5f3a\u7b49\u52a8\u4f5c\u3002";
        return;
      }

      refs.uploadPreview.className = "assistant-upload-preview";
      refs.uploadPreview.innerHTML =
        (asset.previewSrc
          ? '<div class="assistant-upload-thumb"><img src="' + escapeHtml(asset.previewSrc) + '" alt="' + escapeHtml(asset.name) + '" /></div>'
          : "") +
        '<div class="assistant-upload-info">' +
        "<strong>" + escapeHtml(asset.name) + "</strong>" +
        "<span>" + escapeHtml([asset.sourceLabel || "", asset.sizeLabel || ""].filter(Boolean).join(" \u00b7 ")) + "</span>" +
        "</div>";

      refs.uploadMeta.textContent = "\u5f53\u524d\u5df2\u6709\u53ef\u5904\u7406\u56fe\u7247\uff0c\u53ef\u4ee5\u76f4\u63a5\u70b9\u51fb\u4e0b\u65b9\u7684\u9ad8\u9891\u52a8\u4f5c\uff0c\u590d\u6742\u9700\u6c42\u518d\u7528\u804a\u5929\u8865\u5145\u3002";
    }

    function runAction(actionKey) {
      const action = assistantActions[actionKey];
      if (!action) return;

      const context = getAssistantContext();
      const asset = currentAssistantAsset();
      if (!asset) {
        pushMessage("ai", "\u5148\u4e0a\u4f20\u4e00\u5f20\u5f85\u5904\u7406\u7684\u56fe\u7247\uff0c\u6211\u518d\u5e2e\u4f60\u6267\u884c\u4e0a\u65b9\u7684\u5feb\u6377\u52a8\u4f5c\u3002");
        showToast("\u8bf7\u5148\u4e0a\u4f20\u56fe\u7247\u518d\u6267\u884c\u5904\u7406\u3002");
        return;
      }

      const prompt = action.prompt + "\u5904\u7406\u5bf9\u8c61\uff1a" + asset.name + "\u3002";
      pushMessage("user", prompt);
      pushMessage("ai", buildAssistantReply(prompt, context));
      if (action.toast) showToast(action.toast);
    }

    function renderContext() {
      const context = getAssistantContext();
      refs.title.textContent = context.title || "\u56fe\u7247\u8f7b\u5904\u7406\u5165\u53e3";
      refs.intro.textContent = context.intro || "\u5148\u4e0a\u4f20\u56fe\u7247\uff0c\u518d\u76f4\u63a5\u70b9\u9009\u9ad8\u9891\u56fe\u7247\u52a8\u4f5c\u3002";
      refs.taskMeta.textContent = context.taskName;
      refs.statusMeta.textContent = context.status;
      renderAssistantAsset();
      refs.actionGrid.innerHTML = context.quickActions.map(function (key) {
        const action = assistantActions[key];
        return action
          ? '<button type="button" class="assistant-action-chip" data-action="' + key + '">' + escapeHtml(action.label) + "</button>"
          : "";
      }).join("");
      refs.chatBox.innerHTML = "";
      pushMessage("ai", refs.intro.textContent);

      if (currentAssistantAsset()) {
        pushMessage("ai", "\u5df2\u68c0\u6d4b\u5230\u53ef\u5904\u7406\u56fe\u7247\uff0c\u4f18\u5148\u70b9\u9009\u4e0a\u65b9\u7684\u56fe\u7247\u52a8\u4f5c\u5373\u53ef\u3002");
      } else {
        pushMessage("ai", "\u8fd9\u91cc\u4f18\u5148\u505a\u56fe\u7247\u8f7b\u5904\u7406\u3002\u8bf7\u5148\u4e0a\u4f20\u56fe\u7247\uff0c\u804a\u5929\u4ec5\u7528\u6765\u8865\u5145\u590d\u6742\u8bf4\u660e\u3002");
      }

      refs.actionGrid.querySelectorAll("[data-action]").forEach(function (node) {
        node.addEventListener("click", function () {
          runAction(node.getAttribute("data-action"));
        });
      });
    }

    function open(options) {
      renderContext();
      refs.host.classList.add("open");
      refs.fab.setAttribute("aria-expanded", "true");
      refs.input.value = options && options.prompt ? options.prompt : "";
      if (options && options.actionKey && assistantActions[options.actionKey]) {
        runAction(options.actionKey);
      } else if (options && options.prompt) {
        pushMessage("user", options.prompt);
        pushMessage("ai", buildAssistantReply(options.prompt, getAssistantContext()));
      }
    }

    function close() {
      refs.host.classList.remove("open");
      refs.fab.setAttribute("aria-expanded", "false");
    }

    refs.fab.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;

      dragState.pointerId = event.pointerId;
      dragState.startX = event.clientX;
      dragState.startY = event.clientY;
      dragState.moved = false;

      const rect = refs.host.getBoundingClientRect();
      dragState.originLeft = rect.left;
      dragState.originTop = rect.top;

      refs.host.classList.add("dragging");
      applyHostPosition(rect.left, rect.top, false);
      refs.fab.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    refs.fab.addEventListener("pointermove", function (event) {
      if (dragState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && Math.abs(deltaX) + Math.abs(deltaY) < 6) return;

      dragState.moved = true;
      applyHostPosition(dragState.originLeft + deltaX, dragState.originTop + deltaY, false);
    });

    function endDrag(event) {
      if (dragState.pointerId !== event.pointerId) return;

      refs.host.classList.remove("dragging");
      try {
        refs.fab.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer release errors from interrupted drags.
      }

      if (dragState.moved) {
        const rect = refs.host.getBoundingClientRect();
        applyHostPosition(rect.left, rect.top, true);
        dragState.suppressClick = true;
      }

      dragState.pointerId = null;
    }

    refs.fab.addEventListener("pointerup", endDrag);
    refs.fab.addEventListener("pointercancel", endDrag);

    refs.fab.addEventListener("click", function () {
      if (dragState.suppressClick) {
        dragState.suppressClick = false;
        return;
      }
      if (refs.host.classList.contains("open")) {
        close();
      } else {
        open();
      }
    });

    refs.close.addEventListener("click", close);

    refs.uploadButton.addEventListener("click", function () {
      refs.uploadInput.click();
    });

    refs.uploadPageButton.addEventListener("click", function () {
      if (currentPage() === "upload.html") {
        refs.uploadInput.click();
        return;
      }
      showToast("\u8fdb\u5165\u5b8c\u6574\u4e0a\u4f20\u6d41\u7a0b\u540e\uff0c\u53ef\u4ee5\u7ee7\u7eed\u914d\u7f6e\u548c\u751f\u6210\u3002");
      go("upload.html", 120);
    });

    refs.uploadInput.addEventListener("change", function () {
      const file = refs.uploadInput.files && refs.uploadInput.files[0];
      if (!file) return;

      if (!file.type || file.type.indexOf("image/") !== 0) {
        showToast("\u4ec5\u652f\u6301\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6\u3002");
        refs.uploadInput.value = "";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast("\u8bf7\u63a7\u5236\u56fe\u7247\u5728 10 MB \u4ee5\u5185\u3002");
        refs.uploadInput.value = "";
        return;
      }

      releaseLocalAssetUrl();
      localAssetUrl = window.URL.createObjectURL(file);
      localAsset = {
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        previewSrc: localAssetUrl,
        sourceLabel: "\u52a9\u624b\u4e0a\u4f20"
      };
      renderAssistantAsset();
      refs.uploadInput.value = "";
      pushMessage("ai", "\u56fe\u7247\u5df2\u5c31\u7eea\uff0c\u73b0\u5728\u53ef\u4ee5\u76f4\u63a5\u70b9\u9009\u4e0a\u65b9\u7684\u62a0\u56fe\u3001\u6e05\u80cc\u3001\u589e\u5f3a\u6216\u4fee\u590d\u52a8\u4f5c\u3002");
      showToast("\u56fe\u7247\u5df2\u52a0\u5165\u52a9\u624b\uff0c\u53ef\u4ee5\u76f4\u63a5\u5f00\u59cb\u5904\u7406\u3002");
    });

    refs.send.addEventListener("click", function () {
      const value = refs.input.value.trim();
      if (!value) return;
      pushMessage("user", value);
      pushMessage("ai", buildAssistantReply(value, getAssistantContext()));
      refs.input.value = "";
    });

    refs.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        refs.send.click();
      }
    });

    document.addEventListener("click", function (event) {
      if (!refs.host.classList.contains("open")) return;
      if (refs.host.contains(event.target)) return;
      close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (!refs.host.style.left || !refs.host.style.top) return;
      const rect = refs.host.getBoundingClientRect();
      applyHostPosition(rect.left, rect.top, true);
    });

    restoreHostPosition();

    floatingAssistant = {
      open: open,
      close: close
    };

    return floatingAssistant;
  }

  function openAssistantWidget(options) {
    const assistant = mountFloatingAssistant();
    if (!assistant) return;
    assistant.open(options || {});
  }

  function mountAccountPopover() {
    if (accountPopover) return accountPopover;
    if (!document.body || document.body.getAttribute("data-shell-layout") !== "platform") return null;

    const host = document.createElement("div");
    host.id = "accountPopoverHost";
    host.className = "account-popover-host";
    host.innerHTML = `
      <section class="account-popover" aria-live="polite">
        <div class="account-popover-head">
          <div class="account-avatar-block">
            <div class="account-avatar" id="accountAvatarPreview"></div>
            <div>
              <strong id="accountUserName">示例账号</strong>
              <p id="accountUserMeta">专业版账号 · 已登录</p>
            </div>
          </div>
          <button class="account-close" id="accountPopoverClose" type="button" aria-label="关闭账号面板">×</button>
        </div>
        <div class="account-chip-row">
          <span class="account-chip" id="accountPlanChip">专业版</span>
          <span class="account-chip muted" id="accountQuotaChip">剩余额度 6,580 点</span>
        </div>
        <div class="account-status-grid">
          <article class="account-status-card">
            <span>当前任务</span>
            <strong id="accountTaskName">未开始任务</strong>
            <p id="accountTaskStatus">待开始</p>
          </article>
          <article class="account-status-card">
            <span>历史记录</span>
            <strong id="accountHistoryCount">0</strong>
            <p id="accountArchiveCount">已归档 0 条</p>
          </article>
        </div>
        <section class="account-current-card">
          <div class="account-section-head">
            <strong>最近状态</strong>
            <span id="accountUpdatedAt">刚刚</span>
          </div>
          <div class="account-current-summary">
            <div class="account-summary-row">
              <span>当前素材</span>
              <strong id="accountAssetName">未上传图片</strong>
            </div>
            <div class="account-summary-row">
              <span>推荐动作</span>
              <strong id="accountActionHint">继续当前主链路</strong>
            </div>
          </div>
        </section>
        <div class="account-shortcuts">
          <button class="account-shortcut primary" type="button" data-account-route="member-center.html">进入会员中心</button>
          <button class="account-shortcut" type="button" data-account-route="settings.html">账号设置</button>
          <button class="account-shortcut" type="button" data-account-route="history.html">历史任务</button>
          <button class="account-shortcut danger" type="button" data-account-action="logout">退出登录</button>
        </div>
      </section>
    `;

    document.body.appendChild(host);

    const refs = {
      host: host,
      panel: host.querySelector(".account-popover"),
      close: document.getElementById("accountPopoverClose"),
      avatar: document.getElementById("accountAvatarPreview"),
      userName: document.getElementById("accountUserName"),
      userMeta: document.getElementById("accountUserMeta"),
      planChip: document.getElementById("accountPlanChip"),
      quotaChip: document.getElementById("accountQuotaChip"),
      taskName: document.getElementById("accountTaskName"),
      taskStatus: document.getElementById("accountTaskStatus"),
      historyCount: document.getElementById("accountHistoryCount"),
      archiveCount: document.getElementById("accountArchiveCount"),
      updatedAt: document.getElementById("accountUpdatedAt"),
      assetName: document.getElementById("accountAssetName"),
      actionHint: document.getElementById("accountActionHint")
    };

    let anchorNode = null;

    function readQuotaLabel() {
      const quotaNode = document.querySelector(".top-actions .quota-pill");
      return quotaNode && quotaNode.textContent
        ? quotaNode.textContent.trim()
        : "专业版 · 剩余额度 6,580 点";
    }

    function accountActionHintForState(state) {
      if (!state) return "创建一个新任务";
      if (state.status === "generating") return "继续查看生成进度";
      if (state.status === "completed") return "查看结果或继续归档";
      if (state.status === "configured") return "开始生成当前配置";
      if (state.status === "uploaded") return "继续完成场景配置";
      return "继续当前主链路";
    }

    function render(anchor) {
      const mock = getMock();
      const user = mock ? mock.getUser() : { name: "示例账号", plan: "专业版" };
      const state = getTaskState();
      const history = mock ? mock.getHistory() : [];
      const archivedCount = history.filter(function (item) {
        return !!item.archived;
      }).length;
      const assetName = state && state.uploadedAsset && state.uploadedAsset.name
        ? state.uploadedAsset.name
        : "未上传图片";
      const avatarImage = anchor && anchor.querySelector("img") ? anchor.querySelector("img").src : "";

      refs.userName.textContent = user.name || "示例账号";
      refs.userMeta.textContent = (user.plan || "专业版") + "账号 · 状态正常";
      refs.planChip.textContent = user.plan || "专业版";
      refs.quotaChip.textContent = readQuotaLabel().replace((user.plan || "专业版") + " · ", "");
      refs.taskName.textContent = state && state.selectedTask ? state.selectedTask : "未开始任务";
      refs.taskStatus.textContent = state ? statusText(state.status, state.progress) : "待开始";
      refs.historyCount.textContent = String(history.length);
      refs.archiveCount.textContent = "已归档 " + archivedCount + " 条";
      refs.updatedAt.textContent = state && state.updatedAt ? formatTimeLabel(state.updatedAt) : "刚刚";
      refs.assetName.textContent = assetName;
      refs.actionHint.textContent = accountActionHintForState(state);
      refs.avatar.innerHTML = avatarImage
        ? '<img src="' + escapeHtml(avatarImage) + '" alt="' + escapeHtml(user.name || "账号头像") + '" />'
        : '<span>' + escapeHtml((user.name || "AI").slice(0, 1).toUpperCase()) + "</span>";
    }

    function clampPosition(left, top) {
      const margin = 16;
      const width = refs.panel.offsetWidth || 360;
      const height = refs.panel.offsetHeight || 360;
      return {
        left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
        top: Math.max(80, Math.min(top, window.innerHeight - height - margin))
      };
    }

    function position(anchor) {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const next = clampPosition(rect.right - (refs.panel.offsetWidth || 360), rect.bottom + 12);
      refs.host.style.left = next.left + "px";
      refs.host.style.top = next.top + "px";
    }

    function open(anchor) {
      anchorNode = anchor || document.querySelector(".topbar .avatar");
      if (!anchorNode) return;
      render(anchorNode);
      refs.host.classList.add("open");
      position(anchorNode);
    }

    function close() {
      refs.host.classList.remove("open");
    }

    refs.close.addEventListener("click", close);

    host.querySelectorAll("[data-account-route]").forEach(function (button) {
      button.addEventListener("click", function () {
        const route = button.getAttribute("data-account-route");
        close();
        if (route) go(route, 120);
      });
    });

    host.querySelectorAll("[data-account-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.getAttribute("data-account-action");
        if (action !== "logout") return;
        const mock = getMock();
        if (mock) mock.clearUser();
        close();
        showToast("已退出当前账号。");
        go("login.html", 160);
      });
    });

    document.addEventListener("click", function (event) {
      if (!refs.host.classList.contains("open")) return;
      if (refs.host.contains(event.target)) return;
      if (anchorNode && anchorNode.contains(event.target)) return;
      close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (!refs.host.classList.contains("open") || !anchorNode) return;
      position(anchorNode);
    });

    window.addEventListener("scroll", function () {
      if (!refs.host.classList.contains("open") || !anchorNode) return;
      position(anchorNode);
    }, true);

    accountPopover = {
      open: open,
      close: close,
      toggle(anchor) {
        if (refs.host.classList.contains("open") && anchorNode === anchor) {
          close();
          return;
        }
        open(anchor);
      }
    };

    return accountPopover;
  }

  function bindSidebarRoutes() {
    document.querySelectorAll(".sidebar").forEach(function (sidebar) {
      const navGroups = Array.from(sidebar.querySelectorAll(".nav"));
      if (!navGroups.length) return;

      navGroups.forEach(function (group) {
        group.querySelectorAll(".nav-item").forEach(function (item) {
          if (isAssistantNavItem(item)) item.remove();
        });
      });

      const workspaceItems = navGroups[0] ? Array.from(navGroups[0].querySelectorAll(".nav-item")) : [];
      const accountItems = navGroups[1] ? Array.from(navGroups[1].querySelectorAll(".nav-item")) : [];
      const activeIndex = PAGE_INDEX[currentPage()];

      workspaceItems.forEach(function (item, index) {
        const route = WORKSPACE_ROUTES[index];
        if (!route) return;
        item.classList.toggle("active", index === activeIndex);
        item.setAttribute("href", route);
      });

      accountItems.forEach(function (item, index) {
        const route = ACCOUNT_ROUTES[index];
        if (!route) return;
        item.setAttribute("href", route);
      });
    });
  }

  function bindMarketing() {
    bindClick(".js-start, .login", "login.html", 120);
  }

  function bindLogin() {
    const mock = getMock();
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const account = document.getElementById("loginAccount");
        const password = document.getElementById("loginPassword");
        const name = account && account.value.trim();
        const pwd = password && password.value.trim();
        if (!name || !pwd) return;
        if (mock) mock.setUser(name);
        go("dashboard.html", 320);
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const account = document.getElementById("registerAccount");
        const password = document.getElementById("registerPassword");
        const confirmPassword = document.getElementById("confirmPassword");
        const agree = document.getElementById("agree");
        const name = account && account.value.trim();
        const pwd = password && password.value.trim();
        const confirm = confirmPassword && confirmPassword.value.trim();
        if (!name || !pwd || pwd !== confirm || !agree || !agree.checked) return;
        if (mock) mock.setUser(name);
        go("dashboard.html", 320);
      });
    }

    bindClick("#backHome", "marketing.html", 120);
  }

  function bindDashboard() {
    const mock = getMock();
    document.querySelectorAll("#createTaskBtn, .hero-actions .primary-btn").forEach(function (node) {
      node.addEventListener("click", function () {
        if (mock) mock.selectTask("product-main");
        go("upload.html", 120);
      });
    });
    document.querySelectorAll(".hero-actions .secondary-btn").forEach(function (node) {
      node.addEventListener("click", function () {
        const roadmapSection = document.querySelector(".guide-grid");
        if (roadmapSection) {
          roadmapSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    const dashboardAssistantButton = document.getElementById("dashboardAssistantBtn");
    if (dashboardAssistantButton) {
      dashboardAssistantButton.addEventListener("click", function () {
        openAssistantWidget();
      });
    }
  }

  function renderUploadPreview(previewSrc, label, meta, taskLabel) {
    const preview = document.getElementById("uploadPreview");
    if (!preview) return;

    preview.style.display = "block";
    preview.innerHTML =
      '<div style="margin-top:14px;padding:12px;border-radius:16px;background:#fff;border:1px solid #e7ebf3;text-align:left;">' +
      '<div style="display:flex;gap:12px;align-items:center;">' +
      '<img src="' + escapeHtml(previewSrc) + '" alt="预览" style="width:84px;height:84px;object-fit:cover;border-radius:14px;flex-shrink:0;" />' +
      '<div style="min-width:0;">' +
      '<strong style="display:block;font-size:13px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(label) + "</strong>" +
      '<p style="margin-top:6px;color:#64748b;font-size:12px;line-height:1.6;">' + escapeHtml(meta) + "</p>" +
      '<p style="margin-top:4px;color:#64748b;font-size:12px;line-height:1.6;">' + escapeHtml(taskLabel) + "</p>" +
      "</div></div></div>";
  }

  function bindUpload() {
    const mock = getMock();
    if (!mock) return;

    const fileInput = document.getElementById("uploadFileInput");
    const dropzone = document.getElementById("uploadDropzone");
    const statusNode = document.getElementById("uploadStatus");
    const titleNode = document.getElementById("uploadTitle");
    const descriptionNode = document.getElementById("uploadDescription");
    const previewNode = document.getElementById("uploadPreview");
    const heroButtonSelector = "#uploadBtn, #uploadHeroBtn, #uploadTopBtn";

    let localPreviewUrl = "";

    function getStateAndTask() {
      const state = mock.getTaskState();
      return {
        state: state,
        task: mock.getTaskMeta(state.selectedTaskKey)
      };
    }

    function revokeLocalPreview() {
      if (localPreviewUrl) {
        window.URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = "";
      }
    }

    function updateUploadSummary(previewOverride) {
      const context = getStateAndTask();
      const state = context.state;
      const task = context.task;

      setText("#uploadTaskName", task.name);
      setText("#uploadRecommendedRatio", task.recommendedRatio);
      setText("#uploadEstimateQuota", task.quota);

      if (titleNode) titleNode.textContent = state.uploaded ? "素材已准备好" : "拖拽或点击上传图片";
      if (descriptionNode) descriptionNode.textContent = task.uploadDescription;

      if (state.uploaded) {
        const previewSrc = previewOverride ||
          (state.uploadedAsset.source === "upload" ? task.heroImage : state.uploadedAsset.previewSrc) ||
          task.heroImage;
        renderUploadPreview(
          previewSrc,
          state.uploadedAsset.name || "已选择素材",
          (state.uploadedAsset.source === "example" ? "示例素材" : "本地上传") +
            (state.uploadedAsset.sizeLabel ? " · " + state.uploadedAsset.sizeLabel : ""),
          "当前任务：" + task.name
        );
        if (statusNode) {
          statusNode.textContent = "素材已记录，正在进入场景化配置。";
        }
      } else {
        if (previewNode) {
          previewNode.style.display = "none";
          previewNode.innerHTML = "";
        }
        if (statusNode) {
          statusNode.textContent = "当前任务：" + task.name + "。支持上传单张商品图，系统会在后续配置页自动承接任务类型。";
        }
      }
    }

    function openFilePicker() {
      if (fileInput) fileInput.click();
    }

    function applyExampleUpload(shouldNavigate) {
      const context = getStateAndTask();
      const state = context.state;
      const task = context.task;
      const nextIndex = state.uploadedAsset && typeof state.uploadedAsset.exampleIndex === "number"
        ? (state.uploadedAsset.exampleIndex + 1) % task.results.length
        : 0;
      const previewSrc = task.results[nextIndex] || task.heroImage;

      mock.applyUpload({
        name: task.name + "示例素材",
        source: "example",
        previewSrc: previewSrc,
        sizeLabel: "平台示例",
        exampleIndex: nextIndex
      });
      updateUploadSummary();
      showToast("已载入示例素材。");
      if (shouldNavigate !== false) {
        go("scene-config.html", 520);
      }
    }

    function handleFile(file) {
      if (!file) return;
      if (!file.type || file.type.indexOf("image/") !== 0) {
        if (statusNode) statusNode.textContent = "上传失败：仅支持图片文件。";
        showToast("上传失败，仅支持图片文件。");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        if (statusNode) statusNode.textContent = "上传失败：请控制在 10 MB 以内。";
        showToast("上传失败，请控制在 10 MB 以内。");
        return;
      }

      revokeLocalPreview();
      localPreviewUrl = window.URL.createObjectURL(file);

      const context = getStateAndTask();
      mock.applyUpload({
        name: file.name,
        source: "upload",
        previewSrc: context.task.heroImage,
        sizeLabel: formatFileSize(file.size)
      });
      updateUploadSummary(localPreviewUrl);
      if (statusNode) {
        statusNode.textContent = "上传成功，正在进入场景化配置。";
      }
      showToast("上传成功，已进入配置流程。");
      go("scene-config.html", 680);
    }

    document.querySelectorAll(heroButtonSelector).forEach(function (node) {
      node.addEventListener("click", openFilePicker);
    });

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        handleFile(file);
        fileInput.value = "";
      });
    }

    if (dropzone) {
      ["dragenter", "dragover"].forEach(function (eventName) {
        dropzone.addEventListener(eventName, function (event) {
          event.preventDefault();
          dropzone.style.borderColor = "#5b6cff";
          dropzone.style.background = "#f1f4ff";
        });
      });

      ["dragleave", "drop"].forEach(function (eventName) {
        dropzone.addEventListener(eventName, function (event) {
          event.preventDefault();
          dropzone.style.borderColor = "#d7dff2";
          dropzone.style.background = "#f8faff";
        });
      });

      dropzone.addEventListener("drop", function (event) {
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        handleFile(file);
      });
    }

    const useExampleButton = document.getElementById("useExampleBtn");
    if (useExampleButton) {
      useExampleButton.addEventListener("click", function () {
        applyExampleUpload(true);
      });
    }

    const changeExampleButton = document.getElementById("changeImageBtn");
    if (changeExampleButton) {
      changeExampleButton.addEventListener("click", function () {
        applyExampleUpload(false);
        if (statusNode) statusNode.textContent = "已切换示例素材，继续上传或直接进入配置。";
      });
    }

    updateUploadSummary();
  }

  function replaceSelectOptions(select, items, selectedValue) {
    if (!select) return;
    select.innerHTML = items
      .map(function (item) {
        const selected = item === selectedValue ? ' selected="selected"' : "";
        return '<option' + selected + ">" + escapeHtml(item) + "</option>";
      })
      .join("");
    if (selectedValue && items.indexOf(selectedValue) !== -1) {
      select.value = selectedValue;
    }
  }

  function bindSceneConfig() {
    const mock = getMock();
    if (!mock) return;

    const taskTypeSelect = document.getElementById("taskTypeSelect");
    const ratioSelect = document.getElementById("ratioSelect");
    const sceneTemplateSelect = document.getElementById("sceneTemplateSelect");
    const protectionSelect = document.getElementById("protectionSelect");
    const notesInput = document.getElementById("notesInput");
    const statusNode = document.getElementById("configStatus");

    function syncConfigSummary() {
      const state = mock.getTaskState();
      const task = mock.getTaskMeta(state.selectedTaskKey);
      const taskNames = getTaskList().map(function (item) {
        return item.name;
      });

      replaceSelectOptions(taskTypeSelect, taskNames, task.name);
      replaceSelectOptions(ratioSelect, task.ratios, state.config.ratio || task.recommendedRatio);
      replaceSelectOptions(sceneTemplateSelect, task.templates, state.config.sceneTemplate || task.templates[0]);
      replaceSelectOptions(protectionSelect, task.protections, state.config.protection || task.protections[0]);
      if (notesInput) notesInput.value = state.config.notes || "";

      setText("#configResultCount", task.resultsCount + " 张");
      setText("#configEstimateQuota", task.quota);
      setText("#configTaskSummary", task.name);
      setText("#configSceneSummary", state.config.sceneTemplate || task.templates[0]);
      setText("#configRatioSummary", state.config.ratio || task.recommendedRatio);

      if (!state.uploaded) {
        if (statusNode) statusNode.textContent = "请先完成素材上传，再进入生成流程。";
      } else {
        if (statusNode) {
          statusNode.textContent =
            "已接收素材：" +
            (state.uploadedAsset.name || "示例素材") +
            "。当前配置会自动保存，生成后默认输出 " +
            task.resultsCount +
            " 张结果。";
        }
      }
    }

    function saveCurrentConfig() {
      const currentTaskKey = findTaskKeyByName(taskTypeSelect ? taskTypeSelect.value : "");
      if (currentTaskKey) {
        const state = mock.getTaskState();
        const task = mock.getTaskMeta(currentTaskKey);
        const taskChanged = currentTaskKey !== state.selectedTaskKey;
        const nextRatio = taskChanged
          ? task.recommendedRatio
          : ratioSelect
            ? ratioSelect.value
            : task.recommendedRatio;
        const nextSceneTemplate = taskChanged
          ? task.templates[0]
          : sceneTemplateSelect
            ? sceneTemplateSelect.value
            : task.templates[0];
        const nextProtection = taskChanged
          ? task.protections[0]
          : protectionSelect
            ? protectionSelect.value
            : task.protections[0];
        state.selectedTaskKey = currentTaskKey;
        state.selectedTask = task.name;
        state.config = Object.assign({}, state.config, {
          taskType: task.name,
          ratio: nextRatio,
          sceneTemplate: nextSceneTemplate,
          protection: nextProtection,
          notes: notesInput ? notesInput.value.trim() : state.config.notes
        });
        state.updatedAt = Date.now();
        mock.setTaskState(state);
      }
      const latestState = mock.getTaskState();
      mock.saveConfig({
        taskType: latestState.selectedTask,
        ratio: latestState.config.ratio,
        sceneTemplate: latestState.config.sceneTemplate,
        protection: latestState.config.protection,
        notes: notesInput ? notesInput.value.trim() : latestState.config.notes
      });
      syncConfigSummary();
    }

    function startGeneration() {
      const state = mock.getTaskState();
      if (!state.uploaded) {
        if (statusNode) statusNode.textContent = "请先上传素材后再开始生成。";
        showToast("请先上传素材后再开始生成。");
        return false;
      }
      saveCurrentConfig();
      const nextState = mock.getTaskState();
      mock.startGeneration(nextState.config);
      showToast("已开始生成，正在进入进度页。");
      go("scene-task.html", 160);
      return true;
    }

    [taskTypeSelect, ratioSelect, sceneTemplateSelect, protectionSelect].forEach(function (node) {
      if (!node) return;
      node.addEventListener("change", function () {
        saveCurrentConfig();
      });
    });

    if (notesInput) {
      notesInput.addEventListener("blur", saveCurrentConfig);
    }

    document.querySelectorAll("#startGenerateBtn, #startGenerateTopBtn").forEach(function (node) {
      node.addEventListener("click", function () {
        startGeneration();
      });
    });

    const viewProgressButton = document.getElementById("viewProgress");
    if (viewProgressButton) {
      viewProgressButton.addEventListener("click", function () {
        const state = mock.getTaskState();
        if (state.status === "generating" || state.resultReady) {
          go("scene-task.html", 120);
          return;
        }
        if (statusNode) statusNode.textContent = "开始生成后才会显示任务进度。";
        showToast("开始生成后才会显示任务进度。");
      });
    }

    const changeImageButton = document.getElementById("changeImageBtn");
    if (changeImageButton) {
      changeImageButton.addEventListener("click", function () {
        go("upload.html", 120);
      });
    }

    syncConfigSummary();
  }

  function setTaskCardActiveState(card, active) {
    if (!card) return;
    card.style.borderColor = active ? "#cfd5ff" : "#e7ebf3";
    card.style.background = active ? "#f5f6ff" : "#fff";
    card.style.boxShadow = active ? "0 16px 32px rgba(91,108,255,.12)" : "none";
    card.style.transform = active ? "translateY(-2px)" : "none";
  }

  function bindSceneTask() {
    const mock = getMock();
    if (!mock) return;

    const statusMount = document.getElementById("sceneTaskStatusMount");
    const taskCards = Array.from(document.querySelectorAll(".task-card[data-task-key]"));
    const primaryEntryButton = document.getElementById("uploadTopBtn");
    let progressTimer = null;

    function refreshTaskSummary(state) {
      const task = mock.getTaskMeta(state.selectedTaskKey);
      setText("#sceneTaskName", task.name);
      setText("#sceneTaskCount", task.resultsCount + " 张");
      setText("#sceneTaskRatio", state.config.ratio || task.recommendedRatio);
      setText("#sceneTaskQuota", task.quota);
      setText("#sceneTaskStatusText", statusText(state.status, state.progress));

      taskCards.forEach(function (card) {
        setTaskCardActiveState(card, card.getAttribute("data-task-key") === state.selectedTaskKey);
      });

      if (primaryEntryButton) {
        primaryEntryButton.textContent = state.resultReady
          ? "查看生成结果"
          : state.status === "generating"
            ? "查看生成进度"
            : "进入上传图片";
      }
    }

    function renderStatusPanel(state) {
      if (!statusMount) return;
      const task = mock.getTaskMeta(state.selectedTaskKey);
      const assetName = state.uploadedAsset.name || "尚未上传素材";
      let content = "";

      if (state.status === "generating") {
        content =
          '<section class="card section shell-main-card">' +
          "<div class=\"section-head\"><div><h2>生成进度</h2><p>生成执行页需要明确反馈状态、预计等待和后续路径。</p></div></div>" +
          '<div style="display:grid;gap:14px;">' +
          '<div style="padding:16px;border:1px solid #e7ebf3;border-radius:20px;background:#fff;">' +
          '<strong style="display:block;font-size:15px;color:#0f172a;">当前任务：' + escapeHtml(task.name) + "</strong>" +
          '<p style="margin-top:8px;color:#64748b;font-size:12px;line-height:1.7;">素材：' + escapeHtml(assetName) + " · 场景：" + escapeHtml(state.config.sceneTemplate) + " · 比例：" + escapeHtml(state.config.ratio) + "</p>" +
          '<div style="margin-top:14px;height:10px;border-radius:999px;background:#e9edf6;overflow:hidden;"><span style="display:block;width:' + state.progress + '%;height:100%;border-radius:inherit;background:linear-gradient(135deg,#5b6cff,#7c4dff);"></span></div>' +
          '<p style="margin-top:10px;color:#64748b;font-size:12px;">当前进度 ' + state.progress + '%，系统正在生成 4 张候选结果。</p>' +
          "</div></div></section>";
      } else if (state.resultReady) {
        content =
          '<section class="card section shell-main-card">' +
          "<div class=\"section-head\"><div><h2>生成完成</h2><p>结果已就绪，可以进入结果页进行筛选、导出和归档。</p></div></div>" +
          '<div style="display:grid;gap:14px;">' +
          '<div style="padding:16px;border:1px solid #e7ebf3;border-radius:20px;background:#fff;">' +
          '<strong style="display:block;font-size:15px;color:#0f172a;">本次生成已完成</strong>' +
          '<p style="margin-top:8px;color:#64748b;font-size:12px;line-height:1.7;">任务：' + escapeHtml(task.name) + ' · 已生成 ' + (state.results.length || task.resultsCount) + ' 张结果，可继续筛选、重新生成或交付导出。</p>' +
          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="primary-btn" id="viewResultBtn">查看结果</button>' +
          '<button class="secondary-btn" id="reuseFromTaskBtn">复用配置</button>' +
          "</div></div></div></section>";
      } else if (state.uploaded || state.configured) {
        content =
          '<section class="card section shell-main-card">' +
          "<div class=\"section-head\"><div><h2>待生成</h2><p>当前素材和配置已就绪，可以开始执行一次标准化生成任务。</p></div></div>" +
          '<div style="display:grid;gap:14px;">' +
          '<div style="padding:16px;border:1px solid #e7ebf3;border-radius:20px;background:#fff;">' +
          '<strong style="display:block;font-size:15px;color:#0f172a;">素材已准备好</strong>' +
          '<p style="margin-top:8px;color:#64748b;font-size:12px;line-height:1.7;">素材：' + escapeHtml(assetName) + ' · 场景：' + escapeHtml(state.config.sceneTemplate) + ' · 比例：' + escapeHtml(state.config.ratio) + '</p>' +
          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="primary-btn" id="startFromTaskBtn">开始生成</button>' +
          '<button class="secondary-btn" id="editConfigBtn">继续调整配置</button>' +
          "</div></div></div></section>";
      } else {
        content =
          '<section class="card section shell-main-card">' +
          "<div class=\"section-head\"><div><h2>任务进入</h2><p>先选定一个 V1 场景，再进入上传和配置流程。</p></div></div>" +
          '<div style="padding:16px;border:1px solid #e7ebf3;border-radius:20px;background:#fff;">' +
          '<strong style="display:block;font-size:15px;color:#0f172a;">当前推荐：' + escapeHtml(task.name) + "</strong>" +
          '<p style="margin-top:8px;color:#64748b;font-size:12px;line-height:1.7;">' + escapeHtml(task.uploadDescription) + "</p>" +
          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="primary-btn" id="goUploadNowBtn">进入上传图片</button>' +
          '<button class="secondary-btn" id="useSceneExampleBtn">用示例素材体验</button>' +
          "</div></div></section>";
      }

      statusMount.innerHTML = content;

      const startFromTaskButton = document.getElementById("startFromTaskBtn");
      if (startFromTaskButton) {
        startFromTaskButton.addEventListener("click", function () {
          const latestState = mock.getTaskState();
          if (!latestState.uploaded) {
            showToast("请先上传素材。");
            return;
          }
          mock.startGeneration(latestState.config);
          refreshAll();
        });
      }

      const editConfigButton = document.getElementById("editConfigBtn");
      if (editConfigButton) {
        editConfigButton.addEventListener("click", function () {
          go("scene-config.html", 120);
        });
      }

      const viewResultButton = document.getElementById("viewResultBtn");
      if (viewResultButton) {
        viewResultButton.addEventListener("click", function () {
          go("result.html", 120);
        });
      }

      const reuseFromTaskButton = document.getElementById("reuseFromTaskBtn");
      if (reuseFromTaskButton) {
        reuseFromTaskButton.addEventListener("click", function () {
          go("scene-config.html", 120);
        });
      }

      const goUploadNowButton = document.getElementById("goUploadNowBtn");
      if (goUploadNowButton) {
        goUploadNowButton.addEventListener("click", function () {
          go("upload.html", 120);
        });
      }

      const useSceneExampleButton = document.getElementById("useSceneExampleBtn");
      if (useSceneExampleButton) {
        useSceneExampleButton.addEventListener("click", function () {
          const latestState = mock.getTaskState();
          const latestTask = mock.getTaskMeta(latestState.selectedTaskKey);
          mock.applyUpload({
            name: latestTask.name + "示例素材",
            source: "example",
            previewSrc: latestTask.heroImage,
            sizeLabel: "平台示例"
          });
          go("scene-config.html", 160);
        });
      }
    }

    function refreshAll() {
      let state = mock.getTaskState();
      if (state.status === "generating") {
        state = mock.syncGeneration();
      }

      refreshTaskSummary(state);
      renderStatusPanel(state);

      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }

      if (state.status === "generating") {
        progressTimer = window.setInterval(function () {
          const nextState = mock.syncGeneration();
          refreshTaskSummary(nextState);
          renderStatusPanel(nextState);
          if (nextState.status !== "generating" && progressTimer) {
            window.clearInterval(progressTimer);
            progressTimer = null;
            showToast("生成完成，可进入结果页查看。");
          }
        }, 500);
      }
    }

    taskCards.forEach(function (card) {
      const taskKey = card.getAttribute("data-task-key");
      card.style.cursor = "pointer";
      card.addEventListener("click", function () {
        mock.selectTask(taskKey);
        refreshAll();
        showToast("已切换到“" + mock.getTaskMeta(taskKey).name + "”。");
      });
      card.addEventListener("dblclick", function () {
        const latestState = mock.getTaskState();
        if (latestState.resultReady && latestState.selectedTaskKey === taskKey) {
          go("result.html", 120);
          return;
        }
        go("upload.html", 120);
      });
    });

    document.querySelectorAll("#heroCreateBtn, #createTaskBtn").forEach(function (node) {
      node.addEventListener("click", function () {
        go("upload.html", 120);
      });
    });

    if (primaryEntryButton) {
      primaryEntryButton.addEventListener("click", function () {
        const state = mock.getTaskState();
        if (state.resultReady) {
          go("result.html", 120);
          return;
        }
        if (state.status === "generating") {
          refreshAll();
          showToast("任务仍在生成中，进度已刷新。");
          return;
        }
        go("upload.html", 120);
      });
    }

    const exampleButton = document.getElementById("exampleBtn");
    if (exampleButton) {
      exampleButton.addEventListener("click", function () {
        const state = mock.getTaskState();
        const task = mock.getTaskMeta(state.selectedTaskKey);
        mock.applyUpload({
          name: task.name + "示例素材",
          source: "example",
          previewSrc: task.heroImage,
          sizeLabel: "平台示例"
        });
        go("scene-config.html", 160);
      });
    }

    refreshAll();
  }

  function bindResult() {
    const mock = getMock();
    if (!mock) return;

    const previewImage = document.getElementById("previewImage");
    const thumbsContainer = document.getElementById("resultThumbs");
    const actionStatus = document.getElementById("resultActionStatus");
    const actionMain = document.querySelector(".action-main");
    const actionSave = document.querySelector(".action-save");
    const actionDownload = document.querySelector(".action-download");

    function ensureReadyState() {
      const state = mock.getTaskState();
      if (state.status === "generating" || (state.configured && !state.resultReady)) {
        return mock.ensureResultState();
      }
      return state;
    }

    function renderResultPage() {
      const state = ensureReadyState();
      const task = mock.getTaskMeta(state.selectedTaskKey);
      const results = state.results && state.results.length ? state.results : task.results;
      const selectedIndex = Math.max(0, Math.min(state.selectedResultIndex || 0, results.length - 1));

      if (previewImage) {
        previewImage.src = results[selectedIndex];
      }

      if (thumbsContainer) {
        thumbsContainer.innerHTML = results
          .map(function (src, index) {
            return (
              '<div class="thumb" data-result-index="' + index + '" style="' +
              (index === selectedIndex
                ? "border-color:#5b6cff;box-shadow:0 12px 24px rgba(91,108,255,.18);"
                : "") +
              '">' +
              '<img src="' + escapeHtml(src) + '" alt="缩略图 ' + (index + 1) + '" />' +
              "</div>"
            );
          })
          .join("");

        thumbsContainer.querySelectorAll(".thumb").forEach(function (node) {
          node.style.cursor = "pointer";
          node.addEventListener("click", function () {
            const nextIndex = Number(node.getAttribute("data-result-index"));
            mock.setSelectedResult(nextIndex);
            renderResultPage();
          });
        });
      }

      setText("#resultSuccessLevel", task.resultMetrics.success);
      setText("#resultFidelityLevel", task.resultMetrics.fidelity);
      setText("#resultExportMode", task.resultMetrics.export);
      setText("#resultCountSummary", results.length + " 张");
      setText("#resultRecommendedLabel", "结果 " + pad(selectedIndex + 1));
      setText(
        "#resultExportStatus",
        state.downloadCount > 0
          ? "已下载 " + state.downloadCount + " 次"
          : state.archived
            ? "已归档，可下载"
            : "可下载"
      );

      if (actionStatus) {
        actionStatus.textContent = state.archived
          ? "当前结果已加入素材库，可继续复用配置或前往结果归档页查看。"
          : "已生成 4 张结果，支持选择主图、归档、下载和再次生成。";
      }
    }

    if (actionMain) {
      actionMain.addEventListener("click", function () {
        renderResultPage();
        showToast("当前结果已设为主图候选。");
      });
    }

    if (actionSave) {
      actionSave.addEventListener("click", function () {
        mock.archiveCurrentResult();
        renderResultPage();
        showToast("已加入素材库归档。");
      });
    }

    if (actionDownload) {
      actionDownload.addEventListener("click", function () {
        mock.incrementDownloads(1);
        renderResultPage();
        showToast("已记录本次下载。");
      });
    }

    const batchDownloadButton = document.getElementById("batchDownloadBtn");
    if (batchDownloadButton) {
      batchDownloadButton.addEventListener("click", function () {
        const state = ensureReadyState();
        const results = state.results && state.results.length ? state.results : mock.getTaskMeta(state.selectedTaskKey).results;
        mock.incrementDownloads(results.length);
        renderResultPage();
        showToast("已记录批量下载。");
      });
    }

    const zoomButton = document.getElementById("zoomBtn");
    if (zoomButton) {
      zoomButton.addEventListener("click", function () {
        if (previewImage && previewImage.src) {
          window.open(previewImage.src, "_blank", "noopener");
        }
      });
    }

    document.querySelectorAll("#createTaskBtn, #reuseConfigBtn, #backConfigBtn").forEach(function (node) {
      node.addEventListener("click", function () {
        go("scene-config.html", 120);
      });
    });

    const regenButton = document.getElementById("regenBtn");
    if (regenButton) {
      regenButton.addEventListener("click", function () {
        const state = mock.getTaskState();
        mock.startGeneration(state.config);
        go("scene-task.html", 120);
      });
    }

    const repairButton = document.getElementById("repairBtn");
    if (repairButton) {
      repairButton.addEventListener("click", function () {
        showToast("正在进入智能助手处理结果细节。");
        openAssistantWidget({
          actionKey: "repair"
        });
      });
    }

    const archiveRouteButton = document.querySelector(".action-save");
    if (archiveRouteButton) {
      archiveRouteButton.addEventListener("dblclick", function () {
        go(RESULT_ARCHIVE_ROUTE, 120);
      });
    }

    renderResultPage();
  }

  function bindMaterialLibrary() {
    const mock = getMock();
    if (!mock) return;

    const assetGrid = document.getElementById("assetGrid");
    const searchInput = document.getElementById("topSearchInput");
    const libraryStatus = document.getElementById("libraryStatus");
    const reuseButton = document.getElementById("reuseAssetBtn");
    const sourceButton = document.getElementById("viewAssetSourceBtn");

    const templateAssets = [
      {
        id: "template-01",
        name: "晨光浴室台面模板",
        type: "template",
        typeLabel: "模板",
        source: "高表现模板",
        status: "template",
        statusLabel: "模板库",
        usageCount: 18,
        updatedAt: Date.now() - 1000 * 60 * 60 * 4,
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
        description: "适合护肤和美妆类商品主图，强调高净值感和稳定交付。",
        taskKey: "product-main",
        sceneTemplate: "晨光浴室台面"
      },
      {
        id: "template-02",
        name: "高级货架空间模板",
        type: "template",
        typeLabel: "模板",
        source: "高表现模板",
        status: "template",
        statusLabel: "模板库",
        usageCount: 12,
        updatedAt: Date.now() - 1000 * 60 * 60 * 9,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        description: "适合鞋服和活动场景迁移，背景层次和货架氛围更强。",
        taskKey: "background-migration",
        sceneTemplate: "高级货架空间"
      }
    ];

    let selectedAssetId = "";
    let activeType = "all";
    let activeStatus = "all";
    let activeSort = "recent";

    function createHistoryAsset(entry) {
      return {
        id: "history-" + entry.id,
        historyTaskId: entry.id,
        name: entry.taskName + " · " + (entry.uploadedName || "任务结果"),
        type: "result",
        typeLabel: "生成结果",
        source: entry.taskName,
        status: entry.archived ? "archived" : "ready",
        statusLabel: entry.archived ? "已归档" : "可复用",
        usageCount: Math.max(entry.downloadCount || 0, entry.archived ? 3 : 1),
        updatedAt: entry.updatedAt || entry.createdAt || Date.now(),
        image: entry.coverSrc,
        description: entry.sceneTemplate + " · " + entry.ratio + " · " + (entry.notes || "来自场景化任务的结果资产。"),
        taskKey: entry.taskKey,
        sceneTemplate: entry.sceneTemplate
      };
    }

    function createCurrentUploadAsset(state) {
      if (!state || !state.uploaded || !state.uploadedAsset.name) return null;
      return {
        id: "current-upload",
        name: state.uploadedAsset.name,
        type: "upload",
        typeLabel: "上传素材",
        source: state.selectedTask || "当前任务",
        status: state.archived ? "archived" : "ready",
        statusLabel: state.archived ? "已归档" : "可继续配置",
        usageCount: Math.max(state.downloadCount || 0, 1),
        updatedAt: state.updatedAt || Date.now(),
        image: state.uploadedAsset.previewSrc || mock.getTaskMeta(state.selectedTaskKey).heroImage,
        description: "当前流程里的上传素材，可直接带回上传页或配置页继续创作。",
        taskKey: state.selectedTaskKey,
        sceneTemplate: state.config.sceneTemplate
      };
    }

    function buildAssets() {
      const historyAssets = mock.getHistory().map(createHistoryAsset);
      const currentAsset = createCurrentUploadAsset(mock.getTaskState());
      const assets = [];

      if (currentAsset) {
        const alreadyExists = historyAssets.some(function (item) {
          return item.name === currentAsset.name && item.image === currentAsset.image;
        });
        if (!alreadyExists) assets.push(currentAsset);
      }

      return assets.concat(historyAssets, templateAssets);
    }

    function getFilteredAssets() {
      const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
      let assets = buildAssets();

      if (activeType !== "all") {
        assets = assets.filter(function (item) {
          return item.type === activeType;
        });
      }

      if (activeStatus !== "all") {
        assets = assets.filter(function (item) {
          return item.status === activeStatus;
        });
      }

      if (keyword) {
        assets = assets.filter(function (item) {
          return [
            item.name,
            item.source,
            item.description,
            item.sceneTemplate
          ]
            .join(" ")
            .toLowerCase()
            .indexOf(keyword) >= 0;
        });
      }

      assets.sort(function (left, right) {
        if (activeSort === "usage") {
          return (right.usageCount || 0) - (left.usageCount || 0);
        }
        if (activeSort === "name") {
          return left.name.localeCompare(right.name, "zh-CN");
        }
        return (right.updatedAt || 0) - (left.updatedAt || 0);
      });

      return assets;
    }

    function updateStats(assets) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayCount = assets.filter(function (item) {
        return (item.updatedAt || 0) >= startOfToday.getTime();
      }).length;
      const archivedCount = assets.filter(function (item) {
        return item.status === "archived";
      }).length;
      const templateCount = assets.filter(function (item) {
        return item.type === "template";
      }).length;
      const reuseCount = assets.reduce(function (sum, item) {
        return sum + (item.usageCount || 0);
      }, 0);

      setText("#totalAssetsCount", String(assets.length));
      setText("#archivedAssetsCount", String(archivedCount));
      setText("#templateAssetsCount", String(templateCount));
      setText("#todayAssetsCount", String(todayCount));
      setText("#reuseActionsCount", String(reuseCount));
    }

    function updateDetail(asset) {
      if (!asset) {
        setText("#detailName", "暂无素材");
        setText("#detailType", "-");
        setText("#detailSource", "-");
        setText("#detailStatus", "-");
        setText("#detailUse", "0 次");
        return;
      }

      const detailImage = document.getElementById("detailImage");
      if (detailImage) detailImage.src = asset.image;
      setText("#detailName", asset.name);
      setText("#detailType", asset.typeLabel);
      setText("#detailSource", asset.source);
      setText("#detailStatus", asset.statusLabel);
      setText("#detailUse", asset.usageCount + " 次");
    }

    function renderAssets() {
      if (!assetGrid) return;

      const assets = getFilteredAssets();
      updateStats(buildAssets());

      if (!selectedAssetId || !assets.some(function (item) { return item.id === selectedAssetId; })) {
        selectedAssetId = assets[0] ? assets[0].id : "";
      }

      if (!assets.length) {
        assetGrid.innerHTML = '<div class="empty-card">当前筛选条件下没有素材。可以先上传素材，或者去结果页把高质量结果加入素材库。</div>';
        if (libraryStatus) {
          libraryStatus.textContent = "未找到匹配素材，请调整筛选条件或新增素材。";
        }
        updateDetail(null);
        return;
      }

      assetGrid.innerHTML = assets.map(function (asset) {
        const activeStyle = asset.id === selectedAssetId
          ? "border-color:#cfd5ff;background:#f5f6ff;box-shadow:0 16px 30px rgba(91,108,255,.14);"
          : "";
        return (
          '<article class="asset-card" data-asset-id="' + escapeHtml(asset.id) + '" style="cursor:pointer;' + activeStyle + '">' +
          '<div class="asset-cover"><img src="' + escapeHtml(asset.image) + '" alt="' + escapeHtml(asset.name) + '" /></div>' +
          '<div class="asset-top"><span class="asset-type">' + escapeHtml(asset.typeLabel) + '</span><span class="asset-status">' + escapeHtml(asset.statusLabel) + "</span></div>" +
          "<h3>" + escapeHtml(asset.name) + "</h3>" +
          "<p>" + escapeHtml(asset.description) + "</p>" +
          '<div class="asset-meta"><span>' + escapeHtml(asset.source) + '</span><span>' + escapeHtml(formatTimeLabel(asset.updatedAt)) + "</span></div>" +
          "</article>"
        );
      }).join("");

      if (libraryStatus) {
        libraryStatus.textContent = "当前共展示 " + assets.length + " 个素材，可点击卡片查看详情并继续创作。";
      }

      assetGrid.querySelectorAll(".asset-card").forEach(function (node) {
        node.addEventListener("click", function () {
          selectedAssetId = node.getAttribute("data-asset-id");
          renderAssets();
        });
      });

      updateDetail(assets.find(function (item) {
        return item.id === selectedAssetId;
      }));
    }

    function getSelectedAsset() {
      return getFilteredAssets().find(function (item) {
        return item.id === selectedAssetId;
      }) || null;
    }

    if (searchInput) {
      searchInput.addEventListener("input", renderAssets);
    }

    document.querySelectorAll("[data-material-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeType = button.getAttribute("data-material-type");
        document.querySelectorAll("[data-material-type]").forEach(function (node) {
          node.classList.toggle("active", node === button);
        });
        renderAssets();
      });
    });

    document.querySelectorAll("[data-material-status]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeStatus = button.getAttribute("data-material-status");
        document.querySelectorAll("[data-material-status]").forEach(function (node) {
          node.classList.toggle("active", node === button);
        });
        renderAssets();
      });
    });

    document.querySelectorAll("[data-material-sort]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeSort = button.getAttribute("data-material-sort");
        document.querySelectorAll("[data-material-sort]").forEach(function (node) {
          node.classList.toggle("active", node === button);
        });
        renderAssets();
      });
    });

    document.querySelectorAll(".upload-open").forEach(function (button) {
      button.addEventListener("click", function () {
        go("upload.html", 120);
      });
    });

    const reuseFromLibraryButton = document.getElementById("reuseFromLibraryBtn");
    if (reuseFromLibraryButton) {
      reuseFromLibraryButton.addEventListener("click", function () {
        const asset = getSelectedAsset();
        if (!asset) {
          showToast("请先选中一个素材。");
          return;
        }
        if (asset.historyTaskId) {
          mock.reuseHistoryTask(asset.historyTaskId);
        } else if (asset.taskKey) {
          mock.selectTask(asset.taskKey);
          mock.saveConfig({
            sceneTemplate: asset.sceneTemplate || mock.getTaskMeta(asset.taskKey).templates[0]
          });
        }
        go("scene-config.html", 120);
      });
    }

    const newFolderButton = document.getElementById("newFolderBtn");
    if (newFolderButton) {
      newFolderButton.addEventListener("click", function () {
        showToast("当前原型先展示单层素材库结构，文件夹管理可在下一轮补充。");
      });
    }

    if (reuseButton) {
      reuseButton.addEventListener("click", function () {
        const asset = getSelectedAsset();
        if (!asset) {
          showToast("请先选中一个素材。");
          return;
        }
        if (asset.historyTaskId) {
          mock.reuseHistoryTask(asset.historyTaskId);
        } else if (asset.taskKey) {
          mock.selectTask(asset.taskKey);
          mock.saveConfig({
            sceneTemplate: asset.sceneTemplate || mock.getTaskMeta(asset.taskKey).templates[0]
          });
        }
        go("scene-config.html", 120);
      });
    }

    if (sourceButton) {
      sourceButton.addEventListener("click", function () {
        const asset = getSelectedAsset();
        if (!asset) {
          showToast("请先选中一个素材。");
          return;
        }
        if (asset.historyTaskId) {
          mock.reuseHistoryTask(asset.historyTaskId);
          go("history.html", 120);
          return;
        }
        if (asset.type === "template") {
          showToast("模板素材没有单独来源任务，可直接继续创作。");
          return;
        }
        go("upload.html", 120);
      });
    }

    renderAssets();
  }

  function bindHistory() {
    const mock = getMock();
    if (!mock) return;

    const historyGrid = document.getElementById("historyGrid");
    const searchInput = document.getElementById("taskSearch");
    const batchBar = document.getElementById("batchBar");
    let selectedId = "";
    let activeStatus = "all";
    let activeSort = "recent";
    let batchMode = false;

    function getVisibleHistory() {
      const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
      let items = mock.getHistory();

      if (activeStatus !== "all") {
        items = items.filter(function (item) {
          if (activeStatus === "exported") return !!item.exported;
          return item.status === activeStatus;
        });
      }

      if (keyword) {
        items = items.filter(function (item) {
          return [
            item.taskName,
            item.category,
            item.sceneTemplate,
            item.uploadedName,
            item.notes
          ]
            .join(" ")
            .toLowerCase()
            .indexOf(keyword) >= 0;
        });
      }

      items.sort(function (left, right) {
        if (activeSort === "downloads") {
          return (right.downloadCount || 0) - (left.downloadCount || 0);
        }
        if (activeSort === "created") {
          return (right.createdAt || 0) - (left.createdAt || 0);
        }
        return (right.updatedAt || 0) - (left.updatedAt || 0);
      });

      return items;
    }

    function updateDetail(entry) {
      if (!entry) {
        setText("#detailType", "暂无任务");
        setText("#detailCategory", "-");
        setText("#detailStatus", "-");
        setText("#detailCount", "0 张");
        return;
      }

      setText("#detailType", entry.taskName);
      setText("#detailCategory", entry.category);
      setText("#detailStatus", statusText(entry.status));
      setText("#detailCount", entry.resultsCount + " 张");
    }

    function renderHistoryGrid() {
      if (!historyGrid) return;

      const items = getVisibleHistory();
      if (!selectedId || !items.some(function (item) { return item.id === selectedId; })) {
        selectedId = items[0] ? items[0].id : "";
      }

      if (!items.length) {
        historyGrid.innerHTML =
          '<div class="history-item"><strong>暂无匹配任务</strong><p>可以调整筛选条件，或从当前配置重新创建一个新任务。</p></div>';
        updateDetail(null);
        return;
      }

      historyGrid.innerHTML = items
        .map(function (entry) {
          const activeStyle = entry.id === selectedId
            ? "border-color:#cfd5ff;background:#f5f6ff;box-shadow:0 14px 30px rgba(91,108,255,.12);"
            : "";
          return (
            '<div class="history-item" data-task-id="' + escapeHtml(entry.id) + '" style="cursor:pointer;' + activeStyle + '">' +
            "<strong>" + escapeHtml(entry.taskName) + "</strong>" +
            "<p>" + escapeHtml(entry.sceneTemplate) + " · " + escapeHtml(entry.ratio) + " · " + escapeHtml(statusText(entry.status)) + "</p>" +
            "<p>素材：" + escapeHtml(entry.uploadedName || "示例素材") + " · 更新时间：" + escapeHtml(formatTimeLabel(entry.updatedAt)) + "</p>" +
            '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="secondary-btn" data-history-action="view" data-task-id="' + escapeHtml(entry.id) + '" style="min-height:36px;padding:0 12px;">查看结果</button>' +
            '<button class="secondary-btn" data-history-action="reuse" data-task-id="' + escapeHtml(entry.id) + '" style="min-height:36px;padding:0 12px;">复用配置</button>' +
            "</div></div>"
          );
        })
        .join("");

      historyGrid.querySelectorAll(".history-item[data-task-id]").forEach(function (itemNode) {
        itemNode.addEventListener("click", function () {
          selectedId = itemNode.getAttribute("data-task-id");
          renderHistoryGrid();
        });
        itemNode.addEventListener("dblclick", function () {
          const entry = getVisibleHistory().find(function (item) {
            return item.id === itemNode.getAttribute("data-task-id");
          });
          if (!entry) return;
          mock.reuseHistoryTask(entry.id);
          go(entry.status === "generating" ? "scene-task.html" : "result.html", 120);
        });
      });

      historyGrid.querySelectorAll("[data-history-action]").forEach(function (button) {
        button.addEventListener("click", function (event) {
          event.stopPropagation();
          const action = button.getAttribute("data-history-action");
          const taskId = button.getAttribute("data-task-id");
          if (action === "view") {
            const entry = mock.getHistory().find(function (item) {
              return item.id === taskId;
            });
            mock.reuseHistoryTask(taskId);
            go(entry && entry.status === "generating" ? "scene-task.html" : "result.html", 120);
            return;
          }
          if (action === "reuse") {
            mock.reuseHistoryTask(taskId);
            go("scene-config.html", 120);
          }
        });
      });

      updateDetail(items.find(function (item) {
        return item.id === selectedId;
      }));
    }

    function getSelectedEntry() {
      return mock.getHistory().find(function (item) {
        return item.id === selectedId;
      });
    }

    function toggleBatchBar() {
      batchMode = !batchMode;
      if (batchBar) batchBar.hidden = !batchMode;
      showToast(batchMode ? "已开启批量操作模式。" : "已关闭批量操作模式。");
    }

    if (batchBar) batchBar.hidden = true;

    if (searchInput) {
      searchInput.addEventListener("input", renderHistoryGrid);
    }

    document.querySelectorAll("[data-filter-status]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeStatus = button.getAttribute("data-filter-status");
        document.querySelectorAll("[data-filter-status]").forEach(function (node) {
          node.classList.toggle("active", node === button);
        });
        renderHistoryGrid();
      });
    });

    document.querySelectorAll("[data-filter-sort]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeSort = button.getAttribute("data-filter-sort");
        document.querySelectorAll("[data-filter-sort]").forEach(function (node) {
          node.classList.toggle("active", node === button);
        });
        renderHistoryGrid();
      });
    });

    document.querySelectorAll("#topCreateBtn, #historyCreateBtn").forEach(function (node) {
      node.addEventListener("click", function () {
        go("upload.html", 120);
      });
    });

    const batchToggleButton = document.getElementById("batchToggleBtn");
    if (batchToggleButton) {
      batchToggleButton.addEventListener("click", toggleBatchBar);
    }

    const sideViewButton = document.getElementById("sideViewBtn");
    if (sideViewButton) {
      sideViewButton.addEventListener("click", function () {
        const entry = getSelectedEntry();
        if (!entry) return;
        mock.reuseHistoryTask(entry.id);
        go(entry.status === "generating" ? "scene-task.html" : "result.html", 120);
      });
    }

    const sideReuseButton = document.getElementById("sideReuseBtn");
    if (sideReuseButton) {
      sideReuseButton.addEventListener("click", function () {
        const entry = getSelectedEntry();
        if (!entry) return;
        mock.reuseHistoryTask(entry.id);
        go("scene-config.html", 120);
      });
    }

    const newFromConfigButton = document.getElementById("newFromConfigBtn");
    if (newFromConfigButton) {
      newFromConfigButton.addEventListener("click", function () {
        const entry = getSelectedEntry();
        if (!entry) return;
        mock.selectTask(entry.taskKey);
        mock.saveConfig({
          ratio: entry.ratio,
          sceneTemplate: entry.sceneTemplate,
          protection: entry.protection,
          notes: entry.notes
        });
        go("upload.html", 120);
      });
    }

    const batchSaveButton = document.getElementById("batchSaveBtn");
    if (batchSaveButton) {
      batchSaveButton.addEventListener("click", function () {
        const visibleIds = getVisibleHistory().map(function (item) { return item.id; });
        if (!visibleIds.length) {
          showToast("当前没有可归档的任务。");
          return;
        }
        mock.updateHistoryEntries(visibleIds, { archived: true });
        renderHistoryGrid();
        showToast("已批量加入素材库归档。");
      });
    }

    const batchExportButton = document.getElementById("batchExportBtn");
    if (batchExportButton) {
      batchExportButton.addEventListener("click", function () {
        const visibleIds = getVisibleHistory().map(function (item) { return item.id; });
        if (!visibleIds.length) {
          showToast("当前没有可导出的任务。");
          return;
        }
        mock.updateHistoryEntries(visibleIds, function (entry) {
          return {
            exported: true,
            downloadCount: (entry.downloadCount || 0) + 1
          };
        });
        renderHistoryGrid();
        showToast("已批量记录导出。");
      });
    }

    const batchDeleteButton = document.getElementById("batchDeleteBtn");
    if (batchDeleteButton) {
      batchDeleteButton.addEventListener("click", function () {
        const visibleIds = getVisibleHistory().map(function (item) { return item.id; });
        if (!visibleIds.length) {
          showToast("当前没有可删除的任务。");
          return;
        }
        mock.removeHistory(visibleIds);
        renderHistoryGrid();
        showToast("已删除当前筛选范围内的任务记录。");
      });
    }

    renderHistoryGrid();
  }

  function bindCommonControls() {
    bindClick("#notifyBtn, #noticeBtn", null, 0, function (node) {
      node.blur();
      return false;
    });

    const accountPanel = mountAccountPopover();
    document.querySelectorAll(".topbar .avatar").forEach(function (node) {
      node.classList.add("is-interactive");
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-haspopup", "dialog");
      node.setAttribute("aria-label", "打开个人账号面板");

      node.addEventListener("click", function (event) {
        event.stopPropagation();
        if (!accountPanel) return;
        accountPanel.toggle(node);
      });

      node.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!accountPanel) return;
        accountPanel.toggle(node);
      });
    });

    document.querySelectorAll("[data-assistant-open]").forEach(function (node) {
      node.addEventListener("click", function () {
        openAssistantWidget();
      });
    });
  }

  function applyShellLayoutState() {
    const hasShellLayout =
      document.querySelector(".sidebar") &&
      document.querySelector(".topbar") &&
      document.querySelector(".main, .app");

    if (!hasShellLayout) return;

    document.body.setAttribute("data-shell-layout", "platform");
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }

  function init() {
    const page = currentPage();
    if (isAssistantPage(page)) {
      window.location.replace(assistantFallbackRoute());
      return;
    }
    document.body.setAttribute("data-page", page);
    applyShellLayoutState();
    normalizeBranding();
    applyShellClasses();
    bindSidebarRoutes();
    bindCommonControls();
    mountFloatingAssistant();

    if (page === "marketing.html") bindMarketing();
    if (page === "login.html") bindLogin();
    if (page === "dashboard.html") bindDashboard();
    if (page === "upload.html") bindUpload();
    if (page === "scene-config.html") bindSceneConfig();
    if (page === "scene-task.html") bindSceneTask();
    if (page === "result.html") bindResult();
    if (page === "material-library.html") bindMaterialLibrary();
    if (page === "history.html") bindHistory();

    window.requestAnimationFrame(function () {
      document.body.classList.add("page-ready");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
