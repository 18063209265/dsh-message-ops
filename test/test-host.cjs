const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2], 'utf8');
const start = source.indexOf('      var ensureUserActionsHost = block => {');
const end = source.indexOf('\n      var ensureBtn =', start);
assert(start >= 0 && end > start);
class El {
  constructor(className = '') { this.className = className; this.children = []; this.parentElement = null; }
  get classList() { return this.className.split(/\s+/).filter(Boolean); }
  get childNodes() { return this.children; }
  appendChild(child) { child.remove(); this.children.push(child); child.parentElement = this; return child; }
  remove() { if (this.parentElement) { const p = this.parentElement; p.children.splice(p.children.indexOf(this), 1); this.parentElement = null; } }
  querySelectorAll(selector) {
    const match = el => selector.startsWith('.') ? el.classList.includes(selector.slice(1)) : el.className.includes('_actions');
    return this.children.flatMap(el => [...(match(el) ? [el] : []), ...el.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
const context = { document: { createElement: () => new El() } };
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const ensure = context.ensureUserActionsHost;
const classes = ['mopsUserRevert', 'mopsUserEdit', 'mopsUserFork'];
const block = new El();
for (let i = 0; i < 100; i++) {
  for (const cls of classes) { const host = ensure(block); if (!host.querySelector('.' + cls)) host.appendChild(new El(cls)); }
}
assert.equal(block.children.length, 1);
assert.equal(block.children[0].children.length, 3);
console.log('PASS: 100 scans retain one fallback row and three buttons');
const original = block.querySelector('.mopsUserRevert');
original.listener = () => 'preserved';
for (let i = 0; i < 8; i++) { const row = block.appendChild(new El('mopsUserActionsRow')); classes.forEach(c => row.appendChild(new El(c))); }
ensure(block);
assert.equal(block.children.length, 1);
classes.forEach(c => assert.equal(block.querySelectorAll('.' + c).length, 1));
assert.equal(block.querySelector('.mopsUserRevert'), original);
assert.equal(original.listener(), 'preserved');
console.log('PASS: repair eight duplicate groups, preserving button identity/listeners');
const native = block.appendChild(new El('newBuildHash_actions'));
ensure(block);
assert.equal(block.children.length, 1);
assert.equal(block.children[0], native);
assert.equal(native.children.length, 3);
assert.equal(native.querySelector('.mopsUserRevert'), original);
console.log('PASS: migrate to native action row after hash change');
const other = new El();
assert.notEqual(ensure(other), native);
assert.equal(native.children.length, 3);
console.log('PASS: separate messages retain independent hosts');
