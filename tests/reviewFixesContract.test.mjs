import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

async function pathExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

const installScript = await readFile(new URL('../installRightClickHelper.sh', import.meta.url), 'utf8');
const permissionPage = await readFile(new URL('../html/getpermissions.html', import.meta.url), 'utf8');
const optionsPage = await readFile(new URL('../html/options.html', import.meta.url), 'utf8');
const popupPage = await readFile(new URL('../html/popup.html', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../js/sw/runtime.js', import.meta.url), 'utf8');
const dispatcher = await readFile(new URL('../js/sw/dispatcher.js', import.meta.url), 'utf8');
const actionState = await readFile(new URL('../js/sw/action-state.js', import.meta.url), 'utf8');
const enLocale = await readFile(new URL('../_locales/en/messages.json', import.meta.url), 'utf8');
const zhCnLocale = await readFile(new URL('../_locales/zh_CN/messages.json', import.meta.url), 'utf8');

const edgeOrigin = 'chrome-extension://elponhbfjjjihgeijofonnflefhcbckp/';
const escapedEdgeOrigin = edgeOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const edgeOriginMatches = installScript.match(new RegExp(escapedEdgeOrigin, 'g')) || [];
assert.equal(edgeOriginMatches.length, 1, 'Edge extension origin must appear exactly once in installRightClickHelper.sh');

const perdesMatches = permissionPage.match(/id="perdes"/g) || [];
assert.equal(perdesMatches.length, 1, 'html/getpermissions.html must not contain duplicate perdes ids');

for (const file of ['ui.js', 'base64.js', 'namespace.js', 'purify.js', 'actions.js', 'qrcode.js', 'sortable.js']) {
  assert.equal(await pathExists(`../js/lib/${file}`), true, `${file} must be relocated under js/lib`);
  assert.equal(await pathExists(`../js/${file}`), false, `${file} must not remain in js root after relocation`);
}

assert.match(optionsPage, /<script src="\.\.\/js\/lib\/ui\.js"><\/script>[\s\S]*<script src="\.\.\/js\/content\/event\.js"><\/script>[\s\S]*<script src="\.\.\/js\/lib\/base64\.js"><\/script>[\s\S]*<script src="\.\.\/js\/lib\/namespace\.js" type="text\/javascript"><\/script>[\s\S]*<script src="\.\.\/js\/lib\/purify\.js" type="text\/javascript"><\/script>/, 'html/options.html must load relocated shared libs from js/lib while preserving head script order');
assert.match(optionsPage, /<script src="\.\.\/js\/pages\/options\.js"><\/script>\s*<script src="\.\.\/js\/lib\/actions\.js"><\/script>\s*<script src="\.\.\/js\/lib\/qrcode\.js"><\/script>\s*<script src="\.\.\/js\/lib\/sortable\.js"><\/script>/, 'html/options.html must load the options tail shared libs from js/lib while preserving tail script order');
assert.match(popupPage, /<script src="\.\.\/js\/lib\/namespace\.js"><\/script>/, 'html/popup.html must load namespace.js from js/lib');

const uiModel = await readFile(new URL('../js/lib/ui.js', import.meta.url), 'utf8');

assert.equal(uiModel.includes('main:["fnswitch","general","mges","sdrg","drg","rges","wges","pop","icon","ctm","touch","dca","ksa","about"]'), false, 'ui menu model must not keep removed about surface');
assert.equal(uiModel.includes('about:["about","donatedev","moreext","translate","thanks",/*"help",*/"changelog"]'), false, 'ui submenu model must not keep removed about-related sections');

for (const localeText of [enLocale, zhCnLocale]) {
  for (const key of ['"menu_about"', '"about"', '"ext_allver"', '"moreext"', '"des_moreextlist"', '"translate"', '"thanks"', '"changelog"']) {
    assert.equal(localeText.includes(key), false, `${key} must be removed from cleaned locales`);
  }
}

assert.match(runtime, /chrome\.runtime\.onInstalled\.addListener\(async \(details\) => \{[\s\S]*dispatcher\.handleInstalled\(details\)/, 'runtime must pass install details through active service worker dispatcher');
assert.match(runtime, /injection\.injectFiles\(tab\.id, \['js\/content\/event\.js'\], true\)/, 'runtime onInstalled must inject event.js through worker-owned path');
assert.match(runtime, /createNativeHelper/, 'runtime must wire native-helper service when active worker handles sendRightClick');
assert.match(dispatcher, /message\.type === 'sendRightClick'[\s\S]*services\.nativeHelper\?\.sendRightClick/, 'dispatcher must route sendRightClick through active native helper service');

assert.match(dispatcher, /async handleInstalled\(details\) \{[\s\S]*installReason = details\?\.reason[\s\S]*setDefaultTitle\('smartUp'\)[\s\S]*return \{ ok: true, reason: installReason \}/, 'dispatcher handleInstalled must return ok after worker-side initialization and preserve install reason');
assert.match(dispatcher, /async handleActionClick\(tab\) \{[\s\S]*services\.injection\.injectFiles\(tab\.id, \['js\/content\/event\.js'\], true\)/, 'dispatcher handleActionClick must route event.js injection through worker services');
assert.match(dispatcher, /message\.type === 'opt_getconf'/, 'dispatcher must implement options initialization config contract');
assert.match(dispatcher, /message\.type === 'pop_getconf'/, 'dispatcher must implement popup initialization config contract');
assert.match(dispatcher, /message\.type === 'saveConf'[\s\S]*saveConfig\(message\.value\)/, 'dispatcher must route options saveConf through worker-owned storage save semantics');
assert.match(dispatcher, /message\.type === 'action_pop'[\s\S]*handleActionPop\(message, sender\)/, 'dispatcher must route popup actions through worker-owned action_pop handling');
assert.match(dispatcher, /runPopupAction\(action/, 'dispatcher action_pop handling must call the active action service instead of returning unsupported');
assert.equal(/type === 'action_pop' \|\| type\.startsWith\('action_'\)/.test(dispatcher), false, 'dispatcher must not classify action_pop as unsupported');

assert.match(actionState, /setBadgeText\(tabId, text\)/, 'action-state must expose tab badge updates');
assert.match(actionState, /runPopupAction\(action, context = \{\}\)/, 'action-state must expose a worker-owned popup action runner contract');

console.log('review fixes contract verified');
