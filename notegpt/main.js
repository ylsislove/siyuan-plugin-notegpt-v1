"use strict";
const siyuan = require("siyuan");
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
function append(target, node) {
  target.appendChild(node);
}
function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function element(name) {
  return document.createElement(name);
}
function text(data) {
  return document.createTextNode(data);
}
function space() {
  return text(" ");
}
function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.data === data)
    return;
  text2.data = data;
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length)
      binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
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
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function flush_render_callbacks(fns) {
  const filtered = [];
  const targets = [];
  render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
  targets.forEach((c) => c());
  render_callbacks = filtered;
}
const outroing = /* @__PURE__ */ new Set();
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function mount_component(component, target, anchor, customElement) {
  const { fragment, after_update } = component.$$;
  fragment && fragment.m(target, anchor);
  if (!customElement) {
    add_render_callback(() => {
      const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
      if (component.$$.on_destroy) {
        component.$$.on_destroy.push(...new_on_destroy);
      } else {
        run_all(new_on_destroy);
      }
      component.$$.on_mount = [];
    });
  }
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
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
function init(component, options, instance2, create_fragment2, not_equal, props, append_styles, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop,
    not_equal,
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
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles && append_styles($$.root);
  let ready = false;
  $$.ctx = instance2 ? instance2(component, options.props || {}, (i, ret, ...rest) => {
    const value = rest.length ? rest[0] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i])
        $$.bound[i](value);
      if (ready)
        make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment2 ? create_fragment2($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro)
      transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor, options.customElement);
    flush();
  }
  set_current_component(parent_component);
}
class SvelteComponent {
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }
  $on(type, callback) {
    if (!is_function(callback)) {
      return noop;
    }
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1)
        callbacks.splice(index, 1);
    };
  }
  $set($$props) {
    if (this.$$set && !is_empty($$props)) {
      this.$$.skip_bound = true;
      this.$$set($$props);
      this.$$.skip_bound = false;
    }
  }
}
function create_fragment(ctx) {
  let button;
  let t0;
  let t1;
  let t2;
  let p0;
  let t3;
  let t4;
  let t5;
  let t6;
  let p1;
  let t7;
  let t8;
  let t9;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      t0 = text("hello Count: ");
      t1 = text(
        /*count*/
        ctx[0]
      );
      t2 = space();
      p0 = element("p");
      t3 = text(
        /*count*/
        ctx[0]
      );
      t4 = text(" * 2 = ");
      t5 = text(
        /*doubled*/
        ctx[1]
      );
      t6 = space();
      p1 = element("p");
      t7 = text(
        /*doubled*/
        ctx[1]
      );
      t8 = text(" * 2 = ");
      t9 = text(
        /*quadrupled*/
        ctx[2]
      );
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t0);
      append(button, t1);
      insert(target, t2, anchor);
      insert(target, p0, anchor);
      append(p0, t3);
      append(p0, t4);
      append(p0, t5);
      insert(target, t6, anchor);
      insert(target, p1, anchor);
      append(p1, t7);
      append(p1, t8);
      append(p1, t9);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*handleClick*/
          ctx[3]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*count*/
      1)
        set_data(
          t1,
          /*count*/
          ctx2[0]
        );
      if (dirty & /*count*/
      1)
        set_data(
          t3,
          /*count*/
          ctx2[0]
        );
      if (dirty & /*doubled*/
      2)
        set_data(
          t5,
          /*doubled*/
          ctx2[1]
        );
      if (dirty & /*doubled*/
      2)
        set_data(
          t7,
          /*doubled*/
          ctx2[1]
        );
      if (dirty & /*quadrupled*/
      4)
        set_data(
          t9,
          /*quadrupled*/
          ctx2[2]
        );
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching)
        detach(button);
      if (detaching)
        detach(t2);
      if (detaching)
        detach(p0);
      if (detaching)
        detach(t6);
      if (detaching)
        detach(p1);
      mounted = false;
      dispose();
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let doubled;
  let quadrupled;
  let count = 1;
  function handleClick() {
    $$invalidate(0, count += 1);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*count*/
    1) {
      $$invalidate(1, doubled = count * 2);
    }
    if ($$self.$$.dirty & /*doubled*/
    2) {
      $$invalidate(2, quadrupled = doubled * 2);
    }
  };
  return [count, doubled, quadrupled, handleClick];
}
class Chat extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}
class SiyuanNoteGPTPlugin extends siyuan.Plugin {
  constructor() {
    super();
    this.svg = '<svg t="1680207380520" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2720" width="200" height="200"><path d="M956.488825 419.108638a252.269534 252.269534 0 0 0-22.198841-209.554136 262.216956 262.216956 0 0 0-226.742695-129.535908c-18.468558 0-36.863974 1.938284-54.893675 5.74171A260.095814 260.095814 0 0 0 459.264038 0.000366h-2.230856c-113.407919 0-213.942704 72.191948-248.831822 178.651301A258.41353 258.41353 0 0 0 35.32834 302.409293 255.56096 255.56096 0 0 0 0.000366 431.872057c0 63.963383 24.063983 125.622767 67.510809 173.055877a252.15982 252.15982 0 0 0 22.198841 209.480993c56.612531 97.279931 170.422735 147.34618 281.599799 123.830769A260.132386 260.132386 0 0 0 564.699391 1023.999634h2.303998c113.481062 0 214.015847-72.191948 248.868394-178.724443a258.450101 258.450101 0 0 0 172.836448-123.757626 255.231818 255.231818 0 0 0-32.182834-302.445499zM566.418247 957.073968h-0.256a195.693575 195.693575 0 0 1-124.233054-44.434254c2.047999-1.097142 4.095997-2.230856 6.107424-3.437712l206.628424-117.759916a33.097119 33.097119 0 0 0 17.005702-28.818265v-287.63408l87.332509 49.737107a3.071998 3.071998 0 0 1 1.718856 2.377141v238.07983c-0.109714 105.801067-87.039938 191.634149-194.303861 191.853577zM148.553402 780.909522a189.513007 189.513007 0 0 1-23.22284-128.585051l6.143996 3.65714 206.628423 117.759916a34.047976 34.047976 0 0 0 33.974833 0l252.269534-143.725611v99.657071a3.071998 3.071998 0 0 1-1.243427 2.486856l-208.895851 119.003343c-29.549693 16.786274-63.049098 25.599982-97.170216 25.599982-69.485665 0-133.668476-36.534831-168.484452-95.817074zM94.171727 335.872126a193.206719 193.206719 0 0 1 101.266213-84.150797l-0.109714 7.021709V494.482298c0 11.922277 6.473138 22.893698 16.969131 28.781694l252.269534 143.725612-87.332509 49.737107a3.181712 3.181712 0 0 1-2.925712 0.292571l-208.932422-119.113058a191.67072 191.67072 0 0 1-97.133645-166.253595c0-33.609119 8.959994-66.633095 25.965695-95.817075z m717.604059 164.754168L559.542823 356.900682l87.332509-49.737107a3.145141 3.145141 0 0 1 2.925712-0.292571l208.932423 119.003343a191.561006 191.561006 0 0 1 97.243359 166.217024c0 80.383943-50.834249 152.356463-127.305052 180.114157v-242.578112-0.292571a33.060548 33.060548 0 0 0-16.822845-28.708551z m86.930223-129.097051a297.691216 297.691216 0 0 0-6.143995-3.620569l-206.628424-117.759916a34.084547 34.084547 0 0 0-33.938261 0l-252.306106 143.725612V294.180727c0-0.987428 0.475428-1.901713 1.279999-2.486855l208.895851-118.857058a196.571288 196.571288 0 0 1 97.133645-25.673125c107.410209 0 194.52329 85.942796 194.523289 191.890149 0 10.898278-0.950856 21.759984-2.815998 32.475405z m-546.486466 177.371302l-87.369081-49.737107a3.071998 3.071998 0 0 1-1.682284-2.377141v-238.07983c0.036571-105.87421 87.149652-191.743863 194.523289-191.743863 45.458253 0 89.490222 15.725703 124.452483 44.397682a182.601012 182.601012 0 0 0-6.143996 3.437712L369.37153 232.594485a33.060548 33.060548 0 0 0-17.005702 28.818265v0.182857l-0.146285 287.341509z m47.433109-100.937071l112.383919-63.999954 112.347349 63.999954v127.999909l-112.347349 63.999954-112.383919-63.999954v-127.999909z" p-id="2721"></path></svg>';
  }
  onload() {
    this.el = document.createElement("div");
    this.el.classList.add("toolbar__item", "b3-tooltips", "b3-tooltips__se");
    this.el.setAttribute("aria-label", "打开NoteGPT");
    this.el.innerHTML = this.svg;
    this.el.addEventListener("click", (event) => {
      showSettingDialog();
    });
    siyuan.clientApi.addToolbarLeft(this.el);
  }
  onunload() {
    var _a;
    (_a = this.el) == null ? void 0 : _a.remove();
  }
}
function showSettingDialog() {
  new siyuan.Dialog({
    title: "插件系统设置",
    content: '<div id="plugin-notegpt"></div>',
    width: "90vw",
    height: "50vh"
  });
  setTimeout(() => {
    new Chat({
      target: document.getElementById("plugin-notegpt")
    });
  });
}
module.exports = SiyuanNoteGPTPlugin;
