import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../js/sw/runtime.js', import.meta.url), 'utf8');
const dispatcher = await readFile(new URL('../js/sw/dispatcher.js', import.meta.url), 'utf8');
const injection = await readFile(new URL('../js/sw/injection.js', import.meta.url), 'utf8');

assert.match(injection, /executeScript\(\{ target: \{ tabId, allFrames \}, files \}\)/, 'injectFiles must use chrome.scripting.executeScript with static files');
assert.match(injection, /for \(const files of fileGroups\)[\s\S]*executeScript\(\{ target: \{ tabId, allFrames \}, files \}\)/, 'injectSequence must preserve file group ordering through scripting.executeScript');
assert.match(runtime, /const appLaunchMap = \{[\s\S]*rss:[\s\S]*appJs: \['js\/inject\/rss\.js'\]/, 'runtime must define active app launch allowlist in service worker');
assert.match(runtime, /chrome\.scripting\?\.insertCSS[\s\S]*appSpec\.baseCss/, 'runtime app launcher must inject base CSS through active MV3 path');
assert.match(runtime, /await injection\.injectFiles\(context\.senderTabId, appSpec\.baseJs, false\)/, 'runtime app launcher must inject base JS through active MV3 path');
assert.match(runtime, /await injection\.injectFiles\(context\.senderTabId, appSpec\.appJs, false\)/, 'runtime app launcher must inject app JS through active MV3 path');
assert.match(dispatcher, /message\.type === 'inject_files'/, 'dispatcher must expose inject_files runtime contract');
assert.match(dispatcher, /message\.type === 'inject_sequence'/, 'dispatcher must expose inject_sequence runtime contract');
assert.equal(dispatcher.includes('apps_test'), false, 'active MV3 dispatcher must not depend on legacy apps_test background path');

console.log('executeScript migration contract verified');
