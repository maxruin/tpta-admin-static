/* ============================================================
   臺灣物理治療學會官網改版 — CMS 後台管理系統 共用互動
   純前端示意（無實際後端），供介面驗收與流程走查使用
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initDropdowns();
    initTabs();
    initModals();
    initSwitches();
    initTableSearch();
    initDataTables();
    initBulkDelete();
    initRte();
    initDropzone();
    initImageUpload();
    initTagPicker();
    initTableDataRows();
    initLinkListRows();
    initCharCounter();
    initPasswordToggle();
    initFaqAccordion();
    initToastDemo();
  });

  /* ---------- 側邊欄（手機版展開/收合） ---------- */
  function initSidebar() {
    var toggle = document.querySelector('.side-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('side-open');
    });
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('side-open')) return;
      if (e.target.closest('.admin-sidebar') || e.target.closest('.side-toggle')) return;
      document.body.classList.remove('side-open');
    });
  }

  /* ---------- 下拉選單（使用者選單／篩選） ---------- */
  function initDropdowns() {
    var triggers = document.querySelectorAll('[data-dropdown]');
    triggers.forEach(function (t) {
      var panel = document.getElementById(t.getAttribute('data-dropdown'));
      if (!panel) return;
      t.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.contains('is-show');
        document.querySelectorAll('.dropdown-panel.is-show').forEach(function (p) { p.classList.remove('is-show'); });
        if (!open) panel.classList.add('is-show');
      });
    });
    document.addEventListener('click', function () {
      document.querySelectorAll('.dropdown-panel.is-show').forEach(function (p) { p.classList.remove('is-show'); });
    });
  }

  /* ---------- 分頁籤 Tabs ---------- */
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(function (tabs) {
      var btns = tabs.querySelectorAll('button[data-tab]');
      var panels = document.querySelectorAll('[data-tabpanel]');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-tab');
          btns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          panels.forEach(function (p) {
            if (p.closest('.tabs-group') !== tabs.closest('.tabs-group')) return;
          });
          document.querySelectorAll('[data-tabpanel]').forEach(function (p) {
            p.classList.toggle('is-active', p.getAttribute('data-tabpanel') === key);
          });
        });
      });
    });
  }

  /* ---------- Modal（新增/編輯/刪除確認） ---------- */
  function initModals() {
    document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-open-modal');
        var modal = document.getElementById(id);
        if (!modal) return;
        var titleTarget = modal.querySelector('[data-modal-title]');
        var nameAttr = btn.getAttribute('data-item-name');
        if (titleTarget && nameAttr) titleTarget.textContent = nameAttr;
        modal.removeAttribute('hidden');
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var modal = btn.closest('.modal-mask');
        if (modal) modal.setAttribute('hidden', '');
      });
    });
    document.querySelectorAll('.modal-mask').forEach(function (mask) {
      mask.addEventListener('click', function (e) {
        if (e.target === mask) mask.setAttribute('hidden', '');
      });
    });
    document.querySelectorAll('[data-confirm-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var modal = btn.closest('.modal-mask');
        if (modal) modal.setAttribute('hidden', '');
        var row = btn.closest('.modal-mask')._row;
        showToast('已刪除');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-mask:not([hidden])').forEach(function (m) { m.setAttribute('hidden', ''); });
      }
    });
  }

  /* ---------- 開關（上架/下架） ---------- */
  function initSwitches() {
    document.querySelectorAll('.switch input[type=checkbox]').forEach(function (sw) {
      sw.addEventListener('change', function () {
        var row = sw.closest('tr');
        var label = row ? row.querySelector('[data-status-label]') : null;
        if (label) {
          label.textContent = sw.checked ? (label.getAttribute('data-on-text') || '上架中') : (label.getAttribute('data-off-text') || '已下架');
          label.classList.toggle('on', sw.checked);
          label.classList.toggle('off', !sw.checked);
        }
        showToast(sw.checked ? '已上架' : '已下架');
      });
    });
  }

  /* ---------- 表格全選 / 批次操作列 ---------- */
  /* ---------- 資料表：搜尋／篩選／排序／分頁／全選（整合，互相連動） ---------- */
  function initDataTables() {
    document.querySelectorAll('table.dtbl').forEach(function (table) {
      setupDataTable(table);
    });
  }

  function setupDataTable(table) {
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var card = table.closest('.card');
    var pager = card ? card.querySelector('.pager') : null;
    var pageSize = parseInt(table.getAttribute('data-page-size'), 10) || 10;
    var state = { page: 1 };

    function allRows() { return Array.prototype.slice.call(tbody.querySelectorAll('tr')); }
    function matchingRows() {
      return allRows().filter(function (r) { return r.dataset.searchHidden !== '1' && r.dataset.filterHidden !== '1'; });
    }

    function render() {
      var matching = matchingRows();
      var total = matching.length;
      var totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      var start = (state.page - 1) * pageSize;
      var end = start + pageSize;
      var pageRows = matching.slice(start, end);

      allRows().forEach(function (r) { r.style.display = 'none'; });
      pageRows.forEach(function (r) { r.style.display = ''; });

      // 空狀態
      var wrap = table.closest('.tbl-wrap') || table.parentNode;
      var empty = wrap.parentNode ? wrap.parentNode.querySelector('.empty[data-auto-empty]') : null;
      if (empty) empty.hidden = total > 0;

      // 全選框：只反映目前頁面上的勾選狀態
      var headChk = table.querySelector('thead .chk-all');
      if (headChk) {
        var pageBoxes = pageRows.map(function (r) { return r.querySelector('.chk'); }).filter(Boolean);
        headChk.checked = pageBoxes.length > 0 && pageBoxes.every(function (b) { return b.checked; });
      }

      if (!pager) return;
      var info = pager.querySelector('.pg-info');
      if (info) {
        info.textContent = total === 0 ? '共 0 筆' : ('共 ' + total + ' 筆，顯示第 ' + (start + 1) + '–' + Math.min(end, total) + ' 筆');
      }
      var btnsWrap = pager.querySelector('.pg-btns');
      if (!btnsWrap) return;

      var pages = [];
      if (totalPages <= 7) {
        for (var i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        var lo = Math.max(1, state.page - 2), hi = Math.min(totalPages, state.page + 2);
        if (lo > 1) pages.push(1);
        if (lo > 2) pages.push('…');
        for (var j = lo; j <= hi; j++) pages.push(j);
        if (hi < totalPages - 1) pages.push('…');
        if (hi < totalPages) pages.push(totalPages);
      }

      var html = '<button type="button" data-pg="prev"' + (state.page <= 1 ? ' disabled' : '') + ' aria-label="上一頁">‹</button>';
      pages.forEach(function (p) {
        if (p === '…') { html += '<button type="button" disabled style="border-color:transparent;background:transparent">…</button>'; }
        else { html += '<button type="button" data-pg="' + p + '"' + (p === state.page ? ' class="is-active"' : '') + '>' + p + '</button>'; }
      });
      html += '<button type="button" data-pg="next"' + (state.page >= totalPages ? ' disabled' : '') + ' aria-label="下一頁">›</button>';
      btnsWrap.innerHTML = html;

      btnsWrap.querySelectorAll('button[data-pg]:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = btn.getAttribute('data-pg');
          if (v === 'prev') state.page -= 1;
          else if (v === 'next') state.page += 1;
          else state.page = parseInt(v, 10);
          render();
        });
      });
    }

    table._dt = { render: render, state: state, matchingRows: matchingRows };

    // 排序：重排 DOM 後重新分頁（停留在目前頁碼）
    table.querySelectorAll('th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var idx = Array.prototype.indexOf.call(th.parentNode.children, th);
        var rows = allRows();
        var dir = th.getAttribute('data-dir') === 'asc' ? 'desc' : 'asc';
        table.querySelectorAll('th.sortable').forEach(function (t) { t.removeAttribute('data-dir'); });
        th.setAttribute('data-dir', dir);
        rows.sort(function (a, b) {
          var av = (a.children[idx] && a.children[idx].getAttribute('data-sort')) || (a.children[idx] ? a.children[idx].textContent.trim() : '');
          var bv = (b.children[idx] && b.children[idx].getAttribute('data-sort')) || (b.children[idx] ? b.children[idx].textContent.trim() : '');
          var an = parseFloat(av), bn = parseFloat(bv);
          var cmp;
          if (!isNaN(an) && !isNaN(bn)) cmp = an - bn; else cmp = av.localeCompare(bv, 'zh-Hant');
          return dir === 'asc' ? cmp : -cmp;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
        render();
      });
    });

    // 全選：只勾選目前頁面上顯示的列
    var headChk = table.querySelector('thead .chk-all');
    if (headChk) {
      headChk.addEventListener('change', function () {
        allRows().filter(function (r) { return r.style.display !== 'none'; }).forEach(function (r) {
          var box = r.querySelector('.chk');
          if (box) { box.checked = headChk.checked; box.dispatchEvent(new Event('change', { bubbles: true })); }
        });
      });
    }
    table.querySelectorAll('tbody .chk').forEach(function (box) {
      box.addEventListener('change', function () {
        var bulk = card ? card.querySelector('.bulkbar') : null;
        if (!bulk) return;
        var checked = table.querySelectorAll('tbody .chk:checked');
        bulk.classList.toggle('is-show', checked.length > 0);
        var countEl = bulk.querySelector('[data-selected-count]');
        if (countEl) countEl.textContent = checked.length;
      });
    });

    render();
  }

  /* ---------- 批次刪除（跨表格通用） ---------- */
  function initBulkDelete() {
    document.querySelectorAll('[data-bulk-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.card');
        var table = card ? card.querySelector('table.dtbl') : null;
        var checked = card ? card.querySelectorAll('tbody .chk:checked') : [];
        checked.forEach(function (b) {
          var row = b.closest('tr');
          if (row) row.style.opacity = '0';
        });
        setTimeout(function () {
          checked.forEach(function (b) { var row = b.closest('tr'); if (row) row.remove(); });
          var bulk = card ? card.querySelector('.bulkbar') : null;
          if (bulk) bulk.classList.remove('is-show');
          if (table && table._dt) table._dt.render();
          showToast('已刪除選取項目');
        }, 150);
      });
    });
  }

  /* ---------- 列表即時搜尋 / 篩選（標記列為隱藏，交給分頁邏輯統一渲染） ---------- */
  function initTableSearch() {
    document.querySelectorAll('[data-search-target]').forEach(function (input) {
      var table = document.querySelector(input.getAttribute('data-search-target'));
      if (!table) return;
      input.addEventListener('input', function () {
        var kw = input.value.trim().toLowerCase();
        table.querySelectorAll('tbody tr').forEach(function (row) {
          var hit = row.textContent.toLowerCase().indexOf(kw) > -1;
          row.dataset.searchHidden = hit ? '0' : '1';
        });
        if (table._dt) { table._dt.state.page = 1; table._dt.render(); }
      });
    });
    document.querySelectorAll('[data-filter-target]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var table = document.querySelector(sel.getAttribute('data-filter-target'));
        if (!table) return;
        var val = sel.value;
        var col = sel.getAttribute('data-filter-col');
        table.querySelectorAll('tbody tr').forEach(function (row) {
          if (!val) { row.dataset.filterHidden = '0'; return; }
          var cell = row.querySelector('[data-col="' + col + '"]');
          var match = cell && cell.textContent.trim() === val;
          row.dataset.filterHidden = match ? '0' : '1';
        });
        if (table._dt) { table._dt.state.page = 1; table._dt.render(); }
      });
    });
  }

  /* ---------- 富文本編輯器（execCommand 示意） ---------- */
  function initRte() {
    document.querySelectorAll('.rte').forEach(function (rte) {
      var body = rte.querySelector('.rte-body');
      rte.querySelectorAll('[data-cmd]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cmd = btn.getAttribute('data-cmd');
          var val = btn.getAttribute('data-val') || null;
          body.focus();
          try { document.execCommand(cmd, false, val); } catch (e) {}
        });
      });
    });
  }

  /* ---------- 檔案上傳拖放區 ---------- */
  function initDropzone() {
    document.querySelectorAll('.dropzone').forEach(function (zone) {
      var input = zone.querySelector('input[type=file]') || document.getElementById(zone.getAttribute('data-file-input'));
      var list = document.querySelector(zone.getAttribute('data-list-target')) || zone.parentNode.querySelector('.upload-list');
      zone.addEventListener('click', function (e) {
        if (input && e.target === zone || (e.target.closest('.dropzone') && !e.target.closest('input'))) {
          if (input) input.click();
        }
      });
      ['dragenter', 'dragover'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-drag'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-drag'); });
      });
      zone.addEventListener('drop', function (e) {
        var files = e.dataTransfer ? e.dataTransfer.files : [];
        addFiles(files, list);
      });
      if (input) {
        input.addEventListener('change', function () { addFiles(input.files, list); });
      }
    });
    function addFiles(files, list) {
      if (!list || !files) return;
      Array.prototype.forEach.call(files, function (f) {
        var item = document.createElement('div');
        item.className = 'upload-item';
        var kb = (f.size / 1024);
        var size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB';
        item.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2"/></svg>' +
          '<span class="fname"></span><span class="fsize"></span><button type="button" class="icon-btn danger" aria-label="移除"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg></button>';
        item.querySelector('.fname').textContent = f.name;
        item.querySelector('.fsize').textContent = size;
        item.querySelector('button').addEventListener('click', function () { item.remove(); });
        list.appendChild(item);
      });
      showToast('已加入 ' + files.length + ' 個檔案（示意，未實際上傳）');
    }
  }

  /* ---------- 圖片上傳預覽 ---------- */
  function initImageUpload() {
    document.querySelectorAll('.img-upload').forEach(function (box) {
      var input = box.querySelector('input[type=file]');
      if (!input) return;
      box.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          box.style.backgroundImage = 'url(' + e.target.result + ')';
          box.style.backgroundSize = 'cover';
          box.style.backgroundPosition = 'center';
          box.classList.add('has-img');
          var txt = box.querySelector('span');
          if (txt) txt.textContent = file.name;
        };
        reader.readAsDataURL(file);
      });
    });
  }

  /* ---------- 分類多選標籤 ---------- */
  function initTagPicker() {
    document.querySelectorAll('.tagpicker input').forEach(function (cb) {
      cb.addEventListener('change', function () {});
    });
  }

  /* ---------- 表格式資料維護：新增列 / 刪除列 / 上下移動 ---------- */
  function initTableDataRows() {
    document.querySelectorAll('[data-add-row]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var table = document.querySelector(btn.getAttribute('data-add-row'));
        if (!table) return;
        var tbody = table.querySelector('tbody');
        var tmplRow = tbody.querySelector('tr');
        var clone = tmplRow.cloneNode(true);
        clone.classList.add('is-new');
        clone.querySelectorAll('input.cell-input').forEach(function (inp) { inp.value = ''; });
        tbody.appendChild(clone);
        bindRowButtons(clone);
        var firstInput = clone.querySelector('input.cell-input');
        if (firstInput) firstInput.focus();
        showToast('已新增一列');
      });
    });
    document.querySelectorAll('.dtbl tbody tr').forEach(bindRowButtons);
    function bindRowButtons(row) {
      var del = row.querySelector('[data-del-row]');
      if (del && !del._bound) {
        del._bound = true;
        del.addEventListener('click', function () { row.remove(); showToast('已刪除該列'); });
      }
      var up = row.querySelector('[data-move-up]');
      if (up && !up._bound) {
        up._bound = true;
        up.addEventListener('click', function () {
          var prev = row.previousElementSibling;
          if (prev) row.parentNode.insertBefore(row, prev);
        });
      }
      var down = row.querySelector('[data-move-down]');
      if (down && !down._bound) {
        down._bound = true;
        down.addEventListener('click', function () {
          var next = row.nextElementSibling;
          if (next) row.parentNode.insertBefore(next, row);
        });
      }
    }
  }

  /* ---------- 重複列（連結清單 / Banner 清單 / 卡片 / 時間軸 / 章節）：新增一筆 ---------- */
  function initLinkListRows() {
    document.querySelectorAll('[data-add-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var list = document.querySelector(btn.getAttribute('data-add-item'));
        if (!list) return;
        var tmpl = list.querySelector('.repeat-row');
        if (!tmpl) return;
        var clone = tmpl.cloneNode(true);
        clone.querySelectorAll('input[type=text], input:not([type]), textarea').forEach(function (i) { i.value = ''; });
        list.appendChild(clone);
        bindRemove(clone);
        showToast('已新增一筆');
      });
    });
    document.querySelectorAll('.repeat-row').forEach(bindRemove);
    function bindRemove(row) {
      var btn = row.querySelector('[data-remove-item]');
      if (btn && !btn._bound) {
        btn._bound = true;
        btn.addEventListener('click', function () { row.remove(); showToast('已移除'); });
      }
    }
  }

/* ---------- 字數統計 ---------- */
  function initCharCounter() {
    document.querySelectorAll('[data-count-target]').forEach(function (input) {
      var out = document.querySelector(input.getAttribute('data-count-target'));
      var max = input.getAttribute('maxlength');
      function update() { if (out) out.textContent = input.value.length + (max ? ' / ' + max : ''); }
      input.addEventListener('input', update);
      update();
    });
  }

  /* ---------- 密碼顯示切換 ---------- */
  function initPasswordToggle() {
    document.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('data-toggle-pw'));
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  }

  /* ---------- FAQ 手風琴（管理端預覽） ---------- */
  function initFaqAccordion() {
    document.querySelectorAll('.faq summary').forEach(function (s) {});
  }

  /* ---------- Toast 訊息 ---------- */
  var toastBox;
  function showToast(msg) {
    if (!toastBox) {
      toastBox = document.querySelector('.toast');
      if (!toastBox) {
        toastBox = document.createElement('div');
        toastBox.className = 'toast';
        document.body.appendChild(toastBox);
      }
    }
    var item = document.createElement('div');
    item.className = 'toast-item';
    item.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
    item.querySelector('span').textContent = msg;
    toastBox.appendChild(item);
    requestAnimationFrame(function () { item.classList.add('is-show'); });
    setTimeout(function () {
      item.classList.remove('is-show');
      setTimeout(function () { item.remove(); }, 200);
    }, 2400);
  }
  window.CMSToast = showToast;

  function initToastDemo() {
    document.querySelectorAll('[data-toast]').forEach(function (btn) {
      btn.addEventListener('click', function () { showToast(btn.getAttribute('data-toast')); });
    });
    document.querySelectorAll('[data-save]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        showToast(btn.getAttribute('data-save') || '已儲存');
      });
    });
  }
})();
