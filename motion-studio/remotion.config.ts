// Settings for `npm run studio` (the interactive Remotion Studio). The CLI pipeline in
// scripts/ passes the same values programmatically, so both paths render identically.
import {Config} from '@remotion/cli/config';
import {existsSync} from 'node:fs';

const SHELL = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = process.env.QB_BROWSER ?? (existsSync(SHELL) ? SHELL : null);

Config.setPublicDir('./projects');
if (browser) Config.setBrowserExecutable(browser);
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
