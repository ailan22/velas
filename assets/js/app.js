// FisioRelax Velas – interacciones de la portada estilo app
(function () {
  "use strict";

  // ----- Menú lateral -----
  var drawer = document.getElementById("drawer");
  var backdrop = document.getElementById("drawer-backdrop");
  var openBtn = document.getElementById("menu-open");

  function setDrawer(open) {
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    openBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) {
      backdrop.hidden = false;
      requestAnimationFrame(function () { backdrop.classList.add("show"); });
    } else {
      backdrop.classList.remove("show");
      setTimeout(function () { backdrop.hidden = true; }, 250);
    }
  }
  openBtn.addEventListener("click", function () { setDrawer(true); });
  document.getElementById("menu-close").addEventListener("click", function () { setDrawer(false); });
  backdrop.addEventListener("click", function () { setDrawer(false); });
  drawer.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      if (a.dataset.cat) filterCategory(a.dataset.cat);
      setDrawer(false);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setDrawer(false); closeLightbox(); closeInstallSheet(); }
  });

  // ----- Carrusel -----
  var track = document.getElementById("hero-track");
  var dots = Array.prototype.slice.call(document.querySelectorAll("#hero-dots button"));
  var current = 0;
  var timer;

  function goTo(i) {
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }
  function restart() {
    clearInterval(timer);
    if (dots.length > 1) {
      timer = setInterval(function () { goTo((current + 1) % dots.length); }, 5000);
    }
  }
  track.addEventListener("scroll", function () {
    var i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== current && dots[i]) {
      dots[current].classList.remove("on");
      dots[i].classList.add("on");
      current = i;
    }
  }, { passive: true });
  track.addEventListener("pointerdown", restart);
  dots.forEach(function (d, i) {
    d.addEventListener("click", function () { goTo(i); restart(); });
  });
  restart();

  // ----- Categorías y buscador -----
  var items = Array.prototype.slice.call(document.querySelectorAll("#lista .item"));
  var cats = Array.prototype.slice.call(document.querySelectorAll(".cat"));
  var search = document.getElementById("buscar");
  var empty = document.getElementById("sin-resultados");
  var count = document.getElementById("menu-count");
  var activeCat = "todo";

  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  items.forEach(function (it) { it.dataset.key = normalize(it.dataset.nombre); });

  function apply() {
    var q = normalize(search.value.trim());
    var shown = 0;
    items.forEach(function (it) {
      var ok = (activeCat === "todo" || it.dataset.cat === activeCat) &&
               (!q || it.dataset.key.indexOf(q) !== -1);
      it.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
    count.textContent = shown + (shown === 1 ? " producto" : " productos");
  }

  // Orden: "" = el del catálogo, "az" / "za" = alfabético
  var lista = document.getElementById("lista");
  var sort = document.getElementById("ordenar");
  var original = items.slice();
  sort.addEventListener("change", function () {
    var sorted = original.slice();
    if (sort.value) {
      var dir = sort.value === "za" ? -1 : 1;
      sorted.sort(function (a, b) {
        return dir * a.dataset.nombre.localeCompare(b.dataset.nombre, "es", { sensitivity: "base" });
      });
    }
    sorted.forEach(function (it) { lista.appendChild(it); });
  });

  function filterCategory(cat) {
    activeCat = cat;
    cats.forEach(function (c) { c.classList.toggle("on", c.dataset.cat === cat); });
    apply();
  }

  cats.forEach(function (c) {
    c.addEventListener("click", function () {
      filterCategory(c.dataset.cat);
      document.getElementById("menu").scrollIntoView();
    });
  });

  search.addEventListener("input", function () {
    if (search.value && activeCat !== "todo") filterCategory("todo");
    else apply();
  });
  search.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      search.blur();
      document.getElementById("menu").scrollIntoView();
    }
  });
  apply();

  // ----- Barra inferior: marcar sección visible -----
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabbar a[href^='#']"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id === "destacados" ? "inicio" : en.target.id;
        tabs.forEach(function (t) { t.classList.toggle("on", t.getAttribute("href") === "#" + id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["destacados", "menu", "galeria", "contacto"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // ----- Visor de fotos -----
  var lightbox = document.getElementById("lightbox");
  var lightImg = lightbox.querySelector("img");
  function closeLightbox() { lightbox.hidden = true; lightImg.removeAttribute("src"); }
  document.querySelectorAll(".g-item").forEach(function (b) {
    b.addEventListener("click", function () {
      lightImg.src = b.dataset.full;
      lightbox.hidden = false;
    });
  });
  lightbox.addEventListener("click", closeLightbox);

  // ----- Instalar app (solo en celulares) -----
  var banner = document.getElementById("install");
  var installBtns = Array.prototype.slice.call(document.querySelectorAll("[data-install]"));
  var installSheet = document.getElementById("install-sheet");
  var drawerInstall = drawer.querySelector("[data-install]");
  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isMobile = isIOS || /Android|Mobi/i.test(ua);
  var installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  var deferredPrompt = null;
  var DISMISS_KEY = "fr-install-cerrado";

  function bannerDismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { return false; }
  }
  function showInstall() {
    drawerInstall.hidden = false;
    if (!bannerDismissed()) banner.hidden = false;
  }
  function hideInstall() {
    banner.hidden = true;
    drawerInstall.hidden = true;
  }
  function closeInstallSheet() { installSheet.hidden = true; }
  // Pasos para instalar a mano, según el celular
  function openInstallSheet() {
    installSheet.querySelectorAll("[data-os]").forEach(function (ol) {
      ol.hidden = ol.dataset.os !== (isIOS ? "ios" : "android");
    });
    installSheet.hidden = false;
  }

  if (isMobile && !installed) {
    // Android (Chrome, Edge, Samsung): el navegador avisa que se puede instalar
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showInstall();
    });
    // iPhone / iPad: no hay aviso automático, mostramos instrucciones
    if (isIOS) showInstall();
  }
  window.addEventListener("appinstalled", function () {
    hideInstall();
  });

  installBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      setDrawer(false);
      // El aviso del navegador se puede usar una sola vez; después, pasos a mano
      if (!deferredPrompt) { openInstallSheet(); return; }
      var prompt = deferredPrompt;
      deferredPrompt = null;
      try {
        prompt.prompt();
        prompt.userChoice.then(function (r) {
          if (r.outcome === "accepted") hideInstall();
        }, openInstallSheet);
      } catch (e) {
        openInstallSheet();
      }
    });
  });
  document.getElementById("install-x").addEventListener("click", function () {
    banner.hidden = true;
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
  });
  document.getElementById("install-ok").addEventListener("click", closeInstallSheet);
  installSheet.addEventListener("click", function (e) { if (e.target === installSheet) closeInstallSheet(); });
})();

// ----- Carrito: se arma el pedido y se envía por WhatsApp o mail (sin pago online) -----
(function () {
  "use strict";

  var tienda = JSON.parse(document.getElementById("tienda").textContent);
  var KEY = "fr-carrito";
  var cart = load();

  var cartSheet = document.getElementById("cart");
  var optionSheet = document.getElementById("option-sheet");
  var list = document.getElementById("cart-list");
  var countEl = document.getElementById("cart-count");
  var totalEl = document.getElementById("cart-total");
  var form = document.getElementById("cart-form");
  var errorEl = document.getElementById("cart-error");
  var toast = document.getElementById("toast");
  var toastTimer;

  // Cada línea: { nombre, porcion, precio (número o null), cant }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function money(n) { return "$" + n.toLocaleString("es-UY"); }
  function price(p) { var n = parseFloat(p); return isNaN(n) ? null : n; }

  function add(nombre, op) {
    var line = cart.filter(function (l) { return l.nombre === nombre && l.porcion === op.porcion; })[0];
    if (line) line.cant++;
    else cart.push({ nombre: nombre, porcion: op.porcion, precio: price(op.precio), cant: 1 });
    save();
    render();
    showToast("Agregado al pedido ✓  Ver");
  }

  function showToast(text) {
    toast.textContent = text;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.hidden = true; }, 250);
    }, 1800);
  }

  function totals() {
    var units = 0, sum = 0, pending = false;
    cart.forEach(function (l) {
      units += l.cant;
      if (l.precio === null) pending = true;
      else sum += l.precio * l.cant;
    });
    return { units: units, sum: sum, pending: pending };
  }

  // "$1.200", "$1.200 + a consultar" o "A consultar" si ningún producto tiene precio
  function totalText(t) {
    if (!t.pending) return money(t.sum);
    return t.sum ? money(t.sum) + " + a consultar" : "A consultar";
  }

  function render() {
    var t = totals();
    countEl.textContent = t.units;
    countEl.hidden = t.units === 0;
    document.getElementById("cart-empty").hidden = cart.length > 0;
    document.getElementById("cart-full").hidden = cart.length === 0;
    document.getElementById("cart-note").hidden = !t.pending;
    totalEl.textContent = totalText(t);

    list.textContent = "";
    cart.forEach(function (l, i) {
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="cl-info"><strong></strong><small></small></div>' +
        '<div class="qty">' +
          '<button type="button" data-i="' + i + '" data-d="-1" aria-label="Quitar uno">−</button>' +
          "<span>" + l.cant + "</span>" +
          '<button type="button" data-i="' + i + '" data-d="1" aria-label="Agregar uno">+</button>' +
        "</div>" +
        '<b class="cl-price">' + (l.precio === null ? "Consultar" : money(l.precio * l.cant)) + "</b>";
      li.querySelector("strong").textContent = l.nombre;
      li.querySelector("small").textContent = l.porcion;
      list.appendChild(li);
    });
  }

  list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (!b) return;
    var l = cart[+b.dataset.i];
    l.cant += +b.dataset.d;
    if (l.cant <= 0) cart.splice(+b.dataset.i, 1);
    save();
    render();
  });

  // Botón "+" de cada producto: si tiene varias opciones, se elige una primero
  document.querySelectorAll("#lista .item").forEach(function (it) {
    var nombre = it.dataset.titulo;
    var opciones = JSON.parse(it.dataset.opciones || "[]");
    it.querySelector(".add").addEventListener("click", function () {
      if (opciones.length === 1) { add(nombre, opciones[0]); return; }
      document.getElementById("option-title").textContent = nombre;
      var box = document.getElementById("option-list");
      box.textContent = "";
      opciones.forEach(function (op) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "option";
        b.innerHTML = "<span></span><strong></strong>";
        b.querySelector("span").textContent = op.porcion;
        b.querySelector("strong").textContent = price(op.precio) === null ? "Consultar" : money(price(op.precio));
        b.addEventListener("click", function () { optionSheet.hidden = true; add(nombre, op); });
        box.appendChild(b);
      });
      optionSheet.hidden = false;
    });
  });

  function openCart() { render(); cartSheet.hidden = false; document.body.classList.add("no-scroll"); }
  function closeCart() { cartSheet.hidden = true; document.body.classList.remove("no-scroll"); }
  document.getElementById("cart-open").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  [cartSheet, optionSheet].forEach(function (sheet) {
    sheet.addEventListener("click", function (e) {
      if (e.target !== sheet) return;
      if (sheet === cartSheet) closeCart(); else sheet.hidden = true;
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeCart(); optionSheet.hidden = true; }
  });
  toast.addEventListener("click", openCart);

  // La dirección solo se pide si es con envío
  var dirField = form.querySelector("[data-envio]");
  form.addEventListener("change", function () {
    dirField.hidden = form.entrega.value !== "Envío";
  });

  // Texto del pedido (el mismo para WhatsApp y mail)
  function message() {
    var t = totals();
    var lines = ["¡Hola " + tienda.marca + "! Quiero hacer este pedido:", ""];
    cart.forEach(function (l) {
      lines.push("• " + l.cant + " x " + l.nombre + ", " + l.porcion +
        (l.precio === null ? " — a consultar" : " — " + money(l.precio * l.cant)));
    });
    lines.push("", "Total: " + totalText(t));
    lines.push("", "Nombre: " + form.nombre.value.trim());
    lines.push("Entrega: " + form.entrega.value);
    if (form.entrega.value === "Envío" && form.direccion.value.trim()) lines.push("Dirección: " + form.direccion.value.trim());
    if (form.notas.value.trim()) lines.push("Notas: " + form.notas.value.trim());
    return lines.join("\n");
  }

  function ready() {
    var ok = form.nombre.value.trim() !== "";
    errorEl.hidden = ok;
    if (!ok) form.nombre.focus();
    return ok;
  }

  document.getElementById("send-wa").addEventListener("click", function () {
    if (!ready()) return;
    window.open("https://wa.me/" + tienda.whatsapp + "?text=" + encodeURIComponent(message()), "_blank", "noopener");
  });
  var mailBtn = document.getElementById("send-mail");
  if (mailBtn) {
    mailBtn.addEventListener("click", function () {
      if (!ready()) return;
      location.href = "mailto:" + tienda.email +
        "?subject=" + encodeURIComponent("Pedido de " + form.nombre.value.trim()) +
        "&body=" + encodeURIComponent(message());
    });
  }

  document.getElementById("cart-clear").addEventListener("click", function () {
    cart = [];
    save();
    render();
  });

  render();
})();
