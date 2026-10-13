(function () {
  "use strict";

  var GRID = 20;
  var BEST_KEY = "snake-best";

  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var overlayEl = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var startBtn = document.getElementById("start-btn");
  var pauseBtn = document.getElementById("pause-btn");
  var newBtn = document.getElementById("new-btn");

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  var snake, dir, dirQueue, food, score, best, running, paused, over;
  var cell = 0;
  var acc = 0;
  var last = 0;
  var rafId = null;

  best = Number(localStorage.getItem(BEST_KEY)) || 0;
  bestEl.textContent = best;

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = DIRS.right;
    dirQueue = [];
    score = 0;
    paused = false;
    over = false;
    running = false;
    scoreEl.textContent = "0";
    placeFood();
    draw();
  }

  function placeFood() {
    var empty = [];
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        if (!snake.some(function (s) { return s.x === x && s.y === y; })) {
          empty.push({ x: x, y: y });
        }
      }
    }
    food = empty[Math.floor(Math.random() * empty.length)] || { x: 0, y: 0 };
  }

  function stepInterval() {
    return Math.max(70, 150 - Math.floor(score / 5) * 8);
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = size / GRID;
    draw();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    var size = cell * GRID;
    ctx.clearRect(0, 0, size, size);
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#12171f" : "#151c26";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    if (food) {
      var cx = food.x * cell + cell / 2;
      var cy = food.y * cell + cell / 2;
      ctx.fillStyle = "#f85149";
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(cx - cell * 0.1, cy - cell * 0.1, cell * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var i = snake.length - 1; i >= 0; i--) {
      var s = snake[i];
      var pad = cell * 0.08;
      ctx.fillStyle = i === 0 ? "#56d364" : "#3fb950";
      roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.22);
      ctx.fill();
    }
  }

  function tick() {
    if (dirQueue.length) {
      var nd = dirQueue.shift();
      if (!isOpposite(nd, dir)) dir = nd;
    }
    var head = snake[0];
    var nx = head.x + dir.x;
    var ny = head.y + dir.y;

    if (nx < 0) nx = GRID - 1;
    if (nx >= GRID) nx = 0;
    if (ny < 0) ny = GRID - 1;
    if (ny >= GRID) ny = 0;

    var eating = food && nx === food.x && ny === food.y;
    var body = eating ? snake : snake.slice(0, snake.length - 1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === nx && body[i].y === ny) return gameOver();
    }

    snake.unshift({ x: nx, y: ny });
    if (eating) {
      score++;
      scoreEl.textContent = score;
      placeFood();
    } else {
      snake.pop();
    }
  }

  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    var delta = ts - last;
    last = ts;
    if (!paused) {
      acc += delta;
      var interval = stepInterval();
      while (acc >= interval) {
        acc -= interval;
        tick();
        if (!running) return;
      }
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    reset();
    overlayEl.classList.add("hidden");
    running = true;
    paused = false;
    acc = 0;
    last = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    over = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
    }
    overlayTitle.textContent = "游戏结束";
    overlayText.innerHTML = "本局得分 <strong>" + score + "</strong><br />最高 " + best;
    startBtn.textContent = "再来一局";
    overlayEl.classList.remove("hidden");
    draw();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? "▶" : "⏸";
    if (paused) {
      overlayTitle.textContent = "已暂停";
      overlayText.innerHTML = "按空格或点击继续";
      startBtn.textContent = "继续";
      overlayEl.classList.remove("hidden");
    } else {
      overlayEl.classList.add("hidden");
      last = 0;
    }
  }

  function queueDir(name) {
    var d = DIRS[name];
    if (!d) return;
    var ref = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (isOpposite(d, ref) || (d.x === ref.x && d.y === ref.y)) return;
    if (dirQueue.length < 2) dirQueue.push(d);
  }

  var keyMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
    W: "up", S: "down", A: "left", D: "right",
  };

  document.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (!running && !over) start();
      else togglePause();
      return;
    }
    var name = keyMap[e.key];
    if (!name) return;
    e.preventDefault();
    queueDir(name);
  });

  document.querySelectorAll(".dpad").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!running) start();
      queueDir(btn.dataset.dir);
    });
  });

  startBtn.addEventListener("click", function () {
    if (running && paused) togglePause();
    else start();
  });
  pauseBtn.addEventListener("click", togglePause);
  newBtn.addEventListener("click", start);

  var touchStart = null;
  canvas.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x;
    var dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (!running) start();
    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? "right" : "left");
    else queueDir(dy > 0 ? "down" : "up");
  }, { passive: true });

  window.addEventListener("resize", resize);

  reset();
  resize();
})();
