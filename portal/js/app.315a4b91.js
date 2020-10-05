/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		"app": 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/portal/";
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([0,"chunk-vendors"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("cd49");


/***/ }),

/***/ "5c0b":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_8_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_8_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_8_oneOf_1_2_node_modules_sass_loader_dist_cjs_js_ref_8_oneOf_1_3_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_scss___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("9c0c");
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_8_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_8_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_8_oneOf_1_2_node_modules_sass_loader_dist_cjs_js_ref_8_oneOf_1_3_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_scss___WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_mini_css_extract_plugin_dist_loader_js_ref_8_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_8_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_8_oneOf_1_2_node_modules_sass_loader_dist_cjs_js_ref_8_oneOf_1_3_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_scss___WEBPACK_IMPORTED_MODULE_0__);
/* unused harmony reexport * */
 /* unused harmony default export */ var _unused_webpack_default_export = (_node_modules_mini_css_extract_plugin_dist_loader_js_ref_8_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_8_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_8_oneOf_1_2_node_modules_sass_loader_dist_cjs_js_ref_8_oneOf_1_3_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_scss___WEBPACK_IMPORTED_MODULE_0___default.a); 

/***/ }),

/***/ "9c0c":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "cd49":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.iterator.js
var es_array_iterator = __webpack_require__("e260");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.promise.js
var es_promise = __webpack_require__("e6cf");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.object.assign.js
var es_object_assign = __webpack_require__("cca6");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.promise.finally.js
var es_promise_finally = __webpack_require__("a79d");

// EXTERNAL MODULE: ./node_modules/vue/dist/vue.runtime.esm.js
var vue_runtime_esm = __webpack_require__("2b0e");

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js?{"cacheDirectory":"node_modules/.cache/vue-loader","cacheIdentifier":"1d393696-vue-loader-template"}!./node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/App.vue?vue&type=template&id=f64b80f0&
var Appvue_type_template_id_f64b80f0_render = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return (_vm.loggedInStatus.loggedIn)?_c('v-app',[_c('v-app-bar',{attrs:{"color":"white","app":""}},[_c('div',{staticClass:"logo"}),_c('v-spacer'),_vm._v(" "+_vm._s(_vm.userEmail)+" "),(_vm.loggedInStatus.loggedIn)?_c('v-btn',{attrs:{"text":"","color":"#086797"},on:{"click":_vm.signOut}},[_vm._v("Sign out")]):_vm._e()],1),_c('v-container',[_c('v-row',{attrs:{"align":"center"}},[_c('v-col',[(_vm.devices.length > 1)?_c('v-select',{attrs:{"label":"devices","items":_vm.devices,"filled":"","light":""},on:{"change":_vm.selectedDevicesChanged},model:{value:(_vm.selectedDevice),callback:function ($$v) {_vm.selectedDevice=$$v},expression:"selectedDevice"}}):_vm._e()],1),_c('v-col',[_c('v-select',{attrs:{"label":"timespan","items":_vm.timespans,"filled":"","light":""},on:{"change":_vm.selectedTimespanChanged},model:{value:(_vm.selectedTimespan),callback:function ($$v) {_vm.selectedTimespan=$$v},expression:"selectedTimespan"}})],1)],1),(_vm.isCustomTimespan)?_c('v-row',{attrs:{"align":"center"}},[_c('v-dialog',{ref:"dialog",attrs:{"return-value":_vm.timespans[_vm.timespans.length - 1].value,"persistent":"","width":"290px"},on:{"update:returnValue":function($event){return _vm.$set(_vm.timespans[_vm.timespans.length - 1], "value", $event)},"update:return-value":function($event){return _vm.$set(_vm.timespans[_vm.timespans.length - 1], "value", $event)},"input":_vm.selectedTimespanChanged},scopedSlots:_vm._u([{key:"activator",fn:function(ref){
var on = ref.on;
var attrs = ref.attrs;
return [_c('v-text-field',_vm._g(_vm._b({attrs:{"value":_vm.timespans[_vm.timespans.length - 1].value.join(' - '),"label":"Custom date range","prepend-icon":"mdi-calendar","readonly":""}},'v-text-field',attrs,false),on))]}}],null,false,3733156754),model:{value:(_vm.showDateRangePicker),callback:function ($$v) {_vm.showDateRangePicker=$$v},expression:"showDateRangePicker"}},[_c('v-date-picker',{attrs:{"range":""},model:{value:(_vm.timespans[_vm.timespans.length - 1].value),callback:function ($$v) {_vm.$set(_vm.timespans[_vm.timespans.length - 1], "value", $$v)},expression:"timespans[timespans.length - 1].value"}},[_c('v-spacer'),_c('v-btn',{attrs:{"text":"","color":"primary"},on:{"click":function($event){_vm.showDateRangePicker = false}}},[_vm._v(" Cancel ")]),_c('v-btn',{attrs:{"text":"","color":"primary"},on:{"click":function($event){return _vm.$refs.dialog.save(_vm.timespans[_vm.timespans.length - 1].value)}}},[_vm._v(" OK ")])],1)],1)],1):_vm._e(),(_vm.selectedTimespan && _vm.selectedDevice)?_c('v-row',[(_vm.dataIsLoading)?_c('div',{staticClass:"summary-bubbles"},[_vm._v("Loading...")]):(_vm.eventItems.length !== 0)?_c('div',{staticClass:"summary-bubbles"},[_c('h4',[_vm._v(_vm._s(_vm.eventItems.length)+" screenings")]),(_vm.numNormalEvents !== 0)?_c('div',{staticClass:"event-summary normal"},[_c('span',[_vm._v(" "+_vm._s(_vm.numNormalEvents)+" ")]),_c('span',[_vm._v("normal")])]):_vm._e(),(_vm.numFeverEvents !== 0)?_c('div',{staticClass:"event-summary fever"},[_c('span',[_vm._v(_vm._s(_vm.numFeverEvents))]),_c('span',[_vm._v("fever")])]):_vm._e(),(_vm.numErrorEvents !== 0)?_c('div',{staticClass:"event-summary errored"},[_c('span',[_vm._v(" "+_vm._s(_vm.numErrorEvents)+" ")]),_c('span',[_vm._v("errors")])]):_vm._e()]):_vm._e()]):_vm._e(),(_vm.selectedTimespan && _vm.selectedDevice)?_c('v-row',{attrs:{"align":"center"}},[_c('v-col',[_c('apexchart',{attrs:{"height":"100","type":"bar","options":_vm.chartOptions,"series":_vm.temperatures}}),_c('v-data-table',{attrs:{"fixed-header":"","loading":_vm.dataIsLoading,"headers":_vm.headers,"items":_vm.events,"items-per-page":_vm.eventItems.length,"sort-by":"time","sort-desc":"","hide-default-footer":"","no-data-text":'No events found for selected timespan'},scopedSlots:_vm._u([{key:"item.displayedTemperature",fn:function(ref){
var item = ref.item;
return [_c('v-chip',{attrs:{"color":_vm.getColorForItem(item),"dark":""}},[_vm._v(" "+_vm._s(item.displayedTemperature)+" ")])]}}],null,false,528029915)})],1)],1):_vm._e()],1)],1):_vm._e()}
var staticRenderFns = []


// CONCATENATED MODULE: ./src/App.vue?vue&type=template&id=f64b80f0&

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.concat.js
var es_array_concat = __webpack_require__("99af");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.filter.js
var es_array_filter = __webpack_require__("4de4");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.includes.js
var es_array_includes = __webpack_require__("caad");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.last-index-of.js
var es_array_last_index_of = __webpack_require__("baa5");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.map.js
var es_array_map = __webpack_require__("d81d");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.number.constructor.js
var es_number_constructor = __webpack_require__("a9e3");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.number.to-fixed.js
var es_number_to_fixed = __webpack_require__("b680");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.object.freeze.js
var es_object_freeze = __webpack_require__("dca8");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.object.to-string.js
var es_object_to_string = __webpack_require__("d3b7");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.regexp.exec.js
var es_regexp_exec = __webpack_require__("ac1f");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.string.includes.js
var es_string_includes = __webpack_require__("2532");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.string.replace.js
var es_string_replace = __webpack_require__("5319");

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/objectSpread2.js
var objectSpread2 = __webpack_require__("5530");

// EXTERNAL MODULE: ./node_modules/regenerator-runtime/runtime.js
var runtime = __webpack_require__("96cf");

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js
var asyncToGenerator = __webpack_require__("1da1");

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/classCallCheck.js
var classCallCheck = __webpack_require__("d4ec");

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/createClass.js
var createClass = __webpack_require__("bee2");

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/inherits.js + 1 modules
var inherits = __webpack_require__("262e");

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/createSuper.js + 2 modules
var createSuper = __webpack_require__("2caf");

// EXTERNAL MODULE: ./node_modules/tslib/tslib.es6.js
var tslib_es6 = __webpack_require__("9ab4");

// EXTERNAL MODULE: ./node_modules/vue-property-decorator/lib/vue-property-decorator.js + 1 modules
var vue_property_decorator = __webpack_require__("60a3");

// EXTERNAL MODULE: ./node_modules/vue-apexcharts/dist/vue-apexcharts.js
var vue_apexcharts = __webpack_require__("1321");
var vue_apexcharts_default = /*#__PURE__*/__webpack_require__.n(vue_apexcharts);

// EXTERNAL MODULE: ./node_modules/amazon-cognito-auth-js/es/index.js + 10 modules
var es = __webpack_require__("0a89");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.regexp.to-string.js
var es_regexp_to_string = __webpack_require__("25f0");

// CONCATENATED MODULE: ./src/time-ago.ts



var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getFormattedDate(date) {
  var preformattedDate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var hideYear = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var day = date.getDate();
  var month = MONTH_NAMES[date.getMonth()];
  var year = date.getFullYear();
  var hours = date.getHours();
  var minutes = date.getMinutes().toString();

  if (date.getMinutes() < 10) {
    // Adding leading zero to minutes
    minutes = "0".concat(minutes);
  }

  if (preformattedDate !== "") {
    // Today at 10:20
    // Yesterday at 10:20
    return "".concat(preformattedDate, " at ").concat(hours, ":").concat(minutes);
  }

  if (hideYear) {
    // 10. January at 10:20
    return "".concat(day, ". ").concat(month, " at ").concat(hours, ":").concat(minutes);
  } // 10. January 2017. at 10:20


  return "".concat(day, ". ").concat(month, " ").concat(year, ". at ").concat(hours, ":").concat(minutes);
} // --- Main function


var time_ago_timeAgo = function timeAgo(date) {
  var DAY_IN_MS = 86400000; // 24 * 60 * 60 * 1000

  var today = new Date();
  var yesterday = new Date(today.getTime() - DAY_IN_MS);
  var seconds = Math.round((today.getTime() - date.getTime()) / 1000);
  var minutes = Math.round(seconds / 60);
  var isToday = today.toDateString() === date.toDateString();
  var isYesterday = yesterday.toDateString() === date.toDateString();
  var isThisYear = today.getFullYear() === date.getFullYear();

  if (seconds < 5) {
    return 'now';
  } else if (seconds < 60) {
    return "".concat(seconds, " seconds ago");
  } else if (seconds < 90) {
    return 'about a minute ago';
  } else if (minutes < 60) {
    return "".concat(minutes, " minutes ago");
  } else if (isToday) {
    return getFormattedDate(date, "Today"); // Today at 10:20
  } else if (isYesterday) {
    return getFormattedDate(date, "Yesterday"); // Yesterday at 10:20
  } else if (isThisYear) {
    return getFormattedDate(date, "", true); // 10. January at 10:20
  }

  return getFormattedDate(date); // 10. January 2017. at 10:20
};
// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js??ref--13-0!./node_modules/thread-loader/dist/cjs.js!./node_modules/babel-loader/lib!./node_modules/ts-loader??ref--13-3!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/App.vue?vue&type=script&lang=ts&
























vue_property_decorator["b" /* Vue */].use(vue_apexcharts_default.a);
var hostName = "".concat(window.location.protocol, "//").concat(window.location.host, "/portal");
var auth = new es["a" /* CognitoAuth */]({
  ClientId: "7ijdj7d02sn1jmta9blul42373",
  AppWebDomain: "tekahuora.auth.ap-southeast-2.amazoncognito.com",
  TokenScopesArray: ["email", "openid", "aws.cognito.signin.user.admin"],
  RedirectUriSignIn: hostName,
  RedirectUriSignOut: hostName
});
var MIN_ERROR_THRESHOLD = 42.5;
var API_BASE = "https://3pu8ojk2ej.execute-api.ap-southeast-2.amazonaws.com/default"; // Add out API base url to all our Axios requests (this assumes that all axios requests are API calls, which may
// not always be true)
// If the API response returns 401, logout so that they'll be redirected to the cognito sign-in page.
// Set the auth token for axios to use when the component is created.

var currentToken = "";

var makeGetRequest = function makeGetRequest(url) {
  return fetch("".concat(API_BASE).concat(url), {
    method: "GET",
    headers: {
      Authorization: currentToken
    }
  }); // TODO(jon): If we get a 401 response, log the user out.
};

var formatDate = function formatDate(date) {
  return date.toISOString().replace(/:/g, "_").replace(/\./g, "_");
};

var Appvue_type_script_lang_ts_App = /*#__PURE__*/function (_Vue) {
  Object(inherits["a" /* default */])(App, _Vue);

  var _super = Object(createSuper["a" /* default */])(App);

  function App() {
    var _this;

    Object(classCallCheck["a" /* default */])(this, App);

    _this = _super.apply(this, arguments);
    _this.loggedInStatus = {
      loggedIn: false,
      currentUser: null
    };
    _this.devices = [];
    _this.selectedDevice = "";
    _this.eventItems = [];
    _this.dataIsLoading = false;
    _this.showDateRangePicker = false;
    _this.timespans = [{
      text: "Last hour",
      value: {
        start: -1
      } // Relative hours to now.

    }, {
      text: "Last 24 hours",
      value: {
        start: -24
      }
    }, {
      text: "Last week",
      value: {
        start: -(24 * 7)
      }
    }, {
      text: "Custom",
      value: ["2020-10-01", "2020-10-04"] // Concrete date ranges

    }];
    _this.selectedTimespan = _this.timespans[0].value; // noinspection JSMismatchedCollectionQueryUpdate

    _this.headers = [{
      text: "Screened Temp C",
      value: "displayedTemperature"
    }, {
      text: "Fever Threshold C",
      value: "threshold"
    }, {
      text: "Time",
      value: "timeAgo"
    }];
    return _this;
  }

  Object(createClass["a" /* default */])(App, [{
    key: "getColorForItem",
    value: function getColorForItem(item) {
      if (item.displayedTemperature > MIN_ERROR_THRESHOLD) {
        return "#B8860B";
      }

      if (item.displayedTemperature > item.threshold) {
        return "#a81c11";
      }

      return "#11a84c";
    }
  }, {
    key: "created",
    value: function created() {
      var _this2 = this;

      auth.userhandler = {
        onSuccess: function onSuccess(session) {
          currentToken = session.getIdToken().getJwtToken();
          _this2.loggedInStatus.currentUser = auth.getCurrentUser();
          _this2.loggedInStatus.loggedIn = true;

          if (window.location.href.includes("?code=")) {
            window.location.href = hostName;
          } else {
            _this2.init();
          }
        },
        onFailure: function onFailure() {
          auth.signOut();
        }
      };
      auth.useCodeGrantFlow(); // Or try and find an auth token in localStorage?

      if (window.location.href.includes("?code=")) {
        auth.parseCognitoWebResponse(window.location.href);
      } else if (!auth.isUserSignedIn()) {
        setTimeout(function () {
          if (!auth.isUserSignedIn()) {
            // This triggers a redirect to the login page.
            auth.getSession();
          }
        }, 1000);
      } else {
        auth.getSession();
      }
    }
  }, {
    key: "init",
    value: function () {
      var _init = Object(asyncToGenerator["a" /* default */])( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                // Should be signed in already:
                this.loggedInStatus.currentUser = auth.getCurrentUser();
                this.loggedInStatus.loggedIn = true;
                _context.next = 4;
                return this.fetchDevicesForUser();

              case 4:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function init() {
        return _init.apply(this, arguments);
      }

      return init;
    }()
  }, {
    key: "fetchEventsForDevice",
    value: function () {
      var _fetchEventsForDevice = Object(asyncToGenerator["a" /* default */])( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(device, range) {
        var url, response, events;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                this.dataIsLoading = true;
                url = "/events?deviceId=".concat(device, "&type=Screen");

                if (range.startDate) {
                  url += "&startDate=".concat(range.startDate);
                }

                if (range.endDate) {
                  url += "&endDate=".concat(range.endDate);
                }

                _context2.next = 6;
                return makeGetRequest(url);

              case 6:
                response = _context2.sent;
                _context2.next = 9;
                return response.json();

              case 9:
                events = _context2.sent;
                this.eventItems = Object.freeze(events.Items.map(function (item) {
                  var displayedTemp = Number(item.disp.N);
                  var threshold = Number(item.fth.N);
                  var date = item.tsc.S.replace(/_/g, ":");
                  var lastHyphen = date.lastIndexOf(":");
                  var d = new Date(Date.parse("".concat(date.substr(0, lastHyphen), ".").concat(date.substr(lastHyphen + 1))));
                  return {
                    //sampleRaw: Number(item.scrr.N),
                    //meta: JSON.parse(item.meta.S),
                    //softwareVersion: item.ver.S,
                    //thermalRefRaw: Number(item.refr.N),
                    timestamp: d,
                    displayedTemperature: Number(displayedTemp.toFixed(2)),
                    threshold: threshold,
                    result: displayedTemp > MIN_ERROR_THRESHOLD ? "Error" : displayedTemp > threshold ? "Fever" : "Normal",
                    timeAgo: function timeAgo() {
                      return time_ago_timeAgo(d);
                    }
                  };
                }).filter(function (item) {
                  return item.displayedTemperature > 0;
                }).sort(function (a, b) {
                  return a.timestamp < b.timestamp;
                }));
                this.dataIsLoading = false;

              case 12:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function fetchEventsForDevice(_x, _x2) {
        return _fetchEventsForDevice.apply(this, arguments);
      }

      return fetchEventsForDevice;
    }()
  }, {
    key: "fetchDevicesForUser",
    value: function () {
      var _fetchDevicesForUser = Object(asyncToGenerator["a" /* default */])( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
        var devices;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return makeGetRequest("/devices");

              case 2:
                devices = _context3.sent;
                _context3.next = 5;
                return devices.json();

              case 5:
                this.devices = _context3.sent;

                if (!(this.devices.length === 1)) {
                  _context3.next = 10;
                  break;
                }

                this.selectedDevice = this.devices[0];
                _context3.next = 10;
                return this.fetchEventsForDevice(this.selectedDevice, this.dateRangeForSelectedTimespan);

              case 10:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function fetchDevicesForUser() {
        return _fetchDevicesForUser.apply(this, arguments);
      }

      return fetchDevicesForUser;
    }()
  }, {
    key: "selectedDevicesChanged",
    value: function selectedDevicesChanged(deviceId) {
      this.fetchEventsForDevice(deviceId, this.dateRangeForSelectedTimespan);
    }
  }, {
    key: "selectedTimespanChanged",
    value: function selectedTimespanChanged(timespan) {
      if (Array.isArray(timespan) && !this.showDateRangePicker) {
        this.showDateRangePicker = true;
      } else if (this.selectedDevice) {
        // Fetch events again with new timespan
        this.fetchEventsForDevice(this.selectedDevice, this.dateRangeForSelectedTimespan);
      }
    }
  }, {
    key: "signOut",
    value: function signOut() {
      auth.signOut();
    }
  }, {
    key: "dateRangeForSelectedTimespan",
    get: function get() {
      var startDate = null;
      var endDate = null;

      if (!Array.isArray(this.selectedTimespan) && this.selectedTimespan.start) {
        var range = this.selectedTimespan; // we have a relative range.

        startDate = formatDate(new Date(new Date().getTime() + 1000 * 60 * 60 * range.start));
      } else if (Array.isArray(this.selectedTimespan)) {
        var customRange = this.timespans[this.timespans.length - 1].value;
        startDate = customRange[0];
        endDate = customRange[1];

        if (endDate < startDate) {
          // Make sure end is always greater or equal than start.
          var temp = startDate;
          startDate = endDate;
          endDate = temp;
        } // Add timezone offsets for NZ


        var offset = new Date().getTimezoneOffset() * 60 * 1000;
        startDate = formatDate(new Date(Date.parse(startDate) + offset));
        endDate = formatDate(new Date(Date.parse(endDate) + 1000 * 60 * 60 * 24 + offset));
      }

      return {
        startDate: startDate,
        endDate: endDate
      };
    }
  }, {
    key: "events",
    get: function get() {
      return this.eventItems.map(function (item) {
        return Object(objectSpread2["a" /* default */])(Object(objectSpread2["a" /* default */])({}, item), {}, {
          timeAgo: item.timeAgo(),
          time: item.timestamp.getTime()
        });
      });
    }
  }, {
    key: "isCustomTimespan",
    get: function get() {
      return Array.isArray(this.selectedTimespan);
    }
  }, {
    key: "resultsSummaryText",
    get: function get() {
      return "".concat(this.eventItems.length, " total screenings, ").concat(this.eventItems.filter(function (item) {
        return item.result === "Fever";
      }).length, " screened as Fever");
    }
  }, {
    key: "numNormalEvents",
    get: function get() {
      return this.eventItems.filter(function (item) {
        return item.result === "Normal";
      }).length;
    }
  }, {
    key: "numErrorEvents",
    get: function get() {
      return this.eventItems.filter(function (item) {
        return item.result === "Error";
      }).length;
    }
  }, {
    key: "numFeverEvents",
    get: function get() {
      return this.eventItems.filter(function (item) {
        return item.result === "Fever";
      }).length;
    }
  }, {
    key: "chartOptions",
    get: function get() {
      var _this3 = this;

      return {
        chart: {
          offsetX: 0,
          offsetY: 0,
          id: "timeseries",
          toolbar: {
            show: false
          },
          animations: {
            enabled: true,
            speed: 400,
            animateGradually: {
              enabled: true,
              delay: 16
            }
          }
        },
        fill: {
          colors: [function (_ref) {
            var dataPointIndex = _ref.dataPointIndex;
            return _this3.getColorForItem(_this3.eventItems[dataPointIndex]);
          }]
        },
        grid: {
          show: false
        },
        dataLabels: {
          enabled: false
        },
        tooltip: {
          enabled: false
        },
        xaxis: {
          type: "numeric",
          labels: {
            show: false
          },
          axisTicks: {
            show: false
          }
        },
        yaxis: {
          labels: {
            show: false
          },
          tickAmount: 10,
          min: 30,
          max: 50,
          axisTicks: {
            show: false
          }
        }
      };
    }
  }, {
    key: "temperatures",
    get: function get() {
      return [{
        name: "temperatures",
        // data: this.eventItems.map(({ displayedTemperature, timestamp }) => [
        //   timestamp.getTime(),
        //   displayedTemperature
        // ])
        data: this.eventItems.map(function (_ref2) {
          var displayedTemperature = _ref2.displayedTemperature;
          return displayedTemperature;
        })
      }];
    }
  }, {
    key: "userEmail",
    get: function get() {
      return auth.getCachedSession().getIdToken().decodePayload().email;
    }
  }]);

  return App;
}(vue_property_decorator["b" /* Vue */]);

Appvue_type_script_lang_ts_App = Object(tslib_es6["a" /* __decorate */])([Object(vue_property_decorator["a" /* Component */])({
  components: {
    apexchart: vue_apexcharts_default.a
  }
})], Appvue_type_script_lang_ts_App);
/* harmony default export */ var Appvue_type_script_lang_ts_ = (Appvue_type_script_lang_ts_App);
// CONCATENATED MODULE: ./src/App.vue?vue&type=script&lang=ts&
 /* harmony default export */ var src_Appvue_type_script_lang_ts_ = (Appvue_type_script_lang_ts_); 
// EXTERNAL MODULE: ./src/App.vue?vue&type=style&index=0&lang=scss&
var Appvue_type_style_index_0_lang_scss_ = __webpack_require__("5c0b");

// EXTERNAL MODULE: ./node_modules/vue-loader/lib/runtime/componentNormalizer.js
var componentNormalizer = __webpack_require__("2877");

// EXTERNAL MODULE: ./node_modules/vuetify-loader/lib/runtime/installComponents.js
var installComponents = __webpack_require__("6544");
var installComponents_default = /*#__PURE__*/__webpack_require__.n(installComponents);

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VApp/VApp.js
var VApp = __webpack_require__("7496");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VAppBar/VAppBar.js + 8 modules
var VAppBar = __webpack_require__("40dc");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VBtn/VBtn.js + 3 modules
var VBtn = __webpack_require__("8336");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VChip/VChip.js
var VChip = __webpack_require__("cc20");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VGrid/VCol.js
var VCol = __webpack_require__("62ad");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VGrid/VContainer.js + 1 modules
var VContainer = __webpack_require__("a523");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VDataTable/VDataTable.js + 14 modules
var VDataTable = __webpack_require__("8fea");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VDatePicker/VDatePicker.js + 19 modules
var VDatePicker = __webpack_require__("2e4b");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VDialog/VDialog.js + 3 modules
var VDialog = __webpack_require__("169a");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VGrid/VRow.js
var VRow = __webpack_require__("0fd9");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VSelect/VSelect.js + 21 modules
var VSelect = __webpack_require__("b974");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VGrid/VSpacer.js
var VSpacer = __webpack_require__("2fa4");

// EXTERNAL MODULE: ./node_modules/vuetify/lib/components/VTextField/VTextField.js + 3 modules
var VTextField = __webpack_require__("8654");

// CONCATENATED MODULE: ./src/App.vue






/* normalize component */

var component = Object(componentNormalizer["a" /* default */])(
  src_Appvue_type_script_lang_ts_,
  Appvue_type_template_id_f64b80f0_render,
  staticRenderFns,
  false,
  null,
  null,
  null
  
)

/* harmony default export */ var src_App = (component.exports);

/* vuetify-loader */














installComponents_default()(component, {VApp: VApp["a" /* default */],VAppBar: VAppBar["a" /* default */],VBtn: VBtn["a" /* default */],VChip: VChip["a" /* default */],VCol: VCol["a" /* default */],VContainer: VContainer["a" /* default */],VDataTable: VDataTable["a" /* default */],VDatePicker: VDatePicker["a" /* default */],VDialog: VDialog["a" /* default */],VRow: VRow["a" /* default */],VSelect: VSelect["a" /* default */],VSpacer: VSpacer["a" /* default */],VTextField: VTextField["a" /* default */]})

// EXTERNAL MODULE: ./node_modules/vuetify/lib/framework.js + 24 modules
var framework = __webpack_require__("f309");

// CONCATENATED MODULE: ./src/plugins/vuetify.ts


vue_runtime_esm["a" /* default */].use(framework["a" /* default */]);
/* harmony default export */ var vuetify = (new framework["a" /* default */]({}));
// CONCATENATED MODULE: ./src/main.ts







vue_runtime_esm["a" /* default */].config.productionTip = false;
new vue_runtime_esm["a" /* default */]({
  vuetify: vuetify,
  render: function render(h) {
    return h(src_App);
  }
}).$mount("#app");

/***/ })

/******/ });
//# sourceMappingURL=app.315a4b91.js.map