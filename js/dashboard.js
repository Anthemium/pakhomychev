(function () {
  var board = document.getElementById("board");
  if (!board || !window.SalesBoard) return;

  var period = "year";
  var segment = "all";
  var stageId = "interest";

  function mln(thousand) {
    return (thousand / 1000).toLocaleString("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + "\u00a0млн\u00a0₽";
  }

  function pct(ratio) {
    return (ratio * 100).toLocaleString("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + "%";
  }

  function dealsLabel(count) {
    var n10 = count % 10;
    var n100 = count % 100;
    var word = "сделок";
    if (n10 === 1 && n100 !== 11) word = "сделка";
    else if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) word = "сделки";
    return count.toLocaleString("ru-RU") + " " + word;
  }

  function delta(fact, plan) {
    if (!plan) return "";
    var value = (fact / plan - 1) * 100;
    var sign = value > 0 ? "+" : "";
    return sign + value.toLocaleString("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + "% к плану";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function kpi(caption, value, note) {
    var card = el("article", "kpi");
    card.appendChild(el("span", "kpi-label", caption));
    card.appendChild(el("b", null, value));
    if (note) card.appendChild(el("i", "kpi-delta", note));
    return card;
  }

  function renderKpis(model) {
    var host = document.getElementById("board-kpi");
    var k = model.kpis;
    host.replaceChildren(
      kpi("План", mln(k.plan)),
      kpi("Факт", mln(k.fact), delta(k.fact, k.plan)),
      kpi("Выполнение", pct(k.attainment)),
      kpi("Покрытие квоты", k.coverage.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "×"),
      kpi("Доля выигрыша", pct(k.winRate)),
      kpi("Средний чек", mln(k.avgCheck)),
      kpi("Прогноз commit", mln(k.commit), delta(k.commit, k.plan)),
      kpi("Наиболее вероятный", mln(k.likely), delta(k.likely, k.plan)),
      kpi("Upside", mln(k.upside), delta(k.upside, k.plan)),
      kpi("Длина цикла", Math.round(k.cycle).toLocaleString("ru-RU") + "\u00a0дн."),
      kpi("Маржа", pct(k.margin))
    );
  }

  function renderFunnel(model) {
    var host = document.getElementById("board-funnel");
    host.replaceChildren();
    var max = model.funnel[0] ? model.funnel[0].amount : 1;
    model.funnel.forEach(function (stage) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "funnel-row" + (stage.id === stageId ? " is-on" : "");
      button.setAttribute("data-stage", stage.id);
      var name = el("span", "funnel-name", stage.name);
      var track = el("span", "funnel-track");
      var bar = el("span", "funnel-bar");
      bar.style.width = Math.max(8, (stage.amount / max) * 100) + "%";
      track.appendChild(bar);
      var meta = el("span", "funnel-meta");
      var conv = stage.id === "won" ? "" : " · " + pct(stage.conv);
      meta.textContent = stage.count.toLocaleString("ru-RU") + " · " + mln(stage.amount) + conv;
      button.append(name, track, meta);
      host.appendChild(button);
    });
    renderStage(model);
  }

  function renderStage(model) {
    var host = document.getElementById("board-stage");
    var stage = model.funnel.filter(function (item) { return item.id === stageId; })[0] || model.funnel[0];
    host.replaceChildren();
    if (!stage) return;
    var title = el("p", "stage-title", stage.name);
    var summary = el("p", "stage-summary");
    var extra = stage.id === "won"
      ? "Закрытые победы периода."
      : "На этапе сейчас " + dealsLabel(stage.sitting) + ", " + mln(stage.sittingAmount) + ". Отсев до следующего этапа — " + dealsLabel(stage.drop) + ".";
    summary.textContent = "Прошли этап: " + dealsLabel(stage.count) + ", " + mln(stage.amount) + ". " + extra;
    host.append(title, summary);
    var list = el("div", "stage-split");
    stage.segments.forEach(function (row) {
      list.appendChild(el("span", null, row.name + " · " + mln(row.amount)));
    });
    stage.sellers.slice(0, 4).forEach(function (row) {
      list.appendChild(el("span", null, row.name + " · " + mln(row.amount)));
    });
    host.appendChild(list);
  }

  function renderChart(model) {
    var host = document.getElementById("board-chart");
    var series = model.series;
    var max = 1;
    series.forEach(function (item) {
      max = Math.max(max, item.plan, item.fact, item.forecast);
    });
    var width = 640;
    var height = 210;
    var padL = 8;
    var padB = 28;
    var group = (width - padL * 2) / series.length;
    var bar = Math.min(16, group / 5);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "План, факт и наиболее вероятный прогноз");
    series.forEach(function (item, index) {
      var x = padL + index * group + group / 2;
      [
        { value: item.plan, dx: -bar - 2, fill: "#b9c0ca" },
        { value: item.fact, dx: -bar / 2, fill: "#0c3a77" },
        { value: item.forecast, dx: bar / 2 + 2, fill: "#0c3a77", opacity: "0.4" }
      ].forEach(function (col) {
        var h = (col.value / max) * (height - padB - 12);
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(x + col.dx));
        rect.setAttribute("y", String(height - padB - h));
        rect.setAttribute("width", String(bar));
        rect.setAttribute("height", String(Math.max(h, 0)));
        rect.setAttribute("rx", "4");
        rect.setAttribute("fill", col.fill);
        if (col.opacity) rect.setAttribute("fill-opacity", col.opacity);
        svg.appendChild(rect);
      });
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(height - 8));
      text.setAttribute("text-anchor", "middle");
      text.textContent = item.label;
      svg.appendChild(text);
    });
    host.replaceChildren(svg);
  }

  function barList(rows, total) {
    var wrap = el("div", "bar-list");
    rows.forEach(function (row) {
      var line = el("div", "bar-line");
      var top = el("div", "bar-top");
      top.append(el("span", null, row.name), el("b", null, mln(row.amount)));
      var track = el("div", "bar-track");
      var fill = el("span");
      fill.style.width = row.amount > 0 ? Math.max(6, (row.amount / total) * 100) + "%" : "0";
      track.appendChild(fill);
      line.append(top, track);
      wrap.appendChild(line);
    });
    return wrap;
  }

  function renderAge(model) {
    var host = document.getElementById("board-age");
    var age = model.age;
    var share = age.open ? age.stalled / age.open : 0;
    host.replaceChildren(el("p", "board-note", "Застрявшие — " + pct(share) + " открытого пайплайна."));
    host.appendChild(barList([
      { name: "Свежие · " + age.freshCount, amount: age.fresh },
      { name: "В работе · " + age.workingCount, amount: age.working },
      { name: "Застрявшие · " + age.stalledCount, amount: age.stalled }
    ], Math.max(age.fresh, age.working, age.stalled, 1)));
  }

  function renderReasons(model) {
    var host = document.getElementById("board-reasons");
    host.replaceChildren();
    var grid = el("div", "reason-grid");
    ["win", "loss"].forEach(function (key) {
      var block = el("div");
      block.appendChild(el("p", "reason-title", key === "win" ? "Победы" : "Отказы"));
      var rows = model.reasons[key];
      var total = rows.reduce(function (acc, row) { return Math.max(acc, row.amount); }, 1);
      block.appendChild(barList(rows, total));
      grid.appendChild(block);
    });
    host.appendChild(grid);
  }

  function renderSellers(model) {
    var host = document.getElementById("board-sellers");
    var table = document.createElement("table");
    table.className = "seller-sheet";
    var head = document.createElement("tr");
    ["Продавец", "План", "Факт", "Открытый пайплайн", "Застрявшие"].forEach(function (label) {
      head.appendChild(el("th", null, label));
    });
    table.appendChild(head);
    model.sellers.forEach(function (seller) {
      var row = document.createElement("tr");
      [seller.name, mln(seller.plan), mln(seller.fact), mln(seller.open), String(seller.stuck)].forEach(function (value) {
        row.appendChild(el("td", null, value));
      });
      table.appendChild(row);
    });
    host.replaceChildren(table);
  }

  function renderLeading(model) {
    var host = document.getElementById("board-leading");
    var lead = model.leading;
    host.replaceChildren(
      kpi("Встречи со следующим шагом", String(lead.meetings)),
      kpi("Предложения у заказчика", String(lead.proposals)),
      kpi("Карточки без движения", String(lead.stale))
    );
  }

  function renderMargin(model) {
    var host = document.getElementById("board-margin");
    host.replaceChildren();
    model.marginRows.forEach(function (row) {
      var line = el("div", "margin-row");
      line.appendChild(el("span", "margin-name", row.name));
      var bars = el("div", "margin-bars");
      [
        { label: "Скидка " + pct(row.discount), width: row.discount, klass: "is-discount" },
        { label: "Маржа " + pct(row.margin), width: row.margin, klass: "is-margin" }
      ].forEach(function (item) {
        var track = el("div", "bar-track");
        var fill = el("span", item.klass);
        fill.style.width = Math.max(4, item.width * 100) + "%";
        track.appendChild(fill);
        var pair = el("div", "margin-pair");
        pair.append(el("span", null, item.label), track);
        bars.appendChild(pair);
      });
      line.appendChild(bars);
      host.appendChild(line);
    });
  }

  function paint() {
    var model = window.SalesBoard.view(period, segment);
    document.getElementById("board-caption").textContent = model.caption;
    board.querySelectorAll("[data-period]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-period") === period ? "true" : "false");
    });
    board.querySelectorAll("[data-segment]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-segment") === segment ? "true" : "false");
    });
    renderKpis(model);
    renderFunnel(model);
    renderChart(model);
    renderAge(model);
    renderReasons(model);
    renderSellers(model);
    renderLeading(model);
    renderMargin(model);
  }

  board.addEventListener("click", function (event) {
    var periodButton = event.target.closest("[data-period]");
    var segmentButton = event.target.closest("[data-segment]");
    var stageButton = event.target.closest("[data-stage]");
    if (periodButton) period = periodButton.getAttribute("data-period");
    if (segmentButton) segment = segmentButton.getAttribute("data-segment");
    if (stageButton) stageId = stageButton.getAttribute("data-stage");
    if (periodButton || segmentButton || stageButton) paint();
  });

  paint();
})();
