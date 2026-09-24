REAL SCREENSHOTS LIVE HERE — DO NOT DELETE

home.png, order.png, rewards.png are the actual Frenchies product screenshots,
uploaded directly to Netlify. They are NOT in this zip. When deploying a zip,
Netlify replaces the whole site — so these three files must be re-uploaded, or
deploy via Git so they persist.

If the files are absent, each phone falls back automatically to the built-in
HTML recreation (onerror removes the <img>), so the site still renders correctly.

Pages using them:
  /                          home.png, rewards.png
  /work/frenchies/           order.png, home.png, rewards.png
  /small-business/           rewards.png
