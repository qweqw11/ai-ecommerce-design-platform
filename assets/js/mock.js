(function () {
  const TASK_CATALOG = {
    "product-main": {
      key: "product-main",
      name: "商品上新主图",
      category: "美妆护肤",
      recommendedRatio: "1:1 / 3:4",
      ratios: ["1:1 / 3:4", "4:5 / 3:4", "16:9 / 1:1"],
      templates: ["晨光浴室台面", "极简客厅背景", "品牌高光展台"],
      protections: ["高", "中", "低"],
      quota: "约 280 点",
      resultsCount: 4,
      uploadDescription: "适合新品上架、活动测款和主图投放的标准化主链路任务。",
      heroImage: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
      results: [
        "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"
      ],
      resultMetrics: {
        success: "高",
        fidelity: "强",
        export: "可导出"
      }
    },
    "background-migration": {
      key: "background-migration",
      name: "一键换背景",
      category: "鞋服箱包",
      recommendedRatio: "4:5 / 3:4",
      ratios: ["4:5 / 3:4", "1:1 / 3:4", "16:9 / 1:1"],
      templates: ["清透活动主视觉", "高级货架空间", "节日氛围场景"],
      protections: ["高", "中", "低"],
      quota: "约 320 点",
      resultsCount: 4,
      uploadDescription: "保留主体前提下快速切换背景氛围，适合场景迁移和活动版本迭代。",
      heroImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
      results: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"
      ],
      resultMetrics: {
        success: "高",
        fidelity: "强",
        export: "支持活动版导出"
      }
    },
    "white-background": {
      key: "white-background",
      name: "白底图 / 转平铺",
      category: "标准商品图",
      recommendedRatio: "1:1 / 4:5",
      ratios: ["1:1 / 4:5", "1:1 / 3:4", "4:5 / 3:4"],
      templates: ["电商白底展示", "平铺阴影增强", "货架标准图"],
      protections: ["高", "中", "低"],
      quota: "约 220 点",
      resultsCount: 4,
      uploadDescription: "适合平台上架和基础展示，重点保证主体完整、背景干净、边缘稳定。",
      heroImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
      results: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80"
      ],
      resultMetrics: {
        success: "高",
        fidelity: "稳",
        export: "适配上架规格"
      }
    }
  };

  const DEFAULT_TASK_KEY = "product-main";
  const HISTORY_KEY = "platform:history";
  const TASK_STATE_KEY = "platform:taskState";

  const storage = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      window.localStorage.removeItem(key);
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getTaskMeta(taskKey) {
    return TASK_CATALOG[taskKey] || TASK_CATALOG[DEFAULT_TASK_KEY];
  }

  function createTaskId() {
    return "TASK-" + Date.now().toString(36).toUpperCase();
  }

  function createDefaultTaskState(taskKey) {
    const task = getTaskMeta(taskKey);
    return {
      currentTaskId: "",
      selectedTaskKey: task.key,
      selectedTask: task.name,
      uploaded: false,
      configured: false,
      resultReady: false,
      status: "idle",
      progress: 0,
      generationStartedAt: 0,
      generationDurationMs: 5200,
      selectedResultIndex: 0,
      results: [],
      archived: false,
      downloadCount: 0,
      uploadedAsset: {
        name: "",
        source: "empty",
        previewSrc: task.heroImage,
        sizeLabel: "",
        uploadedAt: 0
      },
      config: {
        taskType: task.name,
        ratio: task.recommendedRatio,
        sceneTemplate: task.templates[0],
        protection: task.protections[0],
        notes: "保留商品主体，优先稳定输出适合交付的结果。"
      },
      updatedAt: Date.now()
    };
  }

  function normalizeTaskState(state) {
    const base = createDefaultTaskState(
      state && state.selectedTaskKey ? state.selectedTaskKey : DEFAULT_TASK_KEY
    );
    const merged = Object.assign({}, base, state || {});
    merged.selectedTask = getTaskMeta(merged.selectedTaskKey).name;
    merged.uploadedAsset = Object.assign({}, base.uploadedAsset, state && state.uploadedAsset ? state.uploadedAsset : {});
    merged.config = Object.assign({}, base.config, state && state.config ? state.config : {});
    merged.updatedAt = merged.updatedAt || Date.now();
    return merged;
  }

  function buildHistoryEntryFromState(state, statusOverride) {
    const task = getTaskMeta(state.selectedTaskKey);
    return {
      id: state.currentTaskId || createTaskId(),
      taskKey: task.key,
      taskName: task.name,
      category: task.category,
      status: statusOverride || state.status || "idle",
      resultsCount: (state.results && state.results.length) || task.resultsCount,
      ratio: state.config.ratio,
      sceneTemplate: state.config.sceneTemplate,
      protection: state.config.protection,
      notes: state.config.notes,
      selectedResultIndex: state.selectedResultIndex || 0,
      coverSrc: (state.results && state.results[state.selectedResultIndex || 0]) || task.results[0],
      uploadedName: state.uploadedAsset.name || "示例素材",
      archived: !!state.archived,
      exported: (state.downloadCount || 0) > 0,
      downloadCount: state.downloadCount || 0,
      createdAt: state.generationStartedAt || state.updatedAt || Date.now(),
      updatedAt: Date.now()
    };
  }

  function createSeedHistory() {
    const now = Date.now();
    return [
      {
        id: "TASK-SEED-003",
        taskKey: "white-background",
        taskName: "白底图 / 转平铺",
        category: "标准商品图",
        status: "completed",
        resultsCount: 4,
        ratio: "1:1 / 4:5",
        sceneTemplate: "电商白底展示",
        protection: "高",
        notes: "优先保证主体边缘干净，适合直接上架。",
        selectedResultIndex: 0,
        coverSrc: getTaskMeta("white-background").results[0],
        uploadedName: "白底耳机样图",
        archived: true,
        exported: true,
        downloadCount: 3,
        createdAt: now - 1000 * 60 * 60 * 30,
        updatedAt: now - 1000 * 60 * 60 * 24
      },
      {
        id: "TASK-SEED-002",
        taskKey: "background-migration",
        taskName: "一键换背景",
        category: "鞋服箱包",
        status: "completed",
        resultsCount: 4,
        ratio: "4:5 / 3:4",
        sceneTemplate: "高级货架空间",
        protection: "高",
        notes: "适配活动页和货架投放的双版本背景。",
        selectedResultIndex: 1,
        coverSrc: getTaskMeta("background-migration").results[1],
        uploadedName: "运动鞋主体图",
        archived: false,
        exported: false,
        downloadCount: 0,
        createdAt: now - 1000 * 60 * 60 * 12,
        updatedAt: now - 1000 * 60 * 60 * 10
      },
      {
        id: "TASK-SEED-001",
        taskKey: "product-main",
        taskName: "商品上新主图",
        category: "美妆护肤",
        status: "completed",
        resultsCount: 4,
        ratio: "1:1 / 3:4",
        sceneTemplate: "晨光浴室台面",
        protection: "高",
        notes: "保留主体结构，适合首页首图。",
        selectedResultIndex: 0,
        coverSrc: getTaskMeta("product-main").results[0],
        uploadedName: "精华瓶商品图",
        archived: true,
        exported: true,
        downloadCount: 2,
        createdAt: now - 1000 * 60 * 60 * 6,
        updatedAt: now - 1000 * 60 * 60 * 5
      }
    ];
  }

  function getHistory() {
    return storage.get(HISTORY_KEY, createSeedHistory());
  }

  function setHistory(history) {
    storage.set(HISTORY_KEY, history);
  }

  function upsertHistoryEntry(entry) {
    const history = getHistory();
    const index = history.findIndex(function (item) {
      return item.id === entry.id;
    });
    if (index >= 0) {
      history[index] = Object.assign({}, history[index], entry, { updatedAt: Date.now() });
    } else {
      history.unshift(entry);
    }
    setHistory(history);
    return history;
  }

  function setTaskState(payload) {
    storage.set(TASK_STATE_KEY, normalizeTaskState(payload));
  }

  function getTaskState() {
    return normalizeTaskState(storage.get(TASK_STATE_KEY, createDefaultTaskState(DEFAULT_TASK_KEY)));
  }

  function finalizeGeneration(state) {
    const task = getTaskMeta(state.selectedTaskKey);
    state.status = "completed";
    state.progress = 100;
    state.resultReady = true;
    state.configured = true;
    state.results = clone(task.results);
    state.selectedResultIndex = 0;
    state.updatedAt = Date.now();
    state.currentTaskId = state.currentTaskId || createTaskId();
    setTaskState(state);
    upsertHistoryEntry(buildHistoryEntryFromState(state, "completed"));
    return state;
  }

  const mock = {
    getUser() {
      return storage.get("platform:user", { name: "示例账号", plan: "专业版" });
    },
    setUser(name) {
      storage.set("platform:user", { name: name || "示例账号", plan: "专业版" });
    },
    clearUser() {
      storage.remove("platform:user");
    },
    setLastPage(path) {
      storage.set("platform:lastPage", path);
    },
    getLastPage() {
      return storage.get("platform:lastPage", "");
    },
    getTaskCatalog() {
      return clone(TASK_CATALOG);
    },
    getTaskMeta(taskKey) {
      return clone(getTaskMeta(taskKey));
    },
    setTaskState: setTaskState,
    getTaskState: getTaskState,
    resetTaskState(taskKey) {
      const next = createDefaultTaskState(taskKey || DEFAULT_TASK_KEY);
      setTaskState(next);
      return next;
    },
    selectTask(taskKey) {
      const next = createDefaultTaskState(taskKey || DEFAULT_TASK_KEY);
      setTaskState(next);
      return next;
    },
    applyUpload(payload) {
      const state = getTaskState();
      state.uploaded = true;
      state.status = "uploaded";
      state.uploadedAsset = Object.assign({}, state.uploadedAsset, payload || {}, {
        uploadedAt: Date.now()
      });
      state.updatedAt = Date.now();
      setTaskState(state);
      return state;
    },
    saveConfig(payload) {
      const state = getTaskState();
      const task = getTaskMeta(state.selectedTaskKey);
      state.configured = true;
      state.status = state.uploaded ? "configured" : state.status;
      state.config = Object.assign({}, state.config, payload || {});
      state.config.taskType = task.name;
      state.updatedAt = Date.now();
      setTaskState(state);
      return state;
    },
    startGeneration(payload) {
      const state = getTaskState();
      const task = getTaskMeta(state.selectedTaskKey);
      state.currentTaskId = createTaskId();
      state.status = "generating";
      state.progress = 12;
      state.resultReady = false;
      state.archived = false;
      state.downloadCount = 0;
      state.results = [];
      state.selectedResultIndex = 0;
      state.uploaded = true;
      state.configured = true;
      state.generationStartedAt = Date.now();
      state.generationDurationMs = 5200;
      state.config = Object.assign({}, state.config, payload || {}, {
        taskType: task.name
      });
      state.updatedAt = Date.now();
      setTaskState(state);
      upsertHistoryEntry(buildHistoryEntryFromState(state, "generating"));
      return state;
    },
    syncGeneration() {
      const state = getTaskState();
      if (state.status !== "generating") return state;

      const elapsed = Date.now() - (state.generationStartedAt || Date.now());
      const rawProgress = Math.round((elapsed / state.generationDurationMs) * 100);
      state.progress = Math.max(state.progress || 0, Math.min(rawProgress, 96));

      if (elapsed >= state.generationDurationMs) {
        return finalizeGeneration(state);
      }

      state.updatedAt = Date.now();
      setTaskState(state);
      upsertHistoryEntry(buildHistoryEntryFromState(state, "generating"));
      return state;
    },
    ensureResultState() {
      const state = getTaskState();
      if (state.status === "generating") {
        return mock.syncGeneration();
      }
      if (state.resultReady || state.results.length) {
        return state;
      }
      return finalizeGeneration(state);
    },
    setSelectedResult(index) {
      const state = getTaskState();
      const nextIndex = Math.max(0, Math.min(index, Math.max(state.results.length - 1, 0)));
      state.selectedResultIndex = nextIndex;
      state.updatedAt = Date.now();
      setTaskState(state);
      upsertHistoryEntry(buildHistoryEntryFromState(state));
      return state;
    },
    archiveCurrentResult() {
      const state = getTaskState();
      state.archived = true;
      state.updatedAt = Date.now();
      setTaskState(state);
      upsertHistoryEntry(buildHistoryEntryFromState(state, state.status || "completed"));
      return state;
    },
    incrementDownloads(amount) {
      const state = getTaskState();
      state.downloadCount = (state.downloadCount || 0) + (amount || 1);
      state.updatedAt = Date.now();
      setTaskState(state);
      upsertHistoryEntry(buildHistoryEntryFromState(state, state.status || "completed"));
      return state;
    },
    getHistory() {
      return clone(getHistory());
    },
    updateHistoryEntries(taskIds, patchOrUpdater) {
      const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
      const history = getHistory().map(function (item) {
        if (ids.indexOf(item.id) === -1) return item;
        const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(clone(item)) : patchOrUpdater;
        return Object.assign({}, item, patch || {}, {
          updatedAt: Date.now()
        });
      });
      setHistory(history);
      return clone(history);
    },
    removeHistory(taskIds) {
      const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
      const filtered = getHistory().filter(function (item) {
        return ids.indexOf(item.id) === -1;
      });
      setHistory(filtered);
      return clone(filtered);
    },
    reuseHistoryTask(taskId) {
      const entry = getHistory().find(function (item) {
        return item.id === taskId;
      });
      if (!entry) return getTaskState();

      const task = getTaskMeta(entry.taskKey);
      const state = createDefaultTaskState(entry.taskKey);
      state.currentTaskId = entry.id;
      state.selectedTaskKey = entry.taskKey;
      state.selectedTask = task.name;
      state.uploaded = true;
      state.configured = true;
      state.resultReady = entry.status === "completed";
      state.status = entry.status;
      state.results = entry.status === "completed" ? clone(task.results) : [];
      if (entry.status === "generating") {
        state.generationStartedAt = entry.createdAt || Date.now();
        state.generationDurationMs = 5200;
      }
      state.selectedResultIndex = entry.selectedResultIndex || 0;
      state.archived = !!entry.archived;
      state.downloadCount = entry.downloadCount || 0;
      state.uploadedAsset = {
        name: entry.uploadedName || "复用素材",
        source: "history",
        previewSrc: entry.coverSrc || task.heroImage,
        sizeLabel: "",
        uploadedAt: entry.createdAt
      };
      state.config = {
        taskType: task.name,
        ratio: entry.ratio || task.recommendedRatio,
        sceneTemplate: entry.sceneTemplate || task.templates[0],
        protection: entry.protection || task.protections[0],
        notes: entry.notes || state.config.notes
      };
      state.updatedAt = Date.now();
      setTaskState(state);
      return state;
    }
  };

  window.platformMock = mock;
})();
