var SvelteFa = (function (exports) {
  'use strict';

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;

    _setPrototypeOf(subClass, superClass);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function noop() {}

  function assign(tar, src) {
    // @ts-ignore
    for (var k in src) {
      tar[k] = src[k];
    }

    return tar;
  }

  function run(fn) {
    return fn();
  }

  function blank_object() {
    return Object.create(null);
  }

  function run_all(fns) {
    fns.forEach(run);
  }

  function is_function(thing) {
    return typeof thing === 'function';
  }

  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
  }

  function is_empty(obj) {
    return Object.keys(obj).length === 0;
  }

  function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
      var slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
      return definition[0](slot_ctx);
    }
  }

  function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
  }

  function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
      var lets = definition[2](fn(dirty));

      if ($$scope.dirty === undefined) {
        return lets;
      }

      if (typeof lets === 'object') {
        var merged = [];
        var len = Math.max($$scope.dirty.length, lets.length);

        for (var i = 0; i < len; i += 1) {
          merged[i] = $$scope.dirty[i] | lets[i];
        }

        return merged;
      }

      return $$scope.dirty | lets;
    }

    return $$scope.dirty;
  }

  function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
      var slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
      slot.p(slot_context, slot_changes);
    }
  }

  function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
      var dirty = [];
      var length = $$scope.ctx.length / 32;

      for (var i = 0; i < length; i++) {
        dirty[i] = -1;
      }

      return dirty;
    }

    return -1;
  }

  function null_to_empty(value) {
    return value == null ? '' : value;
  }

  function append(target, node) {
    target.appendChild(node);
  }

  function append_styles(target, style_sheet_id, styles) {
    var append_styles_to = get_root_for_style(target);

    if (!append_styles_to.getElementById(style_sheet_id)) {
      var style = element('style');
      style.id = style_sheet_id;
      style.textContent = styles;
      append_stylesheet(append_styles_to, style);
    }
  }

  function get_root_for_style(node) {
    if (!node) return document;
    var root = node.getRootNode ? node.getRootNode() : node.ownerDocument;

    if (root && root.host) {
      return root;
    }

    return node.ownerDocument;
  }

  function append_stylesheet(node, style) {
    append(node.head || node, style);
  }

  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }

  function detach(node) {
    node.parentNode.removeChild(node);
  }

  function element(name) {
    return document.createElement(name);
  }

  function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  function text(data) {
    return document.createTextNode(data);
  }

  function empty() {
    return text('');
  }

  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  }

  function children(element) {
    return Array.from(element.childNodes);
  }

  var current_component;

  function set_current_component(component) {
    current_component = component;
  }

  var dirty_components = [];
  var binding_callbacks = [];
  var render_callbacks = [];
  var flush_callbacks = [];
  var resolved_promise = Promise.resolve();
  var update_scheduled = false;

  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }

  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }

  var flushing = false;
  var seen_callbacks = new Set();

  function flush() {
    if (flushing) return;
    flushing = true;

    do {
      // first, call beforeUpdate functions
      // and update components
      for (var i = 0; i < dirty_components.length; i += 1) {
        var component = dirty_components[i];
        set_current_component(component);
        update(component.$$);
      }

      set_current_component(null);
      dirty_components.length = 0;

      while (binding_callbacks.length) {
        binding_callbacks.pop()();
      } // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...


      for (var _i4 = 0; _i4 < render_callbacks.length; _i4 += 1) {
        var callback = render_callbacks[_i4];

        if (!seen_callbacks.has(callback)) {
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
          callback();
        }
      }

      render_callbacks.length = 0;
    } while (dirty_components.length);

    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }

    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
  }

  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      var dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }

  var outroing = new Set();
  var outros;

  function transition_in(block, local) {
    if (block && block.i) {
      outroing["delete"](block);
      block.i(local);
    }
  }

  function transition_out(block, local, detach, callback) {
    if (block && block.o) {
      if (outroing.has(block)) return;
      outroing.add(block);
      outros.c.push(function () {
        outroing["delete"](block);

        if (callback) {
          if (detach) block.d(1);
          callback();
        }
      });
      block.o(local);
    }
  }

  function mount_component(component, target, anchor, customElement) {
    var _component$$$ = component.$$,
        fragment = _component$$$.fragment,
        on_mount = _component$$$.on_mount,
        on_destroy = _component$$$.on_destroy,
        after_update = _component$$$.after_update;
    fragment && fragment.m(target, anchor);

    if (!customElement) {
      // onMount happens before the initial afterUpdate
      add_render_callback(function () {
        var new_on_destroy = on_mount.map(run).filter(is_function);

        if (on_destroy) {
          on_destroy.push.apply(on_destroy, new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
    }

    after_update.forEach(add_render_callback);
  }

  function destroy_component(component, detaching) {
    var $$ = component.$$;

    if ($$.fragment !== null) {
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)

      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }

  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }

    component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
  }

  function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty) {
    if (dirty === void 0) {
      dirty = [-1];
    }

    var parent_component = current_component;
    set_current_component(component);
    var $$ = component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props: props,
      update: noop,
      not_equal: not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
      // everything else
      callbacks: blank_object(),
      dirty: dirty,
      skip_bound: false,
      root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    var ready = false;
    $$.ctx = instance ? instance(component, options.props || {}, function (i, ret) {
      var value = (arguments.length <= 2 ? 0 : arguments.length - 2) ? arguments.length <= 2 ? undefined : arguments[2] : ret;

      if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
        if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
        if (ready) make_dirty(component, i);
      }

      return ret;
    }) : [];
    $$.update();
    ready = true;
    run_all($$.before_update); // `false` as a special case of no DOM component

    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;

    if (options.target) {
      if (options.hydrate) {
        var nodes = children(options.target); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }

      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor, options.customElement);
      flush();
    }

    set_current_component(parent_component);
  }
  /**
   * Base class for Svelte components. Used when dev=false.
   */


  var SvelteComponent = /*#__PURE__*/function () {
    function SvelteComponent() {}

    var _proto4 = SvelteComponent.prototype;

    _proto4.$destroy = function $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    };

    _proto4.$on = function $on(type, callback) {
      var callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return function () {
        var index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    };

    _proto4.$set = function $set($$props) {
      if (this.$$set && !is_empty($$props)) {
        this.$$.skip_bound = true;
        this.$$set($$props);
        this.$$.skip_bound = false;
      }
    };

    return SvelteComponent;
  }();

  var parseNumber = parseFloat;
  function joinCss(obj, separator) {
    if (separator === void 0) {
      separator = ';';
    }

    var texts;

    if (Array.isArray(obj)) {
      texts = obj.filter(function (text) {
        return text;
      });
    } else {
      texts = [];

      for (var prop in obj) {
        if (obj[prop]) {
          texts.push(prop + ":" + obj[prop]);
        }
      }
    }

    return texts.join(separator);
  }
  function getStyles(style, size, pull, fw) {
    var _float;

    var width;
    var height = '1em';
    var lineHeight;
    var fontSize;
    var textAlign;
    var verticalAlign = '-.125em';
    var overflow = 'visible';

    if (fw) {
      textAlign = 'center';
      width = '1.25em';
    }

    if (pull) {
      _float = pull;
    }

    if (size) {
      if (size == 'lg') {
        fontSize = '1.33333em';
        lineHeight = '.75em';
        verticalAlign = '-.225em';
      } else if (size == 'xs') {
        fontSize = '.75em';
      } else if (size == 'sm') {
        fontSize = '.875em';
      } else {
        fontSize = size.replace('x', 'em');
      }
    }

    return joinCss([joinCss({
      "float": _float,
      width: width,
      height: height,
      'line-height': lineHeight,
      'font-size': fontSize,
      'text-align': textAlign,
      'vertical-align': verticalAlign,
      'transform-origin': 'center',
      overflow: overflow
    }), style]);
  }
  function getTransform(scale, translateX, translateY, rotate, flip, translateTimes, translateUnit, rotateUnit) {
    if (translateTimes === void 0) {
      translateTimes = 1;
    }

    if (translateUnit === void 0) {
      translateUnit = '';
    }

    if (rotateUnit === void 0) {
      rotateUnit = '';
    }

    var flipX = 1;
    var flipY = 1;

    if (flip) {
      if (flip == 'horizontal') {
        flipX = -1;
      } else if (flip == 'vertical') {
        flipY = -1;
      } else {
        flipX = flipY = -1;
      }
    }

    return joinCss(["translate(" + parseNumber(translateX) * translateTimes + translateUnit + "," + parseNumber(translateY) * translateTimes + translateUnit + ")", "scale(" + flipX * parseNumber(scale) + "," + flipY * parseNumber(scale) + ")", rotate && "rotate(" + rotate + rotateUnit + ")"], ' ');
  }

  function add_css$1(target) {
    append_styles(target, "svelte-1cj2gr0", ".spin.svelte-1cj2gr0{animation:svelte-1cj2gr0-spin 2s 0s infinite linear}.pulse.svelte-1cj2gr0{animation:svelte-1cj2gr0-spin 1s infinite steps(8)}@keyframes svelte-1cj2gr0-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}");
  } // (77:0) {#if i[4]}


  function create_if_block(ctx) {
    var svg;
    var g1;
    var g0;
    var g1_transform_value;
    var g1_transform_origin_value;
    var svg_class_value;
    var svg_viewBox_value;

    function select_block_type(ctx, dirty) {
      if (typeof
      /*i*/
      ctx[7][4] == 'string') return create_if_block_1;
      return create_else_block;
    }

    var current_block_type = select_block_type(ctx);
    var if_block = current_block_type(ctx);
    return {
      c: function c() {
        svg = svg_element("svg");
        g1 = svg_element("g");
        g0 = svg_element("g");
        if_block.c();
        attr(g0, "transform",
        /*transform*/
        ctx[10]);
        attr(g1, "transform", g1_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / 2 + " " +
        /*i*/
        ctx[7][1] / 2 + ")");
        attr(g1, "transform-origin", g1_transform_origin_value =
        /*i*/
        ctx[7][0] / 4 + " 0");
        attr(svg, "id",
        /*id*/
        ctx[0]);
        attr(svg, "class", svg_class_value = "" + (null_to_empty(
        /*c*/
        ctx[8]) + " svelte-1cj2gr0"));
        attr(svg, "style",
        /*s*/
        ctx[9]);
        attr(svg, "viewBox", svg_viewBox_value = "0 0 " +
        /*i*/
        ctx[7][0] + " " +
        /*i*/
        ctx[7][1]);
        attr(svg, "aria-hidden", "true");
        attr(svg, "role", "img");
        attr(svg, "xmlns", "http://www.w3.org/2000/svg");
      },
      m: function m(target, anchor) {
        insert(target, svg, anchor);
        append(svg, g1);
        append(g1, g0);
        if_block.m(g0, null);
      },
      p: function p(ctx, dirty) {
        if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
          if_block.p(ctx, dirty);
        } else {
          if_block.d(1);
          if_block = current_block_type(ctx);

          if (if_block) {
            if_block.c();
            if_block.m(g0, null);
          }
        }

        if (dirty &
        /*transform*/
        1024) {
          attr(g0, "transform",
          /*transform*/
          ctx[10]);
        }

        if (dirty &
        /*i*/
        128 && g1_transform_value !== (g1_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / 2 + " " +
        /*i*/
        ctx[7][1] / 2 + ")")) {
          attr(g1, "transform", g1_transform_value);
        }

        if (dirty &
        /*i*/
        128 && g1_transform_origin_value !== (g1_transform_origin_value =
        /*i*/
        ctx[7][0] / 4 + " 0")) {
          attr(g1, "transform-origin", g1_transform_origin_value);
        }

        if (dirty &
        /*id*/
        1) {
          attr(svg, "id",
          /*id*/
          ctx[0]);
        }

        if (dirty &
        /*c*/
        256 && svg_class_value !== (svg_class_value = "" + (null_to_empty(
        /*c*/
        ctx[8]) + " svelte-1cj2gr0"))) {
          attr(svg, "class", svg_class_value);
        }

        if (dirty &
        /*s*/
        512) {
          attr(svg, "style",
          /*s*/
          ctx[9]);
        }

        if (dirty &
        /*i*/
        128 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " +
        /*i*/
        ctx[7][0] + " " +
        /*i*/
        ctx[7][1])) {
          attr(svg, "viewBox", svg_viewBox_value);
        }
      },
      d: function d(detaching) {
        if (detaching) detach(svg);
        if_block.d();
      }
    };
  } // (98:8) {:else}


  function create_else_block(ctx) {
    var path0;
    var path0_d_value;
    var path0_fill_value;
    var path0_fill_opacity_value;
    var path0_transform_value;
    var path1;
    var path1_d_value;
    var path1_fill_value;
    var path1_fill_opacity_value;
    var path1_transform_value;
    return {
      c: function c() {
        path0 = svg_element("path");
        path1 = svg_element("path");
        attr(path0, "d", path0_d_value =
        /*i*/
        ctx[7][4][0]);
        attr(path0, "fill", path0_fill_value =
        /*secondaryColor*/
        ctx[3] ||
        /*color*/
        ctx[1] || 'currentColor');
        attr(path0, "fill-opacity", path0_fill_opacity_value =
        /*swapOpacity*/
        ctx[6] != false ?
        /*primaryOpacity*/
        ctx[4] :
        /*secondaryOpacity*/
        ctx[5]);
        attr(path0, "transform", path0_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / -2 + " " +
        /*i*/
        ctx[7][1] / -2 + ")");
        attr(path1, "d", path1_d_value =
        /*i*/
        ctx[7][4][1]);
        attr(path1, "fill", path1_fill_value =
        /*primaryColor*/
        ctx[2] ||
        /*color*/
        ctx[1] || 'currentColor');
        attr(path1, "fill-opacity", path1_fill_opacity_value =
        /*swapOpacity*/
        ctx[6] != false ?
        /*secondaryOpacity*/
        ctx[5] :
        /*primaryOpacity*/
        ctx[4]);
        attr(path1, "transform", path1_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / -2 + " " +
        /*i*/
        ctx[7][1] / -2 + ")");
      },
      m: function m(target, anchor) {
        insert(target, path0, anchor);
        insert(target, path1, anchor);
      },
      p: function p(ctx, dirty) {
        if (dirty &
        /*i*/
        128 && path0_d_value !== (path0_d_value =
        /*i*/
        ctx[7][4][0])) {
          attr(path0, "d", path0_d_value);
        }

        if (dirty &
        /*secondaryColor, color*/
        10 && path0_fill_value !== (path0_fill_value =
        /*secondaryColor*/
        ctx[3] ||
        /*color*/
        ctx[1] || 'currentColor')) {
          attr(path0, "fill", path0_fill_value);
        }

        if (dirty &
        /*swapOpacity, primaryOpacity, secondaryOpacity*/
        112 && path0_fill_opacity_value !== (path0_fill_opacity_value =
        /*swapOpacity*/
        ctx[6] != false ?
        /*primaryOpacity*/
        ctx[4] :
        /*secondaryOpacity*/
        ctx[5])) {
          attr(path0, "fill-opacity", path0_fill_opacity_value);
        }

        if (dirty &
        /*i*/
        128 && path0_transform_value !== (path0_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / -2 + " " +
        /*i*/
        ctx[7][1] / -2 + ")")) {
          attr(path0, "transform", path0_transform_value);
        }

        if (dirty &
        /*i*/
        128 && path1_d_value !== (path1_d_value =
        /*i*/
        ctx[7][4][1])) {
          attr(path1, "d", path1_d_value);
        }

        if (dirty &
        /*primaryColor, color*/
        6 && path1_fill_value !== (path1_fill_value =
        /*primaryColor*/
        ctx[2] ||
        /*color*/
        ctx[1] || 'currentColor')) {
          attr(path1, "fill", path1_fill_value);
        }

        if (dirty &
        /*swapOpacity, secondaryOpacity, primaryOpacity*/
        112 && path1_fill_opacity_value !== (path1_fill_opacity_value =
        /*swapOpacity*/
        ctx[6] != false ?
        /*secondaryOpacity*/
        ctx[5] :
        /*primaryOpacity*/
        ctx[4])) {
          attr(path1, "fill-opacity", path1_fill_opacity_value);
        }

        if (dirty &
        /*i*/
        128 && path1_transform_value !== (path1_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / -2 + " " +
        /*i*/
        ctx[7][1] / -2 + ")")) {
          attr(path1, "transform", path1_transform_value);
        }
      },
      d: function d(detaching) {
        if (detaching) detach(path0);
        if (detaching) detach(path1);
      }
    };
  } // (92:8) {#if typeof i[4] == 'string'}


  function create_if_block_1(ctx) {
    var path;
    var path_d_value;
    var path_fill_value;
    var path_transform_value;
    return {
      c: function c() {
        path = svg_element("path");
        attr(path, "d", path_d_value =
        /*i*/
        ctx[7][4]);
        attr(path, "fill", path_fill_value =
        /*color*/
        ctx[1] ||
        /*primaryColor*/
        ctx[2] || 'currentColor');
        attr(path, "transform", path_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / -2 + " " +
        /*i*/
        ctx[7][1] / -2 + ")");
      },
      m: function m(target, anchor) {
        insert(target, path, anchor);
      },
      p: function p(ctx, dirty) {
        if (dirty &
        /*i*/
        128 && path_d_value !== (path_d_value =
        /*i*/
        ctx[7][4])) {
          attr(path, "d", path_d_value);
        }

        if (dirty &
        /*color, primaryColor*/
        6 && path_fill_value !== (path_fill_value =
        /*color*/
        ctx[1] ||
        /*primaryColor*/
        ctx[2] || 'currentColor')) {
          attr(path, "fill", path_fill_value);
        }

        if (dirty &
        /*i*/
        128 && path_transform_value !== (path_transform_value = "translate(" +
        /*i*/
        ctx[7][0] / -2 + " " +
        /*i*/
        ctx[7][1] / -2 + ")")) {
          attr(path, "transform", path_transform_value);
        }
      },
      d: function d(detaching) {
        if (detaching) detach(path);
      }
    };
  }

  function create_fragment$2(ctx) {
    var if_block_anchor;
    var if_block =
    /*i*/
    ctx[7][4] && create_if_block(ctx);
    return {
      c: function c() {
        if (if_block) if_block.c();
        if_block_anchor = empty();
      },
      m: function m(target, anchor) {
        if (if_block) if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
      },
      p: function p(ctx, _ref) {
        var dirty = _ref[0];

        if (
        /*i*/
        ctx[7][4]) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block(ctx);
            if_block.c();
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }
      },
      i: noop,
      o: noop,
      d: function d(detaching) {
        if (if_block) if_block.d(detaching);
        if (detaching) detach(if_block_anchor);
      }
    };
  }

  function instance$2($$self, $$props, $$invalidate) {
    var _$$props$class = $$props["class"],
        clazz = _$$props$class === void 0 ? '' : _$$props$class;
    var _$$props$id = $$props.id,
        id = _$$props$id === void 0 ? '' : _$$props$id;
    var _$$props$style = $$props.style,
        style = _$$props$style === void 0 ? '' : _$$props$style;
    var icon = $$props.icon;
    var _$$props$size = $$props.size,
        size = _$$props$size === void 0 ? '' : _$$props$size;
    var _$$props$color = $$props.color,
        color = _$$props$color === void 0 ? '' : _$$props$color;
    var _$$props$fw = $$props.fw,
        fw = _$$props$fw === void 0 ? false : _$$props$fw;
    var _$$props$pull = $$props.pull,
        pull = _$$props$pull === void 0 ? '' : _$$props$pull;
    var _$$props$scale = $$props.scale,
        scale = _$$props$scale === void 0 ? 1 : _$$props$scale;
    var _$$props$translateX = $$props.translateX,
        translateX = _$$props$translateX === void 0 ? 0 : _$$props$translateX;
    var _$$props$translateY = $$props.translateY,
        translateY = _$$props$translateY === void 0 ? 0 : _$$props$translateY;
    var _$$props$rotate = $$props.rotate,
        rotate = _$$props$rotate === void 0 ? '' : _$$props$rotate;
    var _$$props$flip = $$props.flip,
        flip = _$$props$flip === void 0 ? false : _$$props$flip;
    var _$$props$spin = $$props.spin,
        spin = _$$props$spin === void 0 ? false : _$$props$spin;
    var _$$props$pulse = $$props.pulse,
        pulse = _$$props$pulse === void 0 ? false : _$$props$pulse;
    var _$$props$primaryColor = $$props.primaryColor,
        primaryColor = _$$props$primaryColor === void 0 ? '' : _$$props$primaryColor;
    var _$$props$secondaryCol = $$props.secondaryColor,
        secondaryColor = _$$props$secondaryCol === void 0 ? '' : _$$props$secondaryCol;
    var _$$props$primaryOpaci = $$props.primaryOpacity,
        primaryOpacity = _$$props$primaryOpaci === void 0 ? 1 : _$$props$primaryOpaci;
    var _$$props$secondaryOpa = $$props.secondaryOpacity,
        secondaryOpacity = _$$props$secondaryOpa === void 0 ? 0.4 : _$$props$secondaryOpa;
    var _$$props$swapOpacity = $$props.swapOpacity,
        swapOpacity = _$$props$swapOpacity === void 0 ? false : _$$props$swapOpacity;
    var i;
    var c;
    var s;
    var transform;

    $$self.$$set = function ($$props) {
      if ('class' in $$props) $$invalidate(11, clazz = $$props["class"]);
      if ('id' in $$props) $$invalidate(0, id = $$props.id);
      if ('style' in $$props) $$invalidate(12, style = $$props.style);
      if ('icon' in $$props) $$invalidate(13, icon = $$props.icon);
      if ('size' in $$props) $$invalidate(14, size = $$props.size);
      if ('color' in $$props) $$invalidate(1, color = $$props.color);
      if ('fw' in $$props) $$invalidate(15, fw = $$props.fw);
      if ('pull' in $$props) $$invalidate(16, pull = $$props.pull);
      if ('scale' in $$props) $$invalidate(17, scale = $$props.scale);
      if ('translateX' in $$props) $$invalidate(18, translateX = $$props.translateX);
      if ('translateY' in $$props) $$invalidate(19, translateY = $$props.translateY);
      if ('rotate' in $$props) $$invalidate(20, rotate = $$props.rotate);
      if ('flip' in $$props) $$invalidate(21, flip = $$props.flip);
      if ('spin' in $$props) $$invalidate(22, spin = $$props.spin);
      if ('pulse' in $$props) $$invalidate(23, pulse = $$props.pulse);
      if ('primaryColor' in $$props) $$invalidate(2, primaryColor = $$props.primaryColor);
      if ('secondaryColor' in $$props) $$invalidate(3, secondaryColor = $$props.secondaryColor);
      if ('primaryOpacity' in $$props) $$invalidate(4, primaryOpacity = $$props.primaryOpacity);
      if ('secondaryOpacity' in $$props) $$invalidate(5, secondaryOpacity = $$props.secondaryOpacity);
      if ('swapOpacity' in $$props) $$invalidate(6, swapOpacity = $$props.swapOpacity);
    };

    $$self.$$.update = function () {
      if ($$self.$$.dirty &
      /*icon*/
      8192) {
        $$invalidate(7, i = icon && icon.icon || [0, 0, '', [], '']);
      }

      if ($$self.$$.dirty &
      /*clazz, spin, pulse*/
      12584960) {
        $$invalidate(8, c = joinCss([clazz, spin && 'spin', pulse && 'pulse'], ' '));
      }

      if ($$self.$$.dirty &
      /*style, size, pull, fw*/
      118784) {
        $$invalidate(9, s = getStyles(style, size, pull, fw));
      }

      if ($$self.$$.dirty &
      /*scale, translateX, translateY, rotate, flip*/
      4063232) {
        $$invalidate(10, transform = getTransform(scale, translateX, translateY, rotate, flip, 512));
      }
    };

    return [id, color, primaryColor, secondaryColor, primaryOpacity, secondaryOpacity, swapOpacity, i, c, s, transform, clazz, style, icon, size, fw, pull, scale, translateX, translateY, rotate, flip, spin, pulse];
  }

  var Fa = /*#__PURE__*/function (_SvelteComponent) {
    _inheritsLoose(Fa, _SvelteComponent);

    function Fa(options) {
      var _this;

      _this = _SvelteComponent.call(this) || this;
      init(_assertThisInitialized(_this), options, instance$2, create_fragment$2, safe_not_equal, {
        "class": 11,
        id: 0,
        style: 12,
        icon: 13,
        size: 14,
        color: 1,
        fw: 15,
        pull: 16,
        scale: 17,
        translateX: 18,
        translateY: 19,
        rotate: 20,
        flip: 21,
        spin: 22,
        pulse: 23,
        primaryColor: 2,
        secondaryColor: 3,
        primaryOpacity: 4,
        secondaryOpacity: 5,
        swapOpacity: 6
      }, add_css$1);
      return _this;
    }

    return Fa;
  }(SvelteComponent);

  var Fa$1 = Fa;

  function add_css(target) {
    append_styles(target, "svelte-snamjk", ".layers.svelte-snamjk{display:inline-block;position:relative}.layers.svelte-snamjk .fa{position:absolute;bottom:0;left:0;right:0;top:0;margin:auto;text-align:center}.layers.svelte-snamjk .layers-text{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%)}.layers.svelte-snamjk .layers-text span{display:inline-block}");
  }

  function create_fragment$1(ctx) {
    var span;
    var span_class_value;
    var current;
    var default_slot_template =
    /*#slots*/
    ctx[8]["default"];
    var default_slot = create_slot(default_slot_template, ctx,
    /*$$scope*/
    ctx[7], null);
    return {
      c: function c() {
        span = element("span");
        if (default_slot) default_slot.c();
        attr(span, "id",
        /*id*/
        ctx[0]);
        attr(span, "class", span_class_value = "" + (null_to_empty(
        /*c*/
        ctx[1]) + " svelte-snamjk"));
        attr(span, "style",
        /*s*/
        ctx[2]);
      },
      m: function m(target, anchor) {
        insert(target, span, anchor);

        if (default_slot) {
          default_slot.m(span, null);
        }

        current = true;
      },
      p: function p(ctx, _ref) {
        var dirty = _ref[0];

        if (default_slot) {
          if (default_slot.p && (!current || dirty &
          /*$$scope*/
          128)) {
            update_slot_base(default_slot, default_slot_template, ctx,
            /*$$scope*/
            ctx[7], !current ? get_all_dirty_from_scope(
            /*$$scope*/
            ctx[7]) : get_slot_changes(default_slot_template,
            /*$$scope*/
            ctx[7], dirty, null), null);
          }
        }

        if (!current || dirty &
        /*id*/
        1) {
          attr(span, "id",
          /*id*/
          ctx[0]);
        }

        if (!current || dirty &
        /*c*/
        2 && span_class_value !== (span_class_value = "" + (null_to_empty(
        /*c*/
        ctx[1]) + " svelte-snamjk"))) {
          attr(span, "class", span_class_value);
        }

        if (!current || dirty &
        /*s*/
        4) {
          attr(span, "style",
          /*s*/
          ctx[2]);
        }
      },
      i: function i(local) {
        if (current) return;
        transition_in(default_slot, local);
        current = true;
      },
      o: function o(local) {
        transition_out(default_slot, local);
        current = false;
      },
      d: function d(detaching) {
        if (detaching) detach(span);
        if (default_slot) default_slot.d(detaching);
      }
    };
  }

  function instance$1($$self, $$props, $$invalidate) {
    var _$$props$$$slots = $$props.$$slots,
        slots = _$$props$$$slots === void 0 ? {} : _$$props$$$slots,
        $$scope = $$props.$$scope;
    var _$$props$class = $$props["class"],
        clazz = _$$props$class === void 0 ? '' : _$$props$class;
    var _$$props$id = $$props.id,
        id = _$$props$id === void 0 ? '' : _$$props$id;
    var _$$props$style = $$props.style,
        style = _$$props$style === void 0 ? '' : _$$props$style;
    var _$$props$size = $$props.size,
        size = _$$props$size === void 0 ? '' : _$$props$size;
    var _$$props$pull = $$props.pull,
        pull = _$$props$pull === void 0 ? '' : _$$props$pull;
    var c;
    var s;

    $$self.$$set = function ($$props) {
      if ('class' in $$props) $$invalidate(3, clazz = $$props["class"]);
      if ('id' in $$props) $$invalidate(0, id = $$props.id);
      if ('style' in $$props) $$invalidate(4, style = $$props.style);
      if ('size' in $$props) $$invalidate(5, size = $$props.size);
      if ('pull' in $$props) $$invalidate(6, pull = $$props.pull);
      if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    };

    $$self.$$.update = function () {
      if ($$self.$$.dirty &
      /*clazz*/
      8) {
        $$invalidate(1, c = joinCss([clazz, 'layers'], ' '));
      }

      if ($$self.$$.dirty &
      /*style, size, pull*/
      112) {
        $$invalidate(2, s = getStyles(style, size, pull, true));
      }
    };

    return [id, c, s, clazz, style, size, pull, $$scope, slots];
  }

  var Fa_layers = /*#__PURE__*/function (_SvelteComponent) {
    _inheritsLoose(Fa_layers, _SvelteComponent);

    function Fa_layers(options) {
      var _this;

      _this = _SvelteComponent.call(this) || this;
      init(_assertThisInitialized(_this), options, instance$1, create_fragment$1, safe_not_equal, {
        "class": 3,
        id: 0,
        style: 4,
        size: 5,
        pull: 6
      }, add_css);
      return _this;
    }

    return Fa_layers;
  }(SvelteComponent);

  var Fa_layers$1 = Fa_layers;

  function create_fragment(ctx) {
    var span1;
    var span0;
    var current;
    var default_slot_template =
    /*#slots*/
    ctx[13]["default"];
    var default_slot = create_slot(default_slot_template, ctx,
    /*$$scope*/
    ctx[12], null);
    return {
      c: function c() {
        span1 = element("span");
        span0 = element("span");
        if (default_slot) default_slot.c();
        attr(span0, "style",
        /*s*/
        ctx[2]);
        attr(span1, "id",
        /*id*/
        ctx[0]);
        attr(span1, "class",
        /*c*/
        ctx[1]);
      },
      m: function m(target, anchor) {
        insert(target, span1, anchor);
        append(span1, span0);

        if (default_slot) {
          default_slot.m(span0, null);
        }

        current = true;
      },
      p: function p(ctx, _ref) {
        var dirty = _ref[0];

        if (default_slot) {
          if (default_slot.p && (!current || dirty &
          /*$$scope*/
          4096)) {
            update_slot_base(default_slot, default_slot_template, ctx,
            /*$$scope*/
            ctx[12], !current ? get_all_dirty_from_scope(
            /*$$scope*/
            ctx[12]) : get_slot_changes(default_slot_template,
            /*$$scope*/
            ctx[12], dirty, null), null);
          }
        }

        if (!current || dirty &
        /*s*/
        4) {
          attr(span0, "style",
          /*s*/
          ctx[2]);
        }

        if (!current || dirty &
        /*id*/
        1) {
          attr(span1, "id",
          /*id*/
          ctx[0]);
        }

        if (!current || dirty &
        /*c*/
        2) {
          attr(span1, "class",
          /*c*/
          ctx[1]);
        }
      },
      i: function i(local) {
        if (current) return;
        transition_in(default_slot, local);
        current = true;
      },
      o: function o(local) {
        transition_out(default_slot, local);
        current = false;
      },
      d: function d(detaching) {
        if (detaching) detach(span1);
        if (default_slot) default_slot.d(detaching);
      }
    };
  }

  function instance($$self, $$props, $$invalidate) {
    var _$$props$$$slots = $$props.$$slots,
        slots = _$$props$$$slots === void 0 ? {} : _$$props$$$slots,
        $$scope = $$props.$$scope;
    var _$$props$class = $$props["class"],
        clazz = _$$props$class === void 0 ? '' : _$$props$class;
    var _$$props$id = $$props.id,
        id = _$$props$id === void 0 ? '' : _$$props$id;
    var _$$props$style = $$props.style,
        style = _$$props$style === void 0 ? '' : _$$props$style;
    var _$$props$size = $$props.size,
        size = _$$props$size === void 0 ? '' : _$$props$size;
    var _$$props$color = $$props.color,
        color = _$$props$color === void 0 ? '' : _$$props$color;
    var _$$props$scale = $$props.scale,
        scale = _$$props$scale === void 0 ? 1 : _$$props$scale;
    var _$$props$translateX = $$props.translateX,
        translateX = _$$props$translateX === void 0 ? 0 : _$$props$translateX;
    var _$$props$translateY = $$props.translateY,
        translateY = _$$props$translateY === void 0 ? 0 : _$$props$translateY;
    var _$$props$rotate = $$props.rotate,
        rotate = _$$props$rotate === void 0 ? '' : _$$props$rotate;
    var _$$props$flip = $$props.flip,
        flip = _$$props$flip === void 0 ? false : _$$props$flip;
    var c;
    var s;

    $$self.$$set = function ($$props) {
      if ('class' in $$props) $$invalidate(3, clazz = $$props["class"]);
      if ('id' in $$props) $$invalidate(0, id = $$props.id);
      if ('style' in $$props) $$invalidate(4, style = $$props.style);
      if ('size' in $$props) $$invalidate(5, size = $$props.size);
      if ('color' in $$props) $$invalidate(6, color = $$props.color);
      if ('scale' in $$props) $$invalidate(7, scale = $$props.scale);
      if ('translateX' in $$props) $$invalidate(8, translateX = $$props.translateX);
      if ('translateY' in $$props) $$invalidate(9, translateY = $$props.translateY);
      if ('rotate' in $$props) $$invalidate(10, rotate = $$props.rotate);
      if ('flip' in $$props) $$invalidate(11, flip = $$props.flip);
      if ('$$scope' in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    };

    $$self.$$.update = function () {
      if ($$self.$$.dirty &
      /*clazz*/
      8) {
        $$invalidate(1, c = joinCss([clazz, 'layers-text'], ' '));
      }

      if ($$self.$$.dirty &
      /*color, scale, translateX, translateY, rotate, flip, style, size*/
      4080) {
        $$invalidate(2, s = getStyles(joinCss([joinCss({
          color: color,
          display: 'inline-block',
          height: 'auto',
          transform: getTransform(scale, translateX, translateY, rotate, flip, undefined, 'em', 'deg')
        }), style]), size));
      }
    };

    return [id, c, s, clazz, style, size, color, scale, translateX, translateY, rotate, flip, $$scope, slots];
  }

  var Fa_layers_text = /*#__PURE__*/function (_SvelteComponent) {
    _inheritsLoose(Fa_layers_text, _SvelteComponent);

    function Fa_layers_text(options) {
      var _this;

      _this = _SvelteComponent.call(this) || this;
      init(_assertThisInitialized(_this), options, instance, create_fragment, safe_not_equal, {
        "class": 3,
        id: 0,
        style: 4,
        size: 5,
        color: 6,
        scale: 7,
        translateX: 8,
        translateY: 9,
        rotate: 10,
        flip: 11
      });
      return _this;
    }

    return Fa_layers_text;
  }(SvelteComponent);

  var Fa_layers_text$1 = Fa_layers_text;

  exports.Fa = Fa$1;
  exports.FaLayers = Fa_layers$1;
  exports.FaLayersText = Fa_layers_text$1;
  exports["default"] = Fa$1;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
