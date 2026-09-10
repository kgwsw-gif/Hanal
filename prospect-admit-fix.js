/**
 * ProspectAdmitFix v1.3
 * 예비입사자 등록/취소/입사처리 시 UI 즉시 반영
 */
(function () {
  'use strict';
  if (window.ProspectAdmitFix && window.ProspectAdmitFix._installed) {
    console.warn('[ProspectAdmitFix] already loaded:', window.ProspectAdmitFix.version);
    return;
  }

  var FIX = {
    version: '1.3',
    _backups: {},
    _installed: false,
    _rebuilding: false,
    _hookedTargets: [],

    HOOK_TARGETS: [
      'submitPendingStudent',
      'confirmMoveIn',
      'autoConfirmDueMoveIns',
      'cancelPendingStudent',
      'forceDeleteStudent',
      'openConfirmModal'
    ],

    rebuild: async function () {
      if (FIX._rebuilding) return false;
      FIX._rebuilding = true;
      var t0 = performance.now();
      try {
        var db = window.db;
        if (!db) { console.error('[ProspectAdmitFix] db 미접근'); return false; }
        var results = await Promise.all([
          db.collection('students').get(),
          db.collection('roomNumbers').get(),
          db.collection('passwords').get()
        ]);
        var stuSnap = results[0], roomSnap = results[1], pwSnap = results[2];
        var _stu = {}, _deptByName = {}, _room = {}, _status = {},
            _expectedDate = {}, _regDate = {}, _age = {}, _pw = {};
        stuSnap.forEach(function (d) {
          if (d.id === '_guest') return;
          var data = d.data() || {};
          var list = (data.students || data.list || []).slice();
          _stu[d.id] = list;
          list.forEach(function (n) { _deptByName[n] = d.id; });
        });
        roomSnap.forEach(function (d) {
          var data = d.data() || {};
          if (data.room != null) _room[d.id] = String(data.room);
          _status[d.id] = data.status || 'active';
          if (data.expectedMoveInDate) _expectedDate[d.id] = data.expectedMoveInDate;
          if (data.registeredDate) _regDate[d.id] = data.registeredDate;
          if (data.age != null) _age[d.id] = data.age;
          if (data.department && !_deptByName[d.id]) _deptByName[d.id] = data.department;
        });
        pwSnap.forEach(function (d) {
          var data = d.data() || {};
          if (data.password != null) _pw[d.id] = data.password;
        });
        window._secureData = {
          getPassword: function (n) { return typeof n === 'string' ? (_pw[n] || null) : null; },
          getRoomNumber: function (n) { return typeof n === 'string' ? (_room[n] || null) : null; },
          getRegisteredDate: function (n) { return typeof n === 'string' ? (_regDate[n] || null) : null; },
          getAge: function (n) { return typeof n === 'string' ? (_age[n] || null) : null; },
          getStatus: function (n) { return typeof n === 'string' ? (_status[n] || 'active') : 'active'; },
          getExpectedDate: function (n) { return typeof n === 'string' ? (_expectedDate[n] || null) : null; },
          getDepartmentByName: function (n) { return typeof n === 'string' ? (_deptByName[n] || null) : null; },
          isPending: function (n) { return typeof n === 'string' && _status[n] === 'pending'; },
          getStudentsByDept: function (d) { return typeof d === 'string' ? (_stu[d] || []).slice() : []; },
          getAllStudents: function () { return Object.assign({}, _stu); },
          getAllRoomEntries: function () {
            var out = {};
            Object.keys(_room).forEach(function (name) {
              out[name] = {
                room: _room[name], age: _age[name] || null, status: _status[name] || 'active',
                registeredDate: _regDate[name] || null,
                expectedMoveInDate: _expectedDate[name] || null,
                department: _deptByName[name] || null
              };
            });
            return out;
          },
          getDepartments: function () { return Object.keys(_stu); }
        };
        try {
          if (window.students && typeof window.students === 'object') {
            Object.keys(window.students).forEach(function (k) { delete window.students[k]; });
            Object.keys(_stu).forEach(function (k) { window.students[k] = _stu[k].slice(); });
          } else { window.students = Object.assign({}, _stu); }
          if (Array.isArray(window.departments)) {
            window.departments.length = 0;
            Object.keys(_stu).forEach(function (k) { window.departments.push(k); });
          } else { window.departments = Object.keys(_stu); }
        } catch (e) { console.warn('[ProspectAdmitFix] 전역 동기화 경고:', e.message); }
        var ms = Math.round(performance.now() - t0);
        console.log('[ProspectAdmitFix v1.3] rebuild 완료 (' + ms + 'ms)');
        window._lastSecureRebuild = { at: new Date().toISOString(), ms: ms };
        return true;
      } catch (e) {
        console.error('[ProspectAdmitFix] rebuild 실패:', e);
        return false;
      } finally { FIX._rebuilding = false; }
    },

    rebuildAndRender: async function () {
      var ok = await FIX.rebuild();
      if (!ok) return false;
      try { if (typeof window.updateStudentsList === 'function') window.updateStudentsList(); } catch (e) {}
      try { if (typeof window._renderPendingResults === 'function') window._renderPendingResults(); } catch (e) {}
      try { if (typeof window.render === 'function') window.render(); } catch (e) {}
      return true;
    },

    _hookOne: function (fnName) {
      if (typeof window[fnName] !== 'function') return false;
      if (FIX._backups[fnName]) return false;
      var orig = window[fnName];
      FIX._backups[fnName] = orig;
      window[fnName] = async function () {
        var result;
        try { result = await orig.apply(this, arguments); }
        catch (e) { console.error('[ProspectAdmitFix] ' + fnName + ' 원본 에러:', e); throw e; }
        try { await FIX.rebuildAndRender();
          console.log('[ProspectAdmitFix] ' + fnName + ' 후 UI 재갱신 완료');
        } catch (e) {}
        return result;
      };
      FIX._hookedTargets.push(fnName);
      return true;
    },

    _hookConfirmModal: function () {
      var fnName = 'openConfirmModal';
      if (typeof window[fnName] !== 'function') return false;
      if (FIX._backups[fnName]) return false;
      var orig = window[fnName];
      FIX._backups[fnName] = orig;
      window[fnName] = function (title, msg, onConfirm, confirmText, cancelText) {
        var wrapped = async function () {
          var result;
          try {
            result = onConfirm.apply(this, arguments);
            if (result && typeof result.then === 'function') result = await result;
          } catch (e) { console.error('[ProspectAdmitFix] confirm 콜백 에러:', e); }
          try { await FIX.rebuildAndRender();
            console.log('[ProspectAdmitFix] openConfirmModal 콜백 후 UI 재갱신 완료');
          } catch (e) {}
          return result;
        };
        return orig.call(this, title, msg, wrapped, confirmText, cancelText);
      };
      FIX._hookedTargets.push(fnName);
      return true;
    },

    install: function () {
      if (FIX._installed) return;
      var hooked = 0;
      FIX.HOOK_TARGETS.forEach(function (fnName) {
        if (fnName === 'openConfirmModal') { if (FIX._hookConfirmModal()) hooked++; }
        else { if (FIX._hookOne(fnName)) hooked++; }
      });
      var missing = FIX.HOOK_TARGETS.filter(function (n) { return !FIX._backups[n]; });
      if (missing.length > 0) {
        setTimeout(function () {
          missing.forEach(function (fnName) {
            if (fnName === 'openConfirmModal') FIX._hookConfirmModal();
            else FIX._hookOne(fnName);
          });
        }, 500);
        setTimeout(function () {
          FIX.HOOK_TARGETS.filter(function (n) { return !FIX._backups[n]; })
            .forEach(function (fnName) {
              if (fnName === 'openConfirmModal') FIX._hookConfirmModal();
              else FIX._hookOne(fnName);
            });
        }, 2000);
      }
      FIX._installed = true;
      console.log('[ProspectAdmitFix v' + FIX.version + '] 설치 완료 — 훅킹 ' + hooked + '/' + FIX.HOOK_TARGETS.length);
    },

    restore: function () {
      Object.keys(FIX._backups).forEach(function (fnName) { window[fnName] = FIX._backups[fnName]; });
      FIX._backups = {}; FIX._hookedTargets = []; FIX._installed = false;
      console.log('[ProspectAdmitFix] 모든 원본 복구 완료');
    }
  };

  window.ProspectAdmitFix = FIX;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { FIX.install(); }, 100);
    });
  } else {
    setTimeout(function () { FIX.install(); }, 100);
  }
})();
