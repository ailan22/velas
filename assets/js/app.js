// FisioRelax Velas – interacciones de la tienda
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
    a.addEventListener("click", function () { setDrawer(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setDrawer(false); closeLightbox(); closeInstallSheet(); }
  });

  // ----- Collage de la portada: las fotos van rotando de a un marco por vez -----
  var collage = document.getElementById("hero-collage");
  var fotos = collage ? JSON.parse(collage.dataset.fotos || "[]") : [];
  var marcos = collage ? Array.prototype.slice.call(collage.querySelectorAll("figure")) : [];
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fotos.length > marcos.length && !quieto) {
    var siguiente = marcos.length;
    var orden = [1, 0, 2]; // centro, izquierda, derecha
    var paso = 0;
    setInterval(function () {
      if (document.hidden) return;
      var marco = marcos[orden[paso % orden.length] % marcos.length];
      paso++;
      var actual = marco.querySelector("img.on");
      var nueva = actual.nextElementSibling || actual.previousElementSibling;
      var src = fotos[siguiente];
      siguiente = (siguiente + 1) % fotos.length;
      // Se muestra recién cuando terminó de cargar, para que no aparezca un marco vacío
      var img = new Image();
      img.onload = function () {
        nueva.src = src;
        nueva.classList.add("on");
        actual.classList.remove("on");
      };
      img.src = src;
    }, 2600);
  }

  // ----- Aparición al hacer scroll -----
  // Cada grupo aparece escalonado (uno tras otro); sin soporte o con "reducir movimiento" se ve todo directo.
  if ("IntersectionObserver" in window && !quieto) {
    var grupos = [
      ".hero-text > *",
      ".tiles .tile",
      ".block-head",
      ".toolbar",
      ".grid .pcard",
      ".perks li",
      ".gallery .g-item",
      ".contact-card",
      ".foot p"
    ];
    var revelar = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        revelar.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    grupos.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.classList.add("reveal");
        el.style.setProperty("--d", (i % 4) * 90 + "ms");
        revelar.observe(el);
      });
    });
    // Lo que está pegado al final de la página nunca llega a "entrar" del todo
    // (se termina el scroll antes): al llegar abajo se muestra lo que falte.
    function revelarFinal() {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 40) return;
      document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("in");
          revelar.unobserve(el);
        }
      });
    }
    window.addEventListener("scroll", revelarFinal, { passive: true });
    window.addEventListener("resize", revelarFinal);
    revelarFinal();
  }

  // ----- Categorías, buscador y orden del catálogo -----
  var items = Array.prototype.slice.call(document.querySelectorAll("#lista .pcard"));
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var search = document.getElementById("buscar");
  var empty = document.getElementById("sin-resultados");
  var count = document.getElementById("menu-count");
  var activeCat = "todo";

  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    if (search.value) search.value = "";
    chips.forEach(function (c) { c.classList.toggle("on", c.dataset.cat === cat); });
    apply();
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () { filterCategory(c.dataset.cat); });
  });
  // Enlaces que filtran el catálogo (menú, portada, tarjetas de categorías)
  document.querySelectorAll("a[data-cat]").forEach(function (a) {
    a.addEventListener("click", function () { filterCategory(a.dataset.cat); });
  });

  search.addEventListener("input", function () {
    if (search.value && activeCat !== "todo") {
      activeCat = "todo";
      chips.forEach(function (c) { c.classList.toggle("on", c.dataset.cat === "todo"); });
    }
    apply();
  });
  search.addEventListener("keydown", function (e) {
    if (e.key === "Enter") search.blur();
  });
  apply();

  // ----- Menú de arriba: marcar sección visible -----
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  function markNav(id) {
    navLinks.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + id && !a.dataset.cat); });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) markNav(en.target.id === "favoritos" || en.target.id === "galeria" ? "inicio" : en.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["inicio", "favoritos", "catalogo", "galeria", "contacto"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // ----- Visor de fotos -----
  var lightbox = document.getElementById("lightbox");
  var lightImg = lightbox.querySelector("img");
  var lightCap = lightbox.querySelector("figcaption");
  var lightFig = lightbox.querySelector("figure");
  var lightFrom = null;
  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.classList.remove("show");
    document.body.classList.remove("no-scroll");
    setTimeout(function () { lightbox.hidden = true; lightImg.removeAttribute("src"); }, 200);
    if (lightFrom) lightFrom.focus();
  }
  // Galería y fotos de las tarjetas del catálogo
  document.querySelectorAll(".g-item, .pcard-zoom").forEach(function (b) {
    b.addEventListener("click", function () {
      lightFrom = b;
      lightImg.src = b.dataset.full;
      lightImg.alt = b.dataset.caption || "Foto ampliada";
      // Desde una tarjeta del catálogo se muestra como tarjeta: foto, nombre y precio
      var card = b.closest(".pcard");
      lightFig.classList.toggle("pcard", !!card);
      lightCap.textContent = "";
      if (card) {
        lightCap.appendChild(card.querySelector("h3").cloneNode(true));
        lightCap.appendChild(card.querySelector(".price").cloneNode(true));
      } else {
        lightCap.textContent = b.dataset.caption || "";
      }
      lightCap.hidden = !card && !b.dataset.caption;
      lightbox.hidden = false;
      document.body.classList.add("no-scroll");
      requestAnimationFrame(function () { lightbox.classList.add("show"); });
      lightbox.querySelector(".icon-btn").focus();
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
  var icoBasura = document.getElementById("ico-basura").innerHTML;
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

  function add(nombre, op, n) {
    var line = cart.filter(function (l) { return l.nombre === nombre && l.porcion === op.porcion; })[0];
    if (line) line.cant += n;
    else cart.push({ nombre: nombre, porcion: op.porcion, precio: price(op.precio), cant: n });
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
        '<b class="cl-price">' + (l.precio === null ? "Consultar" : money(l.precio * l.cant)) + "</b>" +
        '<button type="button" class="cl-del" data-i="' + i + '" data-del aria-label="Eliminar del pedido">' + icoBasura + "</button>";
      li.querySelector("strong").textContent = l.nombre;
      li.querySelector("small").textContent = l.porcion;
      list.appendChild(li);
    });
  }

  list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (!b) return;
    var l = cart[+b.dataset.i];
    if (b.hasAttribute("data-del")) l.cant = 0;
    else l.cant += +b.dataset.d;
    if (l.cant <= 0) cart.splice(+b.dataset.i, 1);
    save();
    render();
  });

  // Cada tarjeta: contador de cantidad y "Agregar" (si hay varias opciones, se elige una primero)
  document.querySelectorAll(".pcard").forEach(function (it) {
    var nombre = it.dataset.titulo;
    var opciones = JSON.parse(it.dataset.opciones || "[]");
    var qtyEl = it.querySelector("[data-qty] span");
    var qty = 1;
    function setQty(n) { qty = Math.max(1, Math.min(99, n)); qtyEl.textContent = qty; }

    it.querySelector("[data-qty]").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-d]");
      if (b) setQty(qty + +b.dataset.d);
    });
    it.querySelector(".add").addEventListener("click", function () {
      var n = qty;
      if (opciones.length === 1) { add(nombre, opciones[0], n); setQty(1); return; }
      document.getElementById("option-title").textContent = nombre;
      var box = document.getElementById("option-list");
      box.textContent = "";
      opciones.forEach(function (op) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "option";
        b.innerHTML = "<span></span><strong></strong>";
        b.querySelector("span").textContent = (n > 1 ? n + " × " : "") + op.porcion;
        b.querySelector("strong").textContent = price(op.precio) === null ? "Consultar" : money(price(op.precio) * n);
        b.addEventListener("click", function () { optionSheet.hidden = true; add(nombre, op, n); setQty(1); });
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
