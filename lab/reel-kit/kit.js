// Quiet Bands reel kit. A composition defines render(t) in recording seconds and calls Kit.boot().
// Shared: timeline helpers, captions, the talking-head frame seek, the sting end frame and live preview.
(function () {
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, d) => clamp((t - a) / d);
  const lerp = (a, b, k) => a + (b - a) * k;
  const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
  const outCubic = (k) => 1 - Math.pow(1 - k, 3);
  const inCubic = (k) => k * k * k;
  const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const outBack = (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
  const css = (el, o) => Object.assign(el.style, o);
  const show = (el, on) => { el.style.display = on ? '' : 'none'; };
  // mask reveal of a .mask > span: k 0→1 slides the text up into view; out 0→1 slides it away
  const maskIn = (el, k, out = 0) => {
    const s = el.querySelector('.mask > span');
    s.style.transform = `translateY(${(1 - outExpo(k)) * 105 - inCubic(out) * 105}%)`;
  };
  // shrink an element's font until it fits maxW (measure, don't guess)
  const fit = (el, maxW) => { let fs = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > maxW && fs > 10) { fs -= 2; el.style.fontSize = fs + 'px'; } return fs; };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // captions: [[start, end, html], ...] in recording seconds; quick fade in, cut out
  function captions(el, caps, t) {
    const c = caps.find(([a, b]) => t >= a && t < b);
    if (el.dataset.html !== (c ? c[2] : '')) { el.innerHTML = c ? c[2] : ''; el.dataset.html = c ? c[2] : ''; }
    el.style.opacity = c ? seg(t, c[0], 0.08) : 0;
  }

  // the sting (lab/qb-sting/SIGNATURE.md): black arrives over 0.2 s, the mark lands on the hit,
  // the wordmark 0.07 s later; each fades over 0.16 s and rises 24 px / 96.5 → 100 % over 0.6 s
  const STING = { lag: 0.07, rise: 0.6, fade: 0.16, black: 0.2, length: 1.7 };
  const LOCKUP = `<svg class="lockup" viewBox="0 0 845 690" role="img" aria-label="Quiet Bands" xmlns="http://www.w3.org/2000/svg"><g id="qbmark"><path fill="currentColor" transform="translate(98.1 0) scale(0.7874)" d="M307 120H239A236 230 0 0 0 239 580H307V476H239A126 126 0 0 1 239 224H307ZM516 120H584A236 230 0 0 1 584 580H516V476H584A126 126 0 0 0 584 224H516ZM394 0H429A43 43 0 0 1 472 43V615A43 43 0 0 1 429 658H394A43 43 0 0 1 351 615V43A43 43 0 0 1 394 0Z"/></g><g id="qbword"><path fill="currentColor" transform="translate(0 535.1)" d="M71 155C70 155 69 154 69 154C68 154 68 150 68 132C68 112 68 110 68 110C67 109 67 110 65 111C62 113 60 114 55 116C49 118 41 119 33 117C24 115 13 108 8 100C4 95 2 90 1 83C-1 73 1 62 6 53C11 46 16 42 23 38C27 36 32 34 37 33C40 33 48 33 51 33C58 35 62 38 66 41C68 42 68 42 69 39C69 34 67 35 80 35C91 34 91 34 92 35C92 35 92 36 92 88C92 158 92 154 92 154C91 155 77 155 71 155ZM446 118C439 118 432 115 427 111C425 110 424 109 424 109C423 108 423 109 423 113C423 115 423 116 422 116C421 117 399 117 399 116C399 116 399 91 399 60C399 6 399 4 399 4L400 3L411 3C417 3 422 3 422 3C423 4 423 3 424 23C424 33 424 41 424 41C424 42 425 42 426 41C431 36 440 33 447 33C459 32 470 37 479 45C492 58 495 79 486 96C482 104 474 111 466 114C458 118 454 118 446 118ZM804 118C799 118 796 117 792 115C784 113 778 107 774 100C772 97 772 96 780 94C781 93 783 92 785 92C786 91 788 91 789 90C792 89 792 89 793 90C795 93 798 97 801 98C806 101 816 100 819 97C820 96 821 94 821 93C821 92 820 89 819 89C817 87 811 85 804 83C794 81 789 79 784 75C777 71 775 63 776 55C778 48 779 46 783 42C787 38 789 37 795 35C800 33 802 33 806 33C822 32 835 39 841 50C842 52 842 52 838 54C836 55 833 56 831 57C826 59 824 59 823 59C823 59 822 59 822 58C820 55 817 52 813 51C807 50 801 52 799 55C799 57 799 59 800 61C801 62 807 65 816 66C821 67 828 69 832 71C835 73 840 77 842 80C846 87 845 97 840 105C835 112 824 117 812 118C809 118 806 118 804 118ZM254 118C248 117 240 115 235 112C231 109 225 103 223 100C220 95 217 88 216 82C214 71 217 58 223 50C229 43 236 38 245 35C251 33 253 33 260 33C267 33 270 33 278 36C284 38 292 45 295 49C300 57 302 62 303 71C303 75 303 81 303 81C302 82 298 82 272 82C240 82 240 82 240 83C239 84 241 87 242 89C245 93 249 96 254 97C258 98 264 98 267 97C271 96 276 93 278 90C280 88 280 87 289 92C294 94 298 96 298 97C299 97 299 97 298 100C295 104 291 107 285 111C280 115 272 117 266 118C262 118 257 118 254 118ZM530 118C527 117 523 117 522 116C521 116 519 115 518 115C510 111 502 105 498 97C493 88 491 78 493 71C495 56 502 46 514 38C517 36 522 35 527 33C531 33 538 33 542 34C549 35 554 37 558 41C560 43 560 42 560 38C560 36 560 35 561 35C561 35 563 35 572 35C583 35 583 35 583 35C584 36 584 41 584 76L584 116L583 116C583 116 581 116 572 116C559 116 560 117 560 112C560 109 560 108 559 109C558 109 557 110 556 111C553 114 547 116 542 117C540 118 534 118 530 118ZM714 118C707 117 701 115 696 111C692 109 688 105 686 102C684 100 681 94 680 92C675 80 676 65 683 54C689 43 698 36 711 34C715 33 723 33 727 34C734 36 738 37 743 41C744 42 744 42 744 41C745 41 745 40 745 22C745 12 745 3 745 3C745 3 767 3 768 3C768 4 768 7 768 58C768 114 768 116 768 116C768 116 763 116 756 116C743 116 745 117 745 113C745 108 745 108 741 111C737 114 732 116 727 117C724 118 717 118 714 118ZM126 118C123 117 117 115 115 114C110 111 107 107 104 102C102 98 102 97 101 92L100 89L100 63C100 48 100 36 100 36C101 35 101 35 110 35C119 34 123 35 124 35C124 35 124 39 124 59C124 86 124 85 126 89C129 96 139 98 147 95C152 92 155 88 156 82C156 79 156 78 156 57C156 37 157 35 157 35C158 34 179 34 180 35C180 35 180 39 180 75L180 115L180 116C179 116 179 116 168 116C159 116 158 116 157 116C157 116 157 115 156 112C156 108 156 108 154 110C150 113 144 116 139 117C136 118 128 118 126 118ZM342 117C331 117 322 112 318 104C315 98 315 96 315 74C315 56 315 56 315 55C314 55 314 55 309 55C305 55 303 55 303 54C302 54 302 35 303 35C303 35 305 34 309 34C313 34 314 34 315 34L315 34L315 23C315 14 315 13 316 13C317 12 338 12 338 13C339 13 339 14 339 23C339 31 339 33 339 34C340 34 340 34 349 35C358 35 358 35 359 35C359 36 359 54 359 54C358 55 356 55 349 55C342 55 340 55 339 55C339 56 339 57 339 71C339 88 339 89 340 92C342 96 345 97 354 96C358 96 358 96 359 97C359 97 359 101 359 107C359 116 359 116 358 117C358 117 355 117 352 117C347 117 345 117 342 117ZM592 116C591 115 591 36 592 35C592 35 612 34 614 35L615 35L615 38C615 40 615 42 615 42C615 43 616 42 618 41C623 36 631 33 640 33C644 33 644 33 649 34C652 35 656 37 657 38C658 38 658 38 659 39C660 39 665 44 666 46C669 50 672 56 672 62C673 64 673 81 673 102C673 115 673 116 672 116C672 117 649 117 649 116C649 116 649 106 649 92C649 66 649 66 647 62C645 59 644 57 640 55L638 55L633 55C630 55 629 55 628 55C621 57 617 62 616 68C615 70 615 71 615 93C615 111 615 115 615 116C614 117 592 117 592 116ZM188 116C188 116 187 116 187 115C187 115 187 36 187 36C187 35 188 35 188 35C188 35 209 35 210 35C210 35 211 35 211 36C211 36 211 54 211 76C211 114 211 116 210 116C210 116 189 116 188 116ZM51 96C58 95 64 90 67 83C69 78 69 71 66 66C60 54 45 50 34 58C28 61 25 67 24 74C23 81 27 88 33 93C36 95 39 96 43 97C44 97 49 97 51 96ZM447 97C458 96 467 87 467 75C467 71 466 68 463 63C456 52 439 51 430 60C425 64 424 69 423 75C423 83 425 87 431 92C435 95 438 96 442 97C443 97 444 97 444 97C444 97 445 97 447 97ZM540 97C552 95 559 87 560 77C560 70 558 65 554 60C546 52 531 52 523 60C514 68 514 81 522 90C527 95 534 98 540 97ZM729 96C733 95 737 92 740 88C742 85 743 84 744 81C745 78 745 78 745 74C745 71 745 70 744 68C740 59 733 54 723 54C717 54 712 56 708 59C705 63 703 65 702 69C701 71 701 72 701 75C701 79 701 79 702 82C703 85 704 87 706 89C709 93 713 95 717 96C720 97 726 97 729 96ZM279 65C280 65 278 60 275 58C273 55 270 54 266 53C260 51 253 52 248 55C243 58 239 65 241 66C243 66 278 66 279 65ZM196 25C192 24 189 22 187 18C186 15 186 10 188 6C194 -2 206 -2 211 6C213 10 213 14 212 17C211 21 208 24 204 25C202 26 198 26 196 25Z"/></g></svg>`;
  function sting(t, hit) {
    const end = $('kit-end');
    show(end, t >= hit - STING.black);
    end.style.opacity = seg(t, hit - STING.black, STING.black);
    [['qbmark', hit], ['qbword', hit + STING.lag]].forEach(([id, t0]) => {
      const k = outExpo(seg(t, t0, STING.rise));
      css($(id), { opacity: seg(t, t0, STING.fade), transform: `translateY(${(1 - k) * 24 * 845 / 300}px) scale(${0.965 + 0.035 * k})` });
    });
  }

  // boot: window.REEL tells the renderer the timing; ?face=<dir> holds the graded talking-head JPEGs
  // (0001.jpg = t 0); ?play previews live. init() runs once fonts are ready (for canvas text etc.).
  function boot({ render, fps = 30, offset = 0, frames, face, init }) {
    window.REEL = { fps, offset, frames };
    $('stage').insertAdjacentHTML('beforeend', `<div id="kit-end" style="display:none">${LOCKUP}</div>`);
    const q = new URLSearchParams(location.search);
    const dir = q.get('face') || 'face';
    window.seek = async (t) => {
      if (face) {
        const n = clamp(Math.floor(t * face.fps + 1e-6) + 1, 1, face.count);
        const src = `${dir}/${String(n).padStart(4, '0')}.jpg`;
        if (face.img.getAttribute('src') !== src) { face.img.src = src; await face.img.decode().catch(() => {}); }
      }
      render(t);
    };
    window.ready = document.fonts.ready.then(() => init && init()).then(() => window.seek(offset));
    if (q.has('play')) window.ready.then(() => {
      const t0 = performance.now(), len = frames / fps;
      const tick = (now) => { window.seek(offset + (((now - t0) / 1000) % len)); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }

  window.Kit = { $, clamp, seg, lerp, outExpo, outCubic, inCubic, inOut, outBack, css, show, maskIn, fit, svg, rng, captions, sting, STING, boot };
})();
